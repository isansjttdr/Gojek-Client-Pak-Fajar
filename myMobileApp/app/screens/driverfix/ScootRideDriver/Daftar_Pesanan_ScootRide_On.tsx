import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import * as React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../../hooks/supabaseClient";

const Daftar_Pesanan_ScootRide_On = () => {
  const router = useRouter();

  // toggle state: true = On (fetch orders), false = Off (navigate to Off screen)
  const [isOn, setIsOn] = React.useState(true);
  const [orders, setOrders] = React.useState<any[]>([
    {
      id: 1,
      pickup: "Univesitas Sebelas Maret",
      destination: "Solo Grand Mall",
      price: "Rp 10.000",
    },
    {
      id: 2,
      pickup: "Univesitas Sebelas Maret",
      destination: "Solo Grand Mall",
      price: "Rp 10.000",
    },
    {
      id: 3,
      pickup: "Univesitas Sebelas Maret",
      destination: "Solo Grand Mall",
      price: "Rp 10.000",
    },
    {
      id: 4,
      pickup: "Univesitas Sebelas Maret",
      destination: "Solo Grand Mall",
      price: "Rp 10.000",
    },
  ]);

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

  // fetch pending scoot_ride orders from Supabase
  const loadScootRideOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("scoot_ride")
        .select("id_scoot_ride, id_customer, id_driver, lokasi_jemput, lokasi_tujuan, tarif, status, timestamp")
        .eq("status", "pending")
        .order("timestamp", { ascending: false });

      if (error) {
        console.warn("Supabase fetch scoot_ride error:", error);
        return;
      }

      if (Array.isArray(data) && data.length > 0) {
        // map to UI shape used below
        const mapped = data.map((r: any) => ({
          id: r.id_scoot_ride,
          pickup: r.lokasi_jemput || "-",
          destination: r.lokasi_tujuan || "-",
          price: r.tarif != null ? `Rp ${Number(r.tarif).toLocaleString()}` : "Rp 0",
          raw: r,
        }));
        setOrders(mapped);
      } else {
        // no pending orders -> empty list
        setOrders([]);
      }
    } catch (e) {
      console.error("Error loading scoot_ride orders:", e);
    }
  };

  React.useEffect(() => {
    // when toggled to ON, load orders
    if (isOn) {
      loadScootRideOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOn]);

  const handleToggle = () => {
    const newState = !isOn;
    setIsOn(newState);
    if (!newState) {
      // if switching OFF, keep existing behavior and navigate to Off screen
      router.push('/screens/driverfix/ScootRideDriver/Daftar_Pesanan_ScootRide_Off');
    }
  };

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
        .from('scoot_ride')
        .update({
          id_driver: driverid,
          status: 'on progress'
        })
        .eq('id_scoot_ride', orderNum)
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
        loadScootRideOrders();
        return;
      }

      console.log('Pesanan berhasil diambil:', data);

      // Navigate to detail screen
      router.push({
        pathname: '/screens/driverfix/ScootRideDriver/Ambil_ScootRide',
        params: {
          orderId: String(order.id),
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
             <TouchableOpacity
               key={order.id}
               style={styles.orderCard}
               onPress={() => {
                 router.push({
                   pathname: '/screens/driverfix/ScootRideDriver/Ambil_ScootRide',
                   params: {
                    orderId: String(order.id),
                    pickup: order.pickup,
                    destination: order.destination,
                    price: order.price,
                    raw: order.raw || null,
                   }
                 });
               }}
               activeOpacity={0.8}
             >
               {/* Top Section */}
               <View style={styles.topSection}>
                 {/* Locations */}
                 <View style={styles.locationsContainer}>
                   <View style={styles.locationRow}>
                     <View style={styles.dot} />
                     <Text style={styles.locationText}>{order.pickup}</Text>
                   </View>
                   
                   <View style={styles.locationRow}>
                     <View style={styles.dot} />
                     <Text style={styles.locationText}>{order.destination}</Text>
                   </View>
                 </View>
 
                 {/* Ambil Button */}
                 <TouchableOpacity
                  style={styles.ambilButton}
                  activeOpacity={0.8}
                  onPress={() => handleAmbilOrder(order)}
                >
                  <Text style={styles.ambilText}>Ambil</Text>
                </TouchableOpacity>
               </View>
 
               {/* Bottom Section */}
               <View style={styles.bottomSection}>
                 {/* Preview Button -> navigasi ke Ambil_ScootRide dalam mode preview */}
                 <TouchableOpacity
                  style={styles.previewButton}
                  activeOpacity={0.8}
                  onPress={() => {
                    router.push({
                      pathname: '/screens/driverfix/ScootRideDriver/Ambil_ScootRide',
                      params: {
                        orderId: String(order.id),
                        pickup: order.pickup,
                        destination: order.destination,
                        price: order.price,
                        raw: order.raw || null,
                        preview: 'true'
                      }
                    });
                  }}
                >
                  <Text style={styles.previewText}>Preview</Text>
                </TouchableOpacity>
 
                 {/* Price */}
                 <Text style={styles.priceText}>
                   Estimasi Tarif : {order.price}
                 </Text>
               </View>
             </TouchableOpacity>
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
     borderRadius: 25,
     padding: 18,
     marginBottom: 16,
     shadowColor: "#000",
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.1,
     shadowRadius: 8,
     elevation: 5,
   },
   topSection: {
     flexDirection: "row",
     justifyContent: "space-between",
     alignItems: "flex-start",
     marginBottom: 12,
   },
   locationsContainer: {
     flex: 1,
     gap: 8,
   },
   locationRow: {
     flexDirection: "row",
     alignItems: "center",
   },
   dot: {
     width: 8,
     height: 8,
     borderRadius: 4,
     backgroundColor: "#fff",
     marginRight: 10,
   },
   locationText: {
     fontSize: 12,
     fontFamily: "Montserrat-Bold",
     fontWeight: "700",
     color: "#fff",
     lineHeight: 18,
     flexShrink: 1,
   },
   ambilButton: {
     backgroundColor: "#ff93a5",
     borderRadius: 33,
     paddingHorizontal: 24,
     paddingVertical: 8,
   },
   ambilText: {
     fontSize: 12,
     fontFamily: "Montserrat-Bold",
     fontWeight: "700",
     color: "#fff",
     textAlign: "center",
   },
   bottomSection: {
     flexDirection: "row",
     justifyContent: "space-between",
     alignItems: "center",
   },
   previewButton: {
     backgroundColor: "#ff93a5",
     borderRadius: 33,
     paddingHorizontal: 16,
     paddingVertical: 6,
   },
   previewText: {
     fontSize: 11,
     fontFamily: "Montserrat-Bold",
     fontWeight: "700",
     color: "#fff",
     textAlign: "center",
   },
   priceText: {
     fontSize: 11,
     fontFamily: "Montserrat-Bold",
     fontWeight: "700",
     color: "#fff",
     lineHeight: 14,
   },
 });
 
 export default Daftar_Pesanan_ScootRide_On;