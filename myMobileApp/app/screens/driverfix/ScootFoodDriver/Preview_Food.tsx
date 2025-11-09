import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../../hooks/supabaseClient";

const Preview_Food = () => {
  const params = useLocalSearchParams();
  const router = useRouter();

  // Ambil parameter dari Daftar_Pesanan
  const { orderId, restaurant, item, price } = params;

  // local state to load fresh data from scoot_food when opened
  const [orderData, setOrderData] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    const id = (params?.orderId ?? params?.id_scoot_food) as string | undefined;
    if (!id) return;

    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("scoot_food")
          .select("id_scoot_food, lokasi_resto, detail_pesanan, ongkir, lokasi_tujuan, timestamp, status")
          .eq("id_scoot_food", Number(id))
          .single();

        if (error) {
          console.warn("Supabase fetch scoot_food error:", error);
        } else if (mounted) {
          setOrderData(data);
        }
      } catch (e) {
        console.error("Error loading scoot_food order:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [params.orderId, params.id_scoot_food]);

  // resolved display values prefer fresh DB data, fallback to params or defaults
  const displayRestaurant = orderData?.lokasi_resto ?? (restaurant as string) ?? "Warung Jepun";
  const displayItem =
    orderData?.detail_pesanan ??
    (item as string) ??
    `Ayam bakar                  1x\nKentang goreng         2x\nEs teh                             2x`;
  const displayPrice =
    orderData?.ongkir != null ? `Rp ${Number(orderData.ongkir).toLocaleString()}` : (price as string) ?? "Rp 10.000";

  const handleAmbil = () => {
    // Navigate ke Ambil_ScootFood dengan parameter
    router.push({
      pathname: '/screens/driverfix/ScootFoodDriver/Ambil_ScootFood',
      params: { orderId, restaurant: displayRestaurant, item: displayItem, price: displayPrice }
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.viewBg}>
        <View style={[styles.view, styles.viewBg]}>
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.detailPesanan}>Detail Pesanan</Text>

          {/* Detail Card */}
          <View style={styles.child}>
            {/* Restaurant Name */}
            <View style={styles.restaurantRow}>
              <View style={styles.item} />
              <Text style={styles.warungJepun}>{displayRestaurant}</Text>
            </View>

            {/* Pesanan Makanan */}
            <Text style={styles.pesananMakanan}>Pesanan Makanan :</Text>
            <Text style={styles.ayamBakar1x}>
              {displayItem}
            </Text>

            {/* Estimasi Tarif */}
            <Text style={styles.estimasiTarif}>
              Estimasi Tarif : {displayPrice}
            </Text>
          </View>

          {/* Ambil Button - Clickable */}
          <TouchableOpacity style={styles.roundedRectangle} onPress={handleAmbil}>
            <Text style={styles.ambil}>Ambil</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
};


const styles = StyleSheet.create({
  viewBg: {
    backgroundColor: "#fff",
    flex: 1
  },
  view: {
    width: "100%",
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20
  },
  backButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  backArrow: {
    fontSize: 32,
    color: '#016837',
    fontWeight: 'bold',
  },
  detailPesanan: {
    fontSize: 18,
    textAlign: "center",
    color: "#217b50",
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 20
  },
  child: {
    backgroundColor: "rgba(51, 204, 102, 0.12)",
    borderRadius: 21,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(1, 104, 55, 0.4)",
    elevation: 8,
    shadowColor: "#c4bfbf",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    marginBottom: 20
  },
  restaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  item: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#016837",
    marginRight: 12
  },
  warungJepun: {
    color: "#217b50",
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    fontSize: 11,
    lineHeight: 22,
    flex: 1
  },
  pesananMakanan: {
    color: "#217b50",
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    fontSize: 11,
    marginBottom: 10,
    lineHeight: 22
  },
  ayamBakar1x: {
    fontSize: 12,
    fontFamily: "Montserrat-Regular",
    color: "#217b50",
    lineHeight: 22,
    marginBottom: 20
  },
  estimasiTarif: {
    color: "#016837",
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    fontSize: 11,
    lineHeight: 22
  },
  roundedRectangle: {
    backgroundColor: "#33cc66",
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "rgba(1, 104, 55, 0.4)",
    elevation: 8,
    shadowColor: "#c4bfbf",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 40
  },
  ambil: {
    fontSize: 16,
    color: "#fff",
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 22
  }
});

export default Preview_Food;