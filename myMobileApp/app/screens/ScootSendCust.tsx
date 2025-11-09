import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { supabase } from "../../hooks/supabaseClient";

const { width } = Dimensions.get("window");

interface PackageType {
  id: string;
  name: string;
  icon: string;
  description: string;
  maxWeight: string;
  basePrice: number;
  pricePerKm: number;
}

export default function ScootSendCust() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [packageDescription, setPackageDescription] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [distance, setDistance] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  const packageTypes: PackageType[] = [
    {
      id: "document",
      name: "Dokumen",
      icon: "📄",
      description: "Surat, berkas, amplop",
      maxWeight: "Max 1 kg",
      basePrice: 8000,
      pricePerKm: 1500,
    },
    {
      id: "small",
      name: "Paket Kecil",
      icon: "📦",
      description: "Box, tas, bungkusan kecil",
      maxWeight: "Max 5 kg",
      basePrice: 12000,
      pricePerKm: 2500,
    },
    {
      id: "medium",
      name: "Paket Sedang",
      icon: "📦",
      description: "Box sedang, barang elektronik",
      maxWeight: "Max 10 kg",
      basePrice: 18000,
      pricePerKm: 3500,
    },
    {
      id: "large",
      name: "Paket Besar",
      icon: "🚚",
      description: "Furniture, barang besar",
      maxWeight: "Max 20 kg",
      basePrice: 25000,
      pricePerKm: 5000,
    },
  ];

  useEffect(() => {
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUserId(data.user.id);
      }
    } catch (e) {
      console.warn("getCurrentUser error", e);
    }
  };

  const validateForm = () => {
    if (!senderName || !senderPhone || !pickupAddress) {
      Alert.alert("Error", "Mohon lengkapi data pengirim");
      return false;
    }
    if (!recipientName || !recipientPhone || !deliveryAddress) {
      Alert.alert("Error", "Mohon lengkapi data penerima");
      return false;
    }
    if (!selectedPackage) {
      Alert.alert("Error", "Mohon pilih jenis paket");
      return false;
    }
    if (!packageDescription) {
      Alert.alert("Error", "Mohon isi deskripsi paket");
      return false;
    }
    return true;
  };

  const calculatePrice = () => {
    if (!validateForm()) {
      return;
    }

    const simulatedDistance = Math.random() * 15 + 3;
    const price = selectedPackage!.basePrice + simulatedDistance * selectedPackage!.pricePerKm;

    setDistance(parseFloat(simulatedDistance.toFixed(1)));
    setEstimatedPrice(Math.round(price));
  };

  const clearInputs = () => {
    setSenderName("");
    setSenderPhone("");
    setPickupAddress("");
    setRecipientName("");
    setRecipientPhone("");
    setDeliveryAddress("");
    setPackageDescription("");
    setSelectedPackage(null);
    setEstimatedPrice(0);
    setDistance(0);
  };

  const handleOrder = async () => {
    if (!validateForm() || !userId || estimatedPrice === 0) {
      Alert.alert("Error", "Mohon hitung estimasi harga terlebih dahulu");
      return;
    }

    setLoading(true);

    try {
      // Map to scoot_send schema
      const insertPayload: any = {
        id_customer: userId,
        // id_driver left null, assigned later by driver
        lokasi_jemput_barang: pickupAddress,
        lokasi_tujuan: deliveryAddress,
        tarif: Number(estimatedPrice) || 0,
        nama_penerima: recipientName,
        berat: null,
        kategori_barang: selectedPackage?.id || selectedPackage?.name || null,
        status: "pending",
      };

      // Insert and return inserted row (use select to get generated serial id)
      const { data, error } = await supabase
        .from("scoot_send")
        .insert([insertPayload])
        .select()
        .single();

      if (error) throw error;

      // clear inputs
      clearInputs();

      // Show success alert with option to view detail
      Alert.alert(
        "Berhasil",
        "Pesanan Anda telah dibuat. Mohon ditunggu.",
        [
          {
            text: "Lihat Detail",
            onPress: () => {
              // navigate to detail page, sesuaikan path jika beda
              router.push({
                pathname: "../screens/customer/Detail_ScootSend",
                params: { id_scoot_send: data?.id_scoot_send?.toString?.() || data?.id?.toString?.(), userId },
              });
            },
          },
          {
            text: "OK",
            style: "cancel",
          },
        ],
        { cancelable: true }
      );
    } catch (error: any) {
      console.error("Error creating scoot_send:", error);
      Alert.alert("Error", "Gagal membuat pesanan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ScootSend</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Data Pengirim */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconCircle, { backgroundColor: "#e3f2fd" }]}>
                <Text style={styles.iconText}>👤</Text>
              </View>
              <Text style={styles.sectionTitle}>Data Pengirim</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nama Pengirim</Text>
              <TextInput
                style={styles.input}
                placeholder="Masukkan nama lengkap"
                placeholderTextColor="#999"
                value={senderName}
                onChangeText={setSenderName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>No. Telepon</Text>
              <TextInput
                style={styles.input}
                placeholder="08XX-XXXX-XXXX"
                placeholderTextColor="#999"
                value={senderPhone}
                onChangeText={setSenderPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Alamat Penjemputan</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Masukkan alamat lengkap penjemputan"
                placeholderTextColor="#999"
                value={pickupAddress}
                onChangeText={setPickupAddress}
                multiline
              />
            </View>
          </View>

          {/* Data Penerima */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconCircle, { backgroundColor: "#fff3e0" }]}>
                <Text style={styles.iconText}>📍</Text>
              </View>
              <Text style={styles.sectionTitle}>Data Penerima</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nama Penerima</Text>
              <TextInput
                style={styles.input}
                placeholder="Masukkan nama lengkap"
                placeholderTextColor="#999"
                value={recipientName}
                onChangeText={setRecipientName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>No. Telepon</Text>
              <TextInput
                style={styles.input}
                placeholder="08XX-XXXX-XXXX"
                placeholderTextColor="#999"
                value={recipientPhone}
                onChangeText={setRecipientPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Alamat Pengiriman</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Masukkan alamat lengkap pengiriman"
                placeholderTextColor="#999"
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                multiline
              />
            </View>
          </View>

          {/* Detail Paket */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconCircle, { backgroundColor: "#f3e5f5" }]}>
                <Text style={styles.iconText}>📦</Text>
              </View>
              <Text style={styles.sectionTitle}>Detail Paket</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Deskripsi Isi Paket</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Contoh: Buku, pakaian, elektronik, dll"
                placeholderTextColor="#999"
                value={packageDescription}
                onChangeText={setPackageDescription}
                multiline
              />
            </View>

            <Text style={styles.label}>Pilih Jenis Paket</Text>
            {packageTypes.map((pkg) => (
              <TouchableOpacity
                key={pkg.id}
                style={[
                  styles.packageCard,
                  selectedPackage?.id === pkg.id && styles.packageCardSelected,
                ]}
                onPress={() => setSelectedPackage(pkg)}
              >
                <Text style={styles.packageIcon}>{pkg.icon}</Text>
                <View style={styles.packageInfo}>
                  <Text style={styles.packageName}>{pkg.name}</Text>
                  <Text style={styles.packageDescription}>{pkg.description}</Text>
                  <Text style={styles.packageWeight}>{pkg.maxWeight}</Text>
                  <Text style={styles.packagePrice}>
                    Rp {pkg.basePrice.toLocaleString()} + Rp {pkg.pricePerKm.toLocaleString()}/km
                  </Text>
                </View>
                {selectedPackage?.id === pkg.id && (
                  <View style={styles.checkMark}>
                    <Text style={styles.checkMarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Tombol Hitung */}
          <TouchableOpacity
            style={styles.calculateButton}
            onPress={calculatePrice}
          >
            <Text style={styles.calculateButtonText}>Hitung Estimasi Harga</Text>
          </TouchableOpacity>

          {/* Hasil Estimasi */}
          {estimatedPrice > 0 && (
            <View style={styles.estimationCard}>
              <Text style={styles.estimationTitle}>📊 Estimasi Pengiriman</Text>
              <View style={styles.divider} />
              <View style={styles.estimationRow}>
                <Text style={styles.estimationLabel}>Jarak</Text>
                <Text style={styles.estimationValue}>{distance} km</Text>
              </View>
              <View style={styles.estimationRow}>
                <Text style={styles.estimationLabel}>Jenis Paket</Text>
                <Text style={styles.estimationValue}>{selectedPackage?.name}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.estimationRow}>
                <Text style={styles.totalLabel}>Total Estimasi</Text>
                <Text style={styles.totalPrice}>Rp {estimatedPrice.toLocaleString()}</Text>
              </View>
            </View>
          )}

          {/* Info Penting */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>ℹ️ Informasi Penting</Text>
            <Text style={styles.infoText}>
              • Pastikan barang tidak termasuk barang terlarang{"\n"}
              • Kemas barang dengan baik untuk keamanan{"\n"}
              • Kurir akan menghubungi saat tiba di lokasi{"\n"}
              • Estimasi waktu akan diberikan setelah pickup
            </Text>
          </View>

          {/* Tombol Pesan */}
          <TouchableOpacity
            style={[
              styles.orderButton,
              (loading || estimatedPrice === 0) && styles.orderButtonDisabled,
            ]}
            onPress={handleOrder}
            disabled={loading || estimatedPrice === 0}
          >
            <Text style={styles.orderButtonText}>
              {loading ? "Memproses..." : "Kirim Paket Sekarang"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#2196F3",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    color: "#333",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  textArea: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    color: "#333",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    minHeight: 80,
    textAlignVertical: "top",
  },
  packageCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  packageCardSelected: {
    borderColor: "#2196F3",
    backgroundColor: "#e3f2fd",
  },
  packageIcon: {
    fontSize: 36,
    marginRight: 16,
  },
  packageInfo: {
    flex: 1,
  },
  packageName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  packageDescription: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  packageWeight: {
    fontSize: 12,
    color: "#2196F3",
    fontWeight: "600",
    marginBottom: 4,
  },
  packagePrice: {
    fontSize: 13,
    color: "#666",
  },
  checkMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2196F3",
    justifyContent: "center",
    alignItems: "center",
  },
  checkMarkText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  calculateButton: {
    backgroundColor: "#FF9800",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
    elevation: 2,
  },
  calculateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  estimationCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },
  estimationTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 12,
  },
  estimationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  estimationLabel: {
    fontSize: 15,
    color: "#666",
  },
  estimationValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2196F3",
  },
  infoCard: {
    backgroundColor: "#fff8e1",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#FFC107",
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#f57f17",
    marginBottom: 10,
  },
  infoText: {
    fontSize: 13,
    color: "#f57f17",
    lineHeight: 20,
  },
  orderButton: {
    backgroundColor: "#2196F3",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginBottom: 20,
  },
  orderButtonDisabled: {
    backgroundColor: "#ccc",
  },
  orderButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});