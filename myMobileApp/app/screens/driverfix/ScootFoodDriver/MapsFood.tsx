import * as Linking from "expo-linking";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// Inline Supabase client: replace the URL and anon key below with your actual Supabase project values
// or create a proper lib/supabase.ts module and revert this change.

import { supabase } from "../../../../hooks/supabaseClient";

const MapsFood = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderIdParam = String(params.orderId ?? "");
  const service = String(params.service ?? "FOOD").toUpperCase(); // prefer passing service param

  const [origin, setOrigin] = React.useState<string | null>(null);
  const [destination, setDestination] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!orderIdParam) return;
      setLoading(true);
      try {
        const id = isNaN(Number(orderIdParam)) ? orderIdParam : Number(orderIdParam);

        // pilih tabel berdasarkan service
        if (service === "FOOD") {
          const { data, error } = await supabase
            .from("scoot_food")
            .select("lokasi_resto, lokasi_tujuan")
            .eq("id_scoot_food", id)
            .maybeSingle();
          if (!error && data && mounted) {
            setOrigin(data.lokasi_resto ?? null);
            setDestination(data.lokasi_tujuan ?? null);
          }
        } else if (service === "FOOD") {
          const { data, error } = await supabase
            .from("scoot_send")
            .select("lokasi_jemput_barang, lokasi_tujuan")
            .eq("id_scoot_send", id)
            .maybeSingle();
          if (!error && data && mounted) {
            setOrigin(data.lokasi_jemput_barang ?? null);
            setDestination(data.lokasi_tujuan ?? null);
          }
        } else {
          // default food
          const { data, error } = await supabase
            .from("scoot_food")
            .select("lokasi_jemput, lokasi_tujuan")
            .eq("id_scoot_food", id)
            .maybeSingle();
          if (!error && data && mounted) {
            setOrigin(data.lokasi_jemput ?? null);
            setDestination(data.lokasi_tujuan ?? null);
          }
        }
      } catch (e) {
        console.error("Load order locations error", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [orderIdParam, service]);

  const openMaps = () => {
    if (!origin && !destination) {
      Alert.alert("Lokasi tidak tersedia", "Tidak ada lokasi asal/tujuan untuk order ini.");
      return;
    }
    // Google Maps directions URL using origin/destination as text; if you have lat,lng, use lat,lng instead
    const gUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin ?? "")}&destination=${encodeURIComponent(destination ?? "")}&travelmode=driving`;
    Linking.openURL(gUrl).catch(err => {
      console.warn("open maps failed", err);
      Alert.alert("Error", "Gagal membuka aplikasi peta.");
    });
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

          {/* Maps Container */}
          <View style={styles.mapsContainer}>
            <Image 
              style={styles.mapsImage} 
              source={require('../../../../assets/images/maps.png')}
              resizeMode="cover"
            />
            <Text style={{marginTop:8}}>{loading ? "Memuat lokasi..." : `Dari: ${origin ?? "-"}`}</Text>
            <Text>{`Tujuan: ${destination ?? "-"}`}</Text>
          </View>

          {/* Optional: Tombol Hubungi */}
          <TouchableOpacity 
            style={[styles.button, styles.hubungiButton]}
            activeOpacity={0.8}
            onPress={() =>
              router.push({
                pathname: '/screens/driverfix/ScootFoodDriver/HalamanChat_Food_Driver',
                params: { orderId: orderIdParam }
              })
            }
          >
            <Text style={styles.buttonText}>Hubungi</Text>
          </TouchableOpacity>

          {/* Button to open in Maps */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#0ea5a4" }]}
            onPress={openMaps}
          >
            <Text style={styles.buttonText}>Buka di Maps</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  viewBg: { backgroundColor: "#fff", flex: 1 },
  view: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  backButton: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  backArrow: { fontSize: 32, color: '#016837', fontWeight: 'bold' },
  mapsContainer: { backgroundColor: 'rgba(91, 211, 131, 0.5)', borderRadius: 15, padding: 10, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 40, elevation: 40, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.1)' },
  mapsImage: { width: '100%', height: 300, borderRadius: 10 },
  button: { backgroundColor: '#33cc66', borderRadius: 34, paddingVertical: 12, alignItems: 'center', marginBottom: 12, shadowColor: "rgba(0, 0, 0, 0.25)", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 20, elevation: 20 },
  hubungiButton: { backgroundColor: '#fe95a3' },
  buttonText: { color: '#fff', fontFamily: 'Montserrat-Bold', fontWeight: '700', fontSize: 16, textAlign: 'center' },
});

export default MapsFood;