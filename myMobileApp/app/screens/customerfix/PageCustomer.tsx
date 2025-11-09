import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../hooks/supabaseClient";

const { width } = Dimensions.get("window");

interface UserData {
  id: string;
  nim: string;
  nama: string;
  nomor_telepon: string | null;
}

interface ActiveOrder {
  id: number;
  type: "ride" | "food" | "send";
  asal: string;
  tujuan: string;
  harga: number;
  status: string;
  driver_nama?: string;
  driver_id?: string;
  timestamp: string;
}

interface OrderFormData {
  // ScootRide
  lokasi_jemput: string;
  lokasi_tujuan: string;
  tarif: string;
  
  // ScootFood
  lokasi_resto: string;
  detail_pesanan: string;
  ongkir: string;
  
  // ScootSend
  lokasi_jemput_barang: string;
  nama_penerima: string;
  berat: string;
  nama_barang: string;
}

const PageCustomer: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const paramUserId = params?.userId as string | undefined;
  const paramNama = params?.nama as string | undefined;

  // profile image preview state (UI only)
  const profileImageParam = (params as any)?.profileImageUrl as string | undefined;
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(
    profileImageParam ?? null
  );
  const [showPreview, setShowPreview] = useState<boolean>(false);
  // --- images for cards (ensure these assets exist in your project)
  const scootRideImage = require("../../../assets/images/ScootRide.png");
  const scootFoodImage = require("../../../assets/images/ScootFood.png");
  const scootSendImage = require("../../../assets/images/ScootSend.png");

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("Home");
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Modal states
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<"ride" | "food" | "send" | null>(null);
  const [formData, setFormData] = useState<OrderFormData>({
    // ScootRide
    lokasi_jemput: "",
    lokasi_tujuan: "",
    tarif: "",
    
    // ScootFood
    lokasi_resto: "",
    detail_pesanan: "",
    ongkir: "",
    
    // ScootSend
    lokasi_jemput_barang: "",
    nama_penerima: "",
    berat: "",
    nama_barang: "",
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (paramUserId) {
      setUserData({
        id: paramUserId,
        nim: "",
        nama: paramNama || "Customer",
        nomor_telepon: null,
      });
      setLoading(false);
      return;
    }

    let subscription: any;

    const tryGetSessionWithRetry = async (maxMs = 3000) => {
      const start = Date.now();
      while (Date.now() - start < maxMs) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user?.id) return data.session;
        } catch (e) {
          // ignore and retry
        }
        await new Promise((r) => setTimeout(r, 250));
      }
      return null;
    };

    const init = async () => {
      setLoading(true);

      // 1) Try quick session restore from supabase
      const sessionNow = await tryGetSessionWithRetry(1200);
      if (sessionNow?.user?.id) {
        await loadUserData(sessionNow.user.id);
        return;
      }

      // 2) Try restore from local AsyncStorage (fallback when auth state not ready)
      try {
        const stored = await AsyncStorage.getItem("userSession");
        if (stored) {
          const parsed = JSON.parse(stored);
          const uid = parsed?.params?.userId || parsed?.params?.user_id || parsed?.params?.id;
          if (uid) {
            await loadUserData(uid);
            return;
          }
        }
      } catch (e) {
        console.warn("Error reading AsyncStorage userSession:", e);
      }

      // 3) Listen to auth changes and handle INITIAL_SESSION gracefully
      const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("🔐 Auth state changed:", event, session?.user?.id);
        if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user?.id) {
          await loadUserData(session.user.id);
          return;
        }

        if (event === "INITIAL_SESSION") {
          // INITIAL_SESSION may arrive with undefined session in some envs.
          // Try again to get session and fallback to AsyncStorage if needed.
          const s = await tryGetSessionWithRetry(2000);
          if (s?.user?.id) {
            await loadUserData(s.user.id);
            return;
          }
          try {
            const stored2 = await AsyncStorage.getItem("userSession");
            if (stored2) {
              const parsed2 = JSON.parse(stored2);
              const uid2 = parsed2?.params?.userId || parsed2?.params?.id;
              if (uid2) {
                await loadUserData(uid2);
                return;
              }
            }
          } catch (e) {
            /* ignore */
          }
          // If still nothing, mark loading false to allow UI to render
          setLoading(false);
        }

        if (event === "SIGNED_OUT") {
          setUserData(null);
          setActiveOrders([]);
          setLoading(false);
          try {
            await AsyncStorage.multiRemove(["userSession", "nim", "role"]);
          } catch (e) { /* ignore */ }
          router.replace("/screens/Login");
        }
      });

      // store subscription for cleanup
      subscription = listener?.subscription ?? listener;
      // if no event fired in a short time, stop loading so UI isn't stuck
      setTimeout(() => {
        if (!userData?.id) setLoading(false);
      }, 1500);
    };

    init();

    return () => {
      try {
        subscription?.unsubscribe?.();
      } catch (e) {
        // ignore
      }
    };
  }, [paramUserId, paramNama]);

  useEffect(() => {
    if (userData?.id) {
      loadActiveOrders();
      const interval = setInterval(() => {
        loadActiveOrders();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [userData?.id]);

  const loadUserData = async (userId: string) => {
    try {
      console.log("📝 Loading user data for:", userId);

      const { data: customerData, error } = await supabase
        .from("customer")
        .select("id, nim, nama, nomor_telepon")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      if (customerData) {
        setUserData(customerData);
        console.log("✅ Data customer berhasil dimuat:", customerData.nama);
      } else {
        console.log("⚠️ Data customer tidak ditemukan di database");
        Alert.alert("Error", "Data customer tidak ditemukan");
        router.replace("/screens/Login");
      }
    } catch (error) {
      console.error("❌ Error loading user data:", error);
      Alert.alert("Error", "Gagal memuat data pengguna");
    } finally {
      setLoading(false);
    }
  };

  const loadActiveOrders = async () => {
    if (!userData?.id) return;

    try {
      setLoadingOrders(true);
      const orders: ActiveOrder[] = [];

      // Load ScootRide orders
      const { data: rideOrders, error: rideError } = await supabase
        .from("scoot_ride")
        .select("id_scoot_ride, lokasi_jemput, lokasi_tujuan, tarif, timestamp, id_driver, status")
        .eq("id_customer", userData.id)
        .in("status", ["pending", "menunggu_driver", "sedang_diantar"]);

      if (rideError) {
        console.error("❌ Error loading ride orders:", rideError);
      } else if (rideOrders && rideOrders.length > 0) {
        const driverIds = rideOrders
          .filter(o => o.id_driver)
          .map(o => o.id_driver);

        let driverMap: Record<string, string> = {};
        if (driverIds.length > 0) {
          const { data: drivers } = await supabase
            .from("driver")
            .select("id, nama")
            .in("id", driverIds);

          if (drivers) {
            driverMap = drivers.reduce((acc, d) => {
              acc[d.id] = d.nama;
              return acc;
            }, {} as Record<string, string>);
          }
        }

        orders.push(
          ...rideOrders.map((order) => ({
            id: order.id_scoot_ride,
            type: "ride" as const,
            asal: order.lokasi_jemput || "-",
            tujuan: order.lokasi_tujuan || "-",
            harga: order.tarif || 0,
            status: 
              order.status === "pending" ? "Menunggu Konfirmasi" :
              order.status === "menunggu_driver" ? "Mencari Driver" : 
              "Dalam Perjalanan",
            driver_nama: order.id_driver ? driverMap[order.id_driver] : undefined,
            driver_id: order.id_driver,
            timestamp: order.timestamp || new Date().toISOString(),
          }))
        );
      }

      // Load ScootFood orders
      const { data: foodOrders, error: foodError } = await supabase
        .from("scoot_food")
        .select("id_scoot_food, lokasi_resto, lokasi_tujuan, detail_pesanan, ongkir, timestamp, status, id_driver")
        .eq("id_customer", userData.id)
        .in("status", ["pending", "menunggu_driver", "sedang_disiapkan", "sedang_diantar"]);

      if (foodError) {
        console.error("❌ Error loading food orders:", foodError);
      } else if (foodOrders && foodOrders.length > 0) {
        const driverIds = foodOrders
          .filter(o => o.id_driver)
          .map(o => o.id_driver);

        let driverMap: Record<string, string> = {};
        if (driverIds.length > 0) {
          const { data: drivers } = await supabase
            .from("driver")
            .select("id, nama")
            .in("id", driverIds);

          if (drivers) {
            driverMap = drivers.reduce((acc, d) => {
              acc[d.id] = d.nama;
              return acc;
            }, {} as Record<string, string>);
          }
        }

        orders.push(
          ...foodOrders.map((order) => ({
            id: order.id_scoot_food,
            type: "food" as const,
            asal: order.lokasi_resto || "-",
            tujuan: order.lokasi_tujuan || "-",
            harga: order.ongkir || 0,
            status: 
              order.status === "pending" ? "Menunggu Konfirmasi" :
              order.status === "sedang_disiapkan" ? "Sedang Disiapkan" :
              order.status === "menunggu_driver" ? "Mencari Driver" : 
              "Dalam Perjalanan",
            driver_nama: order.id_driver ? driverMap[order.id_driver] : undefined,
            driver_id: order.id_driver,
            timestamp: order.timestamp || new Date().toISOString(),
          }))
        );
      }

      // Load ScootSend orders
      const { data: sendOrders, error: sendError } = await supabase
        .from("scoot_send")
        .select("id_scoot_send, lokasi_jemput_barang, nama_penerima, nama_barang, lokasi_tujuan, tarif, timestamp, status, id_driver")
        .eq("id_customer", userData.id)
        .in("status", ["pending", "menunggu_driver", "sedang_diantar"]);

      if (sendError) {
        console.error("❌ Error loading send orders:", sendError);
      } else if (sendOrders && sendOrders.length > 0) {
        const driverIds = sendOrders
          .filter(o => o.id_driver)
          .map(o => o.id_driver);

        let driverMap: Record<string, string> = {};
        if (driverIds.length > 0) {
          const { data: drivers } = await supabase
            .from("driver")
            .select("id, nama")
            .in("id", driverIds);

          if (drivers) {
            driverMap = drivers.reduce((acc, d) => {
              acc[d.id] = d.nama;
              return acc;
            }, {} as Record<string, string>);
          }
        }

        orders.push(
          ...sendOrders.map((order) => ({
            id: order.id_scoot_send,
            type: "send" as const,
            asal: order.lokasi_jemput_barang || "-",
            tujuan: order.lokasi_tujuan || "-",
            harga: order.tarif || 0,
            status: 
              order.status === "pending" ? "Menunggu Konfirmasi" :
              order.status === "menunggu_driver" ? "Mencari Driver" : 
              "Dalam Perjalanan",
            driver_nama: order.id_driver ? driverMap[order.id_driver] : undefined,
            driver_id: order.id_driver,
            timestamp: order.timestamp || new Date().toISOString(),
          }))
        );
      }

      orders.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      console.log(`✅ Loaded ${orders.length} active orders`);
      setActiveOrders(orders);
    } catch (error) {
      console.error("❌ Error loading active orders:", error);
    } finally {
      setLoadingOrders(false);
      setRefreshing(false);
    }
  };

  // helper: reset form to initial empty values
  const resetForm = () => {
    setFormData({
      // ScootRide
      lokasi_jemput: "",
      lokasi_tujuan: "",
      tarif: "",
      
      // ScootFood
      lokasi_resto: "",
      detail_pesanan: "",
      ongkir: "",
      
      // ScootSend
      lokasi_jemput_barang: "",
      nama_penerima: "",
      berat: "",
      nama_barang: "",
    });
  };

  const handleOpenServiceModal = (type: "ride" | "food" | "send") => {
    setModalType(type);
    resetForm();
    setShowModal(true);
  };

  // Submit handler dengan validasi sesuai skema database
  const handleSubmitOrder = async () => {
    if (!userData?.id || !modalType) return;

    // Validasi berdasarkan tipe layanan
    if (modalType === "ride") {
      if (!formData.lokasi_jemput?.trim()) {
        Alert.alert("Error", "Lokasi jemput harus diisi");
        return;
      }
      if (!formData.lokasi_tujuan?.trim()) {
        Alert.alert("Error", "Lokasi tujuan harus diisi");
        return;
      }
      if (!formData.tarif?.trim()) {
        Alert.alert("Error", "Tarif harus diisi");
        return;
      }
    } else if (modalType === "food") {
      if (!formData.lokasi_resto?.trim()) {
        Alert.alert("Error", "Lokasi restoran harus diisi");
        return;
      }
      if (!formData.lokasi_tujuan?.trim()) {
        Alert.alert("Error", "Lokasi tujuan harus diisi");
        return;
      }
      if (!formData.ongkir?.trim()) {
        Alert.alert("Error", "Ongkir harus diisi");
        return;
      }
    } else if (modalType === "send") {
      if (!formData.lokasi_jemput_barang?.trim()) {
        Alert.alert("Error", "Lokasi jemput barang harus diisi");
        return;
      }
      if (!formData.lokasi_tujuan?.trim()) {
        Alert.alert("Error", "Lokasi tujuan harus diisi");
        return;
      }
      if (!formData.tarif?.trim()) {
        Alert.alert("Error", "Tarif harus diisi");
        return;
      }
    }

    setSubmitting(true);

    try {
      let tableName = "";
      const base = { id_customer: userData.id, status: "pending" } as any;
      let insertData: any = { ...base };

      if (modalType === "ride") {
        tableName = "scoot_ride";
        insertData = {
          ...base,
          lokasi_jemput: formData.lokasi_jemput,
          lokasi_tujuan: formData.lokasi_tujuan,
          tarif: Number(formData.tarif),
        };
      } else if (modalType === "food") {
        tableName = "scoot_food";
        insertData = {
          ...base,
          lokasi_resto: formData.lokasi_resto,
          lokasi_tujuan: formData.lokasi_tujuan,
          detail_pesanan: formData.detail_pesanan || null,
          ongkir: Number(formData.ongkir),
        };
      } else if (modalType === "send") {
        tableName = "scoot_send";
        insertData = {
          ...base,
          lokasi_jemput_barang: formData.lokasi_jemput_barang,
          lokasi_tujuan: formData.lokasi_tujuan,
          tarif: Number(formData.tarif),
          nama_penerima: formData.nama_penerima || null,
          berat: formData.berat ? Number(formData.berat) : null,
          nama_barang: formData.nama_barang || null,
        };
      } else {
        throw new Error("Unknown modal type");
      }

      const { data, error } = await supabase
        .from(tableName)
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      const created = data || {};
      const createdId =
        created.id_scoot_ride ?? created.id_scoot_food ?? created.id_scoot_send ?? created.id ?? null;

      const newOrder: ActiveOrder = {
        id: createdId,
        type: modalType,
        asal:
          modalType === "food"
            ? created.lokasi_resto ?? formData.lokasi_resto
            : modalType === "ride"
            ? created.lokasi_jemput ?? formData.lokasi_jemput
            : created.lokasi_jemput_barang ?? formData.lokasi_jemput_barang,
        tujuan: created.lokasi_tujuan ?? formData.lokasi_tujuan,
        harga:
          modalType === "food"
            ? Number(created.ongkir ?? formData.ongkir ?? 0)
            : Number(created.tarif ?? formData.tarif ?? 0),
        status: "Menunggu Konfirmasi",
        timestamp: created.timestamp ?? new Date().toISOString(),
      };

      setActiveOrders((prev) => [newOrder, ...prev]);

      // Reset form dan tutup modal
      resetForm();
      setShowModal(false);

      Alert.alert("Berhasil", "Pesanan Anda telah dibuat dan menunggu driver.");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Gagal membuat pesanan. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChat = (order: ActiveOrder) => {
    if (!order.driver_id) {
      Alert.alert("Info", "Pesanan belum diambil driver. Harap menunggu.");
      return;
    }

    console.log("📱 Opening chat for order:", order);

    router.push({
      pathname: "/screens/AmbilPesanan",
      params: {
        orderId: order.id.toString(),
        serviceType: order.type,
        customerId: userData?.id,
        driverId: order.driver_id,
        tujuan: order.tujuan,
        asal: order.asal,
        tarif: `Rp ${order.harga.toLocaleString()}`,
      },
    });
  };

  const getServiceIcon = (type: string) => {
    switch (type) {
      case "ride": return "🏍️";
      case "food": return "🍔";
      case "send": return "📦";
      default: return "📦";
    }
  };

  const getServiceName = (type: string) => {
    switch (type) {
      case "ride": return "ScootRide";
      case "food": return "ScootFood";
      case "send": return "ScootSend";
      default: return "Pesanan";
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((s) => s[0] || "")
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="white" />
        <Text style={styles.loadingText}>Memuat data...</Text>
      </View>
    );
  }

  const initials = userData ? getInitials(userData.nama) : "NA";
  const name = userData?.nama || "Customer";

  const renderOrderForm = () => {
    if (!modalType) return null;
    return (
      <View style={styles.formContainer}>
        {/* SCOOT RIDE FORM */}
        {modalType === "ride" && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>📍 Lokasi Jemput</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: Jl. Sudirman No. 1"
                value={formData.lokasi_jemput}
                onChangeText={(text) => setFormData({...formData, lokasi_jemput: text})}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>🎯 Lokasi Tujuan</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: Jl. Thamrin No. 5"
                value={formData.lokasi_tujuan}
                onChangeText={(text) => setFormData({...formData, lokasi_tujuan: text})}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>💰 Tarif (Rp)</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: 15000"
                value={formData.tarif}
                onChangeText={(text) => setFormData({...formData, tarif: text})}
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </>
        )}

        {/* SCOOT FOOD FORM */}
        {modalType === "food" && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>🍽️ Lokasi Restoran</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: Warung Makan Sejahtera"
                value={formData.lokasi_resto}
                onChangeText={(text) => setFormData({...formData, lokasi_resto: text})}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>📍 Lokasi Tujuan</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: Jl. Sudirman No. 1"
                value={formData.lokasi_tujuan}
                onChangeText={(text) => setFormData({...formData, lokasi_tujuan: text})}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>📝 Detail Pesanan</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Contoh: 2 Nasi Goreng, 1 Es Teh"
                value={formData.detail_pesanan}
                onChangeText={(text) => setFormData({...formData, detail_pesanan: text})}
                multiline
                numberOfLines={3}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>💰 Ongkir (Rp)</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: 10000"
                value={formData.ongkir}
                onChangeText={(text) => setFormData({...formData, ongkir: text})}
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </>
        )}

        {/* SCOOT SEND FORM */}
        {modalType === "send" && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>📍 Lokasi Jemput Barang</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: Jl. Sudirman No. 1"
                value={formData.lokasi_jemput_barang}
                onChangeText={(text) => setFormData({...formData, lokasi_jemput_barang: text})}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>🎯 Lokasi Tujuan</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: Jl. Thamrin No. 5"
                value={formData.lokasi_tujuan}
                onChangeText={(text) => setFormData({...formData, lokasi_tujuan: text})}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>💰 Tarif (Rp)</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: 20000"
                value={formData.tarif}
                onChangeText={(text) => setFormData({...formData, tarif: text})}
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>👤 Nama Penerima (Opsional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: John Doe"
                value={formData.nama_penerima}
                onChangeText={(text) => setFormData({...formData, nama_penerima: text})}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>⚖️ Berat (kg) - Opsional</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: 2.5"
                value={formData.berat}
                onChangeText={(text) => setFormData({...formData, berat: text})}
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>📦 Nama Barang (Opsional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Contoh: Paket elektronik"
                value={formData.nama_barang}
                onChangeText={(text) => setFormData({...formData, nama_barang: text})}
                multiline
                numberOfLines={2}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </>
        )}

        {/* Buttons */}
        <View style={styles.modalButtons}>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={() => {
              resetForm();
              setShowModal(false);
            }}
            disabled={submitting}
          >
            <Text style={styles.cancelButtonText}>Batal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modalButton, styles.submitButton]}
            onPress={handleSubmitOrder}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Pesan Sekarang</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadActiveOrders();
          }}
          tintColor="#10B981"
        />
      }
    >
      {/* HEADER USER INFO */}
      {/* Redesigned header with profile image + preview + edit button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={() => setShowPreview(true)}
        >
          {currentImageUrl ? (
            <Image source={{ uri: currentImageUrl }} style={styles.avatar} />
          ) : (
            <Image
              source={require("../../../assets/images/driver.png")}
              style={styles.avatar}
            />
          )}
        </TouchableOpacity>
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>Hi, {name}</Text>
          <Text style={styles.subGreeting}>Semangat UnScoot hari ini</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push("/screens/customerfix/ProfileCust")}
          >
            <Text style={styles.editText}>Edit Profil</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ACTIVE ORDERS SECTION */}
      {activeOrders.length > 0 && (
        <View style={styles.activeOrdersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📦 Pesanan Aktif ({activeOrders.length})</Text>
            <TouchableOpacity onPress={() => loadActiveOrders()}>
              <Text style={styles.refreshBtn}>🔄</Text>
            </TouchableOpacity>
          </View>

          {loadingOrders ? (
            <ActivityIndicator size="small" color="#10B981" style={{ marginVertical: 10 }} />
          ) : (
            activeOrders.map((order) => (
              <TouchableOpacity
                key={`${order.type}-${order.id}`}
                style={styles.orderCard}
                onPress={() => handleOpenChat(order)}
              >
                <View style={styles.orderHeader}>
                  <Text style={styles.orderIcon}>{getServiceIcon(order.type)}</Text>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderTitle}>
                      {getServiceName(order.type)} #{order.id}
                    </Text>
                    <Text style={styles.orderStatus}>{order.status}</Text>
                  </View>
                  {order.driver_id && (
                    <View style={styles.chatBadge}>
                      <Text style={styles.chatBadgeText}>💬</Text>
                    </View>
                  )}
                </View>

                <View style={styles.orderDetails}>
                  <Text style={styles.orderLocation}>
                    📍 {order.asal.length > 30 ? order.asal.substring(0, 30) + "..." : order.asal}
                  </Text>
                  <Text style={styles.orderLocationTo}>
                    🎯 {order.tujuan.length > 30 ? order.tujuan.substring(0, 30) + "..." : order.tujuan}
                  </Text>
                  <Text style={styles.orderPrice}>
                    💰 Rp {order.harga.toLocaleString()}
                  </Text>
                  {order.driver_nama && (
                    <Text style={styles.driverName}>🏍️ {order.driver_nama}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {/* Default UI cards like contoh Anda */}
      <View style={styles.content}>
        <Text style={styles.question}>Mau ngapain hari ini?</Text>

        <TouchableOpacity
          style={styles.card}
          onPress={() => handleOpenServiceModal("ride")}
          activeOpacity={0.8}
        >
          <View style={styles.imageCircle}>
            <Image source={scootRideImage} style={styles.cardImage} resizeMode="cover" />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>ScootRide</Text>
            <Text style={styles.cardDesc}>Nebeng cepat, aman, dan</Text>
            <Text style={styles.cardDesc}>santai 😎</Text>
          </View>
          <View style={styles.arrowButton}>
            <Text style={styles.arrowText}>→</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => handleOpenServiceModal("food")}
          activeOpacity={0.8}
        >
          <View style={styles.imageCircle}>
            <Image source={scootFoodImage} style={styles.cardImage} resizeMode="cover" />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>ScootFood</Text>
            <Text style={styles.cardDesc}>Antar makanan dengan</Text>
            <Text style={styles.cardDesc}>mudah 😋</Text>
          </View>
          <View style={styles.arrowButton}>
            <Text style={styles.arrowText}>→</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => handleOpenServiceModal("send")}
          activeOpacity={0.8}
        >
          <View style={styles.imageCircle}>
            <Image source={scootSendImage} style={styles.cardImage} resizeMode="cover" />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>ScootSend</Text>
            <Text style={styles.cardDesc}>Kirim paket cepat, aman dan</Text>
            <Text style={styles.cardDesc}>terpercaya 📦</Text>
          </View>
          <View style={styles.arrowButton}>
            <Text style={styles.arrowText}>→</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* LOGOUT BUTTON */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => router.push("/screens/Logout")}
      >
        <Text style={styles.logoutText}>🚪 Logout</Text>
      </TouchableOpacity>

      <View style={styles.spacer} />

      {/* BOTTOM NAVIGATION */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[
            styles.navItem,
            activeTab === "Home" && styles.navItemActive,
          ]}
          onPress={() => {
            setActiveTab("Home");
            router.push("/screens/customerfix/PageCustomer");
          }}
        >
          <Text
            style={[
              styles.navEmoji,
              activeTab === "Home" && styles.navEmojiActive,
            ]}
          >
            🏠
          </Text>
          <Text
            style={[
              styles.navLabel,
              activeTab === "Home" && styles.navLabelActive,
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navItem,
            activeTab === "Riwayat" && styles.navItemActive,
          ]}
          onPress={() => {
            setActiveTab("Riwayat");
            router.push("/screens/customerfix/Riwayat_Customer");
          }}
        >
          <Text
            style={[
              styles.navEmoji,
              activeTab === "Riwayat" && styles.navEmojiActive,
            ]}
          >
            🕘
          </Text>
          <Text
            style={[
              styles.navLabel,
              activeTab === "Riwayat" && styles.navLabelActive,
            ]}
          >
            Riwayat
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navItem,
            activeTab === "Terms & Cond" && styles.navItemActive,
          ]}
          onPress={() => {
            setActiveTab("Terms & Cond");
            router.push("/screens/customerfix/TermsAndConditionCustomer");
          }}
        >
          <Text
            style={[
              styles.navEmoji,
              activeTab === "Terms & Cond" && styles.navEmojiActive,
            ]}
          >
            📄
          </Text>
          <Text
            style={[
              styles.navLabel,
              activeTab === "Terms & Cond" && styles.navLabelActive,
            ]}
          >
            Terms & Cond
          </Text>
        </TouchableOpacity>
      </View>

      {/* MODAL FORM */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalType === "ride" && "🏍️ Pesan ScootRide"}
                {modalType === "food" && "🍔 Pesan ScootFood"}
                {modalType === "send" && "📦 Pesan ScootSend"}
              </Text>
              <TouchableOpacity onPress={() => {
                resetForm();
                setShowModal(false);
              }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {renderOrderForm()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* PREVIEW PHOTO MODAL */}
      <Modal visible={showPreview} transparent animationType="fade" onRequestClose={() => setShowPreview(false)}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowPreview(false)}>
            <View style={styles.modalContent}>
              {currentImageUrl ? (
                <Image source={{ uri: currentImageUrl }} style={styles.previewImage} resizeMode="contain" />
              ) : (
                <Image source={require("../../../assets/images/driver.png")} style={styles.previewImage} resizeMode="contain" />
              )}
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowPreview(false)}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: "#10B981",
    minHeight: "100%",
    alignItems: "center",
  },
  loadingText: {
    color: "white",
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  avatarContainer: {
    marginRight: 12,
    overflow: "hidden",
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "#059669",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#059669",
    justifyContent: "center",
    alignItems: "center",
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
  },
  subGreeting: {
    color: "#D1FAE5",
    fontSize: 13,
    marginTop: 2,
  },
  editButton: {
    marginTop: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
  editText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  activeOrdersSection: {
    width: "100%",
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  refreshBtn: {
    fontSize: 18,
    paddingHorizontal: 8,
  },
  orderCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#10B981",
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  orderIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  orderStatus: {
    fontSize: 12,
    color: "#10B981",
    marginTop: 2,
    fontWeight: "600",
  },
  chatBadge: {
    backgroundColor: "#10B981",
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  chatBadgeText: {
    fontSize: 18,
  },
  orderDetails: {
    gap: 6,
  },
  orderLocation: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  orderLocationTo: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  orderPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#059669",
    marginTop: 4,
  },
  driverName: {
    fontSize: 12,
    color: "#0F172A",
    fontWeight: "600",
    marginTop: 4,
  },
  content: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  question: {
    fontWeight: "700",
    fontSize: 16,
    color: "#065F46",
    marginBottom: 16,
  },
  card: {
    width: "100%",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    elevation: 2,
  },
  imageCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  cardDesc: {
    color: "#6B7280",
    marginTop: 4,
    fontSize: 14,
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
  arrowText: {
    color: "white",
    fontWeight: "700",
    fontSize: 18,
  },
  logoutButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 16,
    elevation: 3,
  },
  logoutText: {
    color: "white",
    fontWeight: "700",
    fontSize: 15,
  },
  spacer: {
    height: 24,
  },
  bottomNav: {
    width: width - 40,
    backgroundColor: "white",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navItem: {
    alignItems: "center",
    width: (width - 64) / 3,
    paddingVertical: 4,
  },
  navItemActive: {
    borderBottomWidth: 3,
    borderBottomColor: "#10B981",
  },
  navEmoji: {
    fontSize: 20,
    marginBottom: 4,
    color: "#065F46",
  },
  navEmojiActive: {
    color: "#10B981",
  },
  navLabel: {
    fontSize: 12,
    color: "#065F46",
    fontWeight: "600",
  },
  navLabelActive: {
    color: "#10B981",
    fontWeight: "700",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalClose: {
    fontSize: 24,
    color: "#6B7280",
    fontWeight: "600",
  },
  modalScroll: {
    paddingHorizontal: 20,
  },
  formContainer: {
    paddingTop: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0F172A",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  cancelButtonText: {
    color: "#6B7280",
    fontWeight: "600",
    fontSize: 15,
  },
  submitButton: {
    backgroundColor: "#10B981",
    elevation: 2,
  },
  submitButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 15,
  },
  // Modal for image preview
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#EF4444",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
});

export default PageCustomer;