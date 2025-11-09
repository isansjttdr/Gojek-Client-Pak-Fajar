import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import * as React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../../hooks/supabaseClient";

const Daftar_Pesanan_ScootFood_On = () => {
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
      router.push('/screens/driverfix/ScootFoodDriver/Daftar_Pesanan_ScootFood_Off');
    }
  };

  const loadScootFoodOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("scoot_food")
        .select("id_scoot_food, id_customer, id_driver, lokasi_resto, lokasi_tujuan, detail_pesanan, ongkir, timestamp, status")
        .eq("status", "pending")
        .order("timestamp", { ascending: false });

      if (error) {
        console.warn("Supabase fetch scoot_food error:", error);
        return;
      }

      if (Array.isArray(data)) {
        const mapped = data.map((r: any) => ({
          id: r.id_scoot_food,
          restaurant: r.lokasi_resto || "-",
          item: r.detail_pesanan || "-",
          price: r.ongkir != null ? `Rp ${Number(r.ongkir).toLocaleString()}` : "Rp 0",
          time: r.timestamp ? new Date(r.timestamp).toLocaleString() : "",
          raw: r,
        }));
        setOrders(mapped);
      } else {
        setOrders([]);
      }
    } catch (e) {
      console.error("Error loading scoot_food orders:", e);
    }
  };

  React.useEffect(() => {
    if (isOn) loadScootFoodOrders();
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
        .from('scoot_food')
        .update({
          id_driver: driverid,
          status: 'on progress'
        })
        .eq('id_scoot_food', orderNum)
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
        loadScootFoodOrders();
        return;
      }

      console.log('Pesanan berhasil diambil:', data);

      // Navigate to detail screen
      router.push({
        pathname: '/screens/driverfix/ScootFoodDriver/Ambil_ScootFood',
        params: {
          orderId: String(order.id),
          restaurant: order.restaurant,
          item: order.item,
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
                {/* Restaurant and Item Info */}
                <View style={styles.orderInfo}>
                  <View style={styles.locationRow}>
                    <View style={styles.dot} />
                    <Text style={styles.restaurantText}>{order.restaurant}</Text>
                  </View>
                  
                  <View style={styles.locationRow}>
                    <View style={styles.dot} />
                    <Text style={styles.itemText}>{order.item}</Text>
                  </View>
                </View>

                {/* Price and Action Buttons */}
                <View style={styles.rightSection}>
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
                        pathname: '/screens/driverfix/ScootFoodDriver/Preview_Food',
                        params: {
                          orderId: String(order.id),
                          restaurant: order.restaurant,
                          item: order.item,
                          price: order.price,
                          raw: order.raw || null,
                        }
                      });
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.buttonText}>Preview</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.priceText}>
                    Estimasi Ongkir : {order.price}
                  </Text>
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
     marginBottom: 16,
     borderWidth: 1,
     borderColor: "rgba(1, 104, 55, 0.4)",
     shadowColor: "#c4bfbf",
     shadowOffset: { width: 0, height: 3 },
     shadowOpacity: 0.3,
     shadowRadius: 8,
     elevation: 8,
     flexDirection: "row",
     justifyContent: "space-between",
     alignItems: "center",
   },
   orderInfo: {
     flex: 1,
     gap: 8,
   },
   locationRow: {
     flexDirection: "row",
     alignItems: "center",
   },
   dot: {
     width: 7,
     height: 7,
     borderRadius: 3.5,
     backgroundColor: "#fff",
     marginRight: 8,
   },
   restaurantText: {
     fontSize: 12,
     fontFamily: "Montserrat-Bold",
     fontWeight: "700",
     color: "#fff",
     lineHeight: 18,
   },
   itemText: {
     fontSize: 11,
     fontFamily: "Montserrat-Regular",
     color: "#fff",
     lineHeight: 16,
   },
   rightSection: {
     alignItems: "flex-end",
     gap: 6,
   },
   buttonAmbil: {
     backgroundColor: "#fe95a3",
     borderRadius: 33,
     paddingHorizontal: 16,
     paddingVertical: 5,
     minWidth: 70,
   },
   buttonPreview: {
     backgroundColor: "#ffd14a",
     borderRadius: 33,
     paddingHorizontal: 16,
     paddingVertical: 5,
     minWidth: 70,
   },
   buttonText: {
     fontSize: 11,
     fontFamily: "Montserrat-Bold",
     fontWeight: "700",
     color: "#fff",
     textAlign: "center",
     lineHeight: 14,
   },
   priceText: {
     fontSize: 10,
     fontFamily: "Montserrat-Bold",
     fontWeight: "700",
     color: "#fff",
     lineHeight: 14,
     marginTop: 4,
     textAlign: "right",
   },
 });
 
 export default Daftar_Pesanan_ScootFood_On;