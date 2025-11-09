import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import * as React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../../hooks/supabaseClient";

const Daftar_Pesanan_ScootSend_On = () => {
  const router = useRouter();

  // On/Off state and orders fetched from DB
  const [isOn, setIsOn] = React.useState(true);
  const [orders, setOrders] = React.useState<any[]>([]);

  // State untuk menyimpan driver ID
  const [driverId, setDriverId] = React.useState<string | null>(null);

  // Fungsi untuk mengambil driver ID dari berbagai sumber
  const getDriverId = async (): Promise<string | null> => {
    try {
      // 1. Cek dari state lokal terlebih dahulu
      if (driverId) {
        console.log('Driver ID dari state:', driverId);
        return driverId;
      }

      // 2. Coba dari AsyncStorage dengan berbagai key yang mungkin
      const storageKeys = [
        'driver_id',
        'driverId', 
        'id_driver',
        'userId',
        'user_id',
        'id_user',
        'user',
        'user_id',
        'userNim',
        'nim'
      ];

      for (const key of storageKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          console.log(`Driver ID ditemukan dari AsyncStorage (${key}):`, value);
          setDriverId(value); // Simpan ke state untuk penggunaan berikutnya
          return value;
        }
      }

      // 3. Coba dari Supabase Auth - getUser()
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userData?.user?.id) {
          console.log('Driver ID dari supabase.auth.getUser():', userData.user.id);
          // Simpan ke AsyncStorage untuk penggunaan berikutnya
          await AsyncStorage.setItem('driver_id', userData.user.id);
          setDriverId(userData.user.id);
          return userData.user.id;
        }
      } catch (err) {
        console.warn('Error getUser:', err);
      }

      // 4. Coba dari Supabase Auth - getSession()
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionData?.session?.user?.id) {
          console.log('Driver ID dari supabase.auth.getSession():', sessionData.session.user.id);
          // Simpan ke AsyncStorage untuk penggunaan berikutnya
          await AsyncStorage.setItem('driver_id', sessionData.session.user.id);
          setDriverId(sessionData.session.user.id);
          return sessionData.session.user.id;
        }
      } catch (err) {
        console.warn('Error getSession:', err);
      }

      console.warn('Driver ID tidak ditemukan dari semua sumber');
      return null;
    } catch (error) {
      console.error('Error dalam getDriverId:', error);
      return null;
    }
  };

  // Fungsi baru untuk mengambil id driver dari tabel driver berdasarkan NIM
  const getDriveridFromNim = async (nim: string): Promise<string | null> => {
    try {
      console.log('Mencari id driver dengan NIM:', nim);
      
      const { data, error } = await supabase
        .from('driver')
        .select('id')
        .eq('nim', nim)
        .single();

      if (error) {
        console.warn('Error mengambil id driver dari tabel:', error);
        return null;
      }

      if (data && data.id) {
        console.log('id driver ditemukan:', data.id);
        return data.id;
      }

      console.warn('id driver tidak ditemukan untuk NIM:', nim);
      return null;
    } catch (error) {
      console.error('Error dalam getDriveridFromNim:', error);
      return null;
    }
  };

  // Load driver ID saat komponen dimuat
  React.useEffect(() => {
    const loadDriverId = async () => {
      const id = await getDriverId();
      if (id) {
        console.log('Driver ID berhasil dimuat:', id);
      } else {
        console.warn('Gagal memuat Driver ID');
      }
    };
    loadDriverId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = () => {
    const newState = !isOn;
    setIsOn(newState);
    if (!newState) {
      // keep existing behaviour: navigate to Off screen when switched off
      router.push('/screens/driverfix/ScootSendDriver/Daftar_Pesanan_ScootSend_Off');
    }
  };

  // load pending scoot_send orders when ON
  const loadScootSendOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("scoot_send")
        .select("id_scoot_send, lokasi_jemput_barang, lokasi_tujuan, tarif, nama_penerima, timestamp, status")
        .eq("status", "pending")
        .order("timestamp", { ascending: false });

      if (error) {
        console.warn("Supabase fetch scoot_send error:", error);
        return;
      }

      if (Array.isArray(data)) {
        const mapped = data.map((r: any) => ({
          id: r.id_scoot_send,
          time: r.timestamp ? new Date(r.timestamp).toLocaleString() : "",
          pickup: r.lokasi_jemput_barang || "-",
          destination: r.lokasi_tujuan || "-",
          price: r.tarif != null ? `Rp ${Number(r.tarif).toLocaleString()}` : "Rp 0",
          recipient: r.nama_penerima || null,
          raw: r,
        }));
        setOrders(mapped);
      } else {
        setOrders([]);
      }
    } catch (e) {
      console.error("Error loading scoot_send orders:", e);
    }
  };

  React.useEffect(() => {
    if (isOn) loadScootSendOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOn]);

  // Fungsi untuk handle tombol Ambil
  const handleAmbilOrder = async (order: any) => {
    try {
      // Dapatkan driver ID (bisa berupa NIM atau id)
      const currentDriverId = await getDriverId();
      
      const orderNum = Number(order.id);
      
      if (!orderNum) {
        console.warn('Invalid order id:', order.id);
        alert('ID pesanan tidak valid');
        return;
      }
      
      if (!currentDriverId) {
        console.warn('Driver ID not found - abort setting id_driver. Status update skipped.');
        alert('Driver ID tidak ditemukan. Silakan login kembali.');
        return;
      }

      // Cek apakah currentDriverId adalah NIM atau id
      // Jika bukan format id (tidak mengandung dash), maka ambil id dari tabel driver
      let driverid = currentDriverId;
      
      if (!currentDriverId.includes('-')) {
        // Ini adalah NIM, perlu konversi ke id
        console.log('Driver ID adalah NIM, mengambil id dari database...');
        const id = await getDriveridFromNim(currentDriverId);
        
        if (!id) {
          console.warn('id driver tidak ditemukan untuk NIM:', currentDriverId);
          alert('Data driver tidak ditemukan. Silakan hubungi administrator.');
          return;
        }
        
        driverid = id;
        console.log('id driver berhasil didapat:', driverid);
      }

      console.log('Mengambil pesanan dengan ID:', orderNum, 'untuk driver id:', driverid);

      // Update bersamaan: set id_driver + status (only if still null)
      const { data, error } = await supabase
        .from('scoot_send')
        .update({
          id_driver: driverid,
          status: 'on progress'
        })
        .eq('id_scoot_send', orderNum)
        .is('id_driver', null)
        .select();

      if (error) {
        console.warn('Gagal update status/id_driver:', error);
        alert('Gagal mengambil pesanan: ' + error.message);
        return;
      }

      if (data && data.length === 0) {
        console.warn('Pesanan mungkin sudah diambil driver lain');
        alert('Pesanan sudah diambil oleh driver lain');
        // Refresh order list
        loadScootSendOrders();
        return;
      }

      console.log('Pesanan berhasil diambil:', data);

      // Navigate to detail screen
      router.push({
        pathname: '/screens/driverfix/ScootSendDriver/Ambil_ScootSend',
        params: {
          orderId: String(order.id),
          time: order.time,
          pickup: order.pickup,
          destination: order.destination,
          price: order.price,
          raw: order.raw || null,
          hideAmbil: 'true'
        }
      });

    } catch (e) {
      console.error('Error dalam handleAmbilOrder:', e);
      alert('Terjadi kesalahan: ' + (e as Error).message);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <Text style={styles.title}>DAFTAR PESANAN</Text>
        
        <TouchableOpacity 
          style={styles.toggleContainer}
          onPress={handleToggle}
          activeOpacity={0.8}
        >
          <Text style={styles.toggleText}>{isOn ? "On" : "Off"}</Text>
          <View style={styles.toggleCircle} />
        </TouchableOpacity>

        {/* Order List */}
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {orders.length === 0 ? (
            <View style={{ padding: 20 }}>
              <Text style={{ textAlign: "center", color: "#666" }}>{isOn ? "Tidak ada pesanan baru." : "Mode Off"}</Text>
            </View>
          ) : (
            orders.map((order) => (
            <View
              key={order.id}
              style={styles.orderCard}
            >
              {/* Time Badge */}
              <View style={styles.timeBadge}>
                <Text style={styles.timeText}>{order.time}</Text>
              </View>

              {/* Order Details */}
              <View style={styles.orderDetails}>
                {/* Pickup Location */}
                <View style={styles.locationRow}>
                  <View style={styles.dotGreen} />
                  <Text style={styles.locationText}>{order.pickup}</Text>
                </View>

                {/* Divider Line */}
                <View style={styles.dividerLine} />

                {/* Destination Location */}
                <View style={styles.locationRow}>
                  <View style={styles.dotWhite} />
                  <Text style={styles.locationText}>{order.destination}</Text>
                </View>

                {/* Price */}
                <Text style={styles.priceText}>
                  Estimasi Tarif : {order.price}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                {/* Button Ambil - Clickable dengan fungsi update database */}
                <TouchableOpacity 
                  style={styles.buttonAmbil}
                  onPress={() => handleAmbilOrder(order)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>Ambil</Text>
                </TouchableOpacity>

                {/* Button Preview - Clickable */}
                <TouchableOpacity 
                  style={styles.buttonPreview}
                  onPress={() => {
                    router.push({
                      pathname: '/screens/driverfix/ScootSendDriver/Preview_Send',
                      params: {
                        id_scoot_send: String(order.id),
                        time: order.time,
                        pickup: order.pickup,
                        destination: order.destination,
                        price: order.price,
                        raw: order.raw || null,
                      }
                    });
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>Preview</Text>
                </TouchableOpacity>
              </View>
            </View>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Montserrat-Bold",
    color: "#016837",
    lineHeight: 28,
    textAlign: "center",
    marginBottom: 15,
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: "#016837",
    borderRadius: 50,
    paddingVertical: 5,
    paddingLeft: 15,
    paddingRight: 5,
    gap: 8,
    marginBottom: 20,
  },
  toggleCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#ffffff",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Montserrat-Bold",
    color: "#ffffff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: "#33cc66",
    borderRadius: 21,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(1, 104, 55, 0.4)",
    shadowColor: "#c4bfbf",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  timeBadge: {
    backgroundColor: "#fe95a3",
    borderRadius: 39,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  timeText: {
    fontSize: 6,
    fontFamily: "Montserrat-Regular",
    color: "#fff",
    lineHeight: 10,
  },
  orderDetails: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  dotGreen: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#fff",
    marginRight: 8,
  },
  dotWhite: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#fff",
    marginRight: 8,
  },
  locationText: {
    fontSize: 11,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    lineHeight: 16,
  },
  dividerLine: {
    height: 1,
    backgroundColor: "#fff",
    marginLeft: 15,
    marginVertical: 6,
    width: "85%",
  },
  priceText: {
    fontSize: 11,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    lineHeight: 16,
    marginTop: 8,
    textAlign: "right",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  buttonAmbil: {
    backgroundColor: "#fe95a3",
    borderRadius: 33,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  buttonPreview: {
    backgroundColor: "#ffd14a",
    borderRadius: 33,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  buttonText: {
    fontSize: 11,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    lineHeight: 16,
  },
});

export default Daftar_Pesanan_ScootSend_On;