import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../../hooks/supabaseClient";

const AmbilScootRide = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const previewParam = params?.preview;
  const isPreviewMode =
    previewParam === 'true' || (Array.isArray(previewParam) && previewParam.includes('true'));

  const { orderId, pickup, destination, price, raw } = params;

  const handleContact = async () => {
    try {
      let customerName = "Customer";

      if (orderId) {
        // try to get id_customer from scoot_ride
        const idValue = isNaN(Number(orderId)) ? orderId : Number(orderId);
        const { data: rideRow, error: rideErr } = await supabase
          .from("scoot_ride")
          .select("id_customer")
          .eq("id_scoot_ride", idValue)
          .maybeSingle();

        if (rideErr) {
          console.warn("⚠️ Error fetching scoot_ride:", rideErr);
        } else if (rideRow && rideRow.id_customer) {
          const identifier = String(rideRow.id_customer);

          // if identifier looks like UUID -> query by id, else assume it's nim -> query by nim
          if (identifier.includes("-")) {
            const { data: cust, error: custErr } = await supabase
              .from("customer")
              .select("nama")
              .eq("id", identifier)
              .maybeSingle();
            if (cust && cust.nama) customerName = cust.nama;
            if (custErr) console.warn("⚠️ Error fetching customer by id:", custErr);
          } else {
            const { data: cust, error: custErr } = await supabase
              .from("customer")
              .select("nama")
              .eq("nim", identifier)
              .maybeSingle();
            if (cust && cust.nama) customerName = cust.nama;
            if (custErr) console.warn("⚠️ Error fetching customer by nim:", custErr);
          }
        }
      }
      // navigate to chat page with resolved customerName (photo left empty for default)
      router.push({
        pathname: "/screens/driverfix/ScootRideDriver/HalamanChat_Ride_Driver",
        params: {
          customerName,
          customerPhoto: "",
          pickup: pickup,
          destination: destination,
        },
      });
    } catch (err) {
      console.error("❌ handleContact error:", err);
      // fallback navigation with default name
      router.push({
        pathname: "/screens/driverfix/ScootRideDriver/HalamanChat_Ride_Driver",
        params: {
          customerName: "Customer",
          customerPhoto: "",
          pickup: pickup,
          destination: destination,
        },
      });
    }
  };

  const handleAmbilOrder = async () => {
    try {
      // Ambil user id dari auth
      let userId: string | undefined;
      try {
        const { data: userData } = await supabase.auth.getUser();
        userId = userData?.user?.id;
      } catch (error) {
        console.error('Error getting user ID:', error);
      }

      if (!userId) {
        console.log('User ID not found');
        return;
      }

      // Ambil order ke database
      const { data, error } = await supabase
        .from('orders')
        .insert([
          {
            id: orderId,
            pickup_location: pickup,
            destination_location: destination,
            price: price,
            user_id: userId,
            status: 'pending',
            created_at: new Date(),
          }
        ]);

      if (error) {
        throw error;
      }

      console.log('Order data:', data);

      // Navigasi ke halaman berikutnya setelah ambil order
      router.push({
        pathname: '/screens/driverfix/ScootRideDriver/HalamanChat_Ride_Driver',
        params: { orderId: orderId },
      });
    } catch (error) {
      console.error('Error ambil order:', error);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.viewBg}>
        <View style={[styles.view, styles.viewBg]}>
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          {/* Pickup Location */}
          <View style={styles.pickupContainer}>
            <View style={styles.dot} />
            <Text style={styles.locationText}>{pickup || "Universitas Sebelas Maret"}</Text>
          </View>

          {/* Destination Location */}
          <View style={styles.destinationContainer}>
            <View style={styles.dot} />
            <Text style={styles.locationText}>{destination || "Solo Grand Mall"}</Text>
          </View>

          {/* Maps Container */}
          <View style={styles.mapsContainer}>
            <Image 
              style={styles.mapsImage} 
              source={require('../../../../assets/images/maps.png')}
              resizeMode="cover"
            />
          </View>

          {/* On Maps Button */}
          <TouchableOpacity 
            style={[styles.button, styles.onMapsButton]}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>On Maps</Text>
          </TouchableOpacity>

          {/* Kontrol / Action area (ubah: sembunyikan Hubungi saat preview) */}
          <View style={styles.actionRow}>
            {/* jika bukan preview, tunjukkan tombol Hubungi */}
            {!isPreviewMode && (
              <TouchableOpacity style={styles.contactButton} onPress={handleContact}>
                <Text style={styles.contactText}>Hubungi</Text>
              </TouchableOpacity>
            )}
            {/* tombol Ambil tetap ada */}
          </View>

          {/* Jika preview mode, pastikan hanya Map tampilkan */}
          {isPreviewMode && (
            <View style={styles.mapOnlyContainer}>
              {/* ...existing Map component should be here, pastikan Map tetap render */}
            </View>
          )}
        </View>
      </SafeAreaView>
    </>
  );
};


const styles = StyleSheet.create({
  viewBg: {
    backgroundColor: "#fff",
    flex: 1,
  },
  view: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  backButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  backArrow: {
    fontSize: 32,
    color: '#016837',
    fontWeight: 'bold',
  },
  pickupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#4ab100',
  },
  destinationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4ab100',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ab100',
    marginRight: 12,
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Montserrat-Regular',
    color: '#000',
    flex: 1,
  },
  mapsContainer: {
    backgroundColor: 'rgba(91, 211, 131, 0.5)',
    borderRadius: 15,
    padding: 10,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 40,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  mapsImage: {
    width: '100%',
    height: 300,
    borderRadius: 10,
  },
  button: {
    backgroundColor: '#33cc66',
    borderRadius: 34,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: "rgba(0, 0, 0, 0.25)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 20,
  },
  onMapsButton: {
    backgroundColor: '#33cc66',
  },
  hubungiButton: {
    backgroundColor: '#fe95a3',
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Montserrat-Bold',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  contactButton: {
    backgroundColor: '#fe95a3',
    borderRadius: 34,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
    shadowColor: "rgba(0, 0, 0, 0.25)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 20,
  },
  contactText: {
    color: '#fff',
    fontFamily: 'Montserrat-Bold',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  ambilButton: {
    backgroundColor: '#33cc66',
    borderRadius: 34,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
    shadowColor: "rgba(0, 0, 0, 0.25)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 20,
  },
  ambilText: {
    color: '#fff',
    fontFamily: 'Montserrat-Bold',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  mapOnlyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AmbilScootRide;