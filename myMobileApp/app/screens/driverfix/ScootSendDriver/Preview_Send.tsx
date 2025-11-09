import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../../hooks/supabaseClient";

const Preview_Send = () => {
  const params = useLocalSearchParams();
  const router = useRouter();

  // Ambil parameter dari Daftar_Pesanan
  const { id_scoot_send, time, pickup, destination, price } = params;

  const [orderData, setOrderData] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    const idParam = id_scoot_send;
    if (!idParam) return;

    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("scoot_send")
          .select("id_scoot_send, lokasi_jemput_barang, lokasi_tujuan, tarif, nama_penerima, berat, kategori_barang, timestamp, status")
          .eq("id_scoot_send", idParam)
          .single();

        if (error) {
          console.warn("Supabase fetch scoot_send error:", error);
        } else if (mounted) {
          setOrderData(data);
        }
      } catch (e) {
        console.error("Error loading scoot_send order:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [id_scoot_send]);

  // prefer DB data, fallback to params or defaults
  const displayPickup = orderData?.lokasi_jemput_barang ?? (pickup as string) ?? "Dwi Aruna Putri\nKos kembang indah jaya";
  const displayDestination = orderData?.lokasi_tujuan ?? (destination as string) ?? "Syifa Khoirunisa\nUPT TIK Fatisda";
  const displayPrice = orderData?.tarif != null ? `Rp ${Number(orderData.tarif).toLocaleString()}` : (price as string) ?? "Rp 10.000";
  const displayItem = orderData?.kategori_barang ?? "Komputer Gaming (5 Kg)";

  const handleAmbil = () => {
    // Navigate ke Ambil_ScootSend dengan parameter
    router.push({
      pathname: '/screens/driverfix/ScootSendDriver/Ambil_ScootSend',
      params: {
        orderId: String(orderData?.id_scoot_send ?? id_scoot_send ?? ""),
        time: orderData?.timestamp ?? time ?? "",
        pickup: displayPickup,
        destination: displayDestination,
        price: displayPrice,
        raw: orderData ?? null,
      }
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
            {/* Pengirim */}
            <Text style={styles.pengirim}>Pengirim :</Text>
            <View style={styles.senderRow}>
              <View style={styles.item} />
              <Text style={styles.dwiArunaPutri}>
                {displayPickup}
              </Text>
            </View>

            {/* Penerima */}
            <Text style={styles.tampilanTombolPreviewPengirim}>Penerima :</Text>
            <View style={styles.receiverRow}>
              <View style={styles.inner} />
              <Text style={styles.syifaKhoirunisaUpt}>
                {displayDestination}
              </Text>
            </View>

            {/* Barang */}
            <Text style={styles.barangYangDi}>Barang yang di kirim :</Text>
            <Text style={styles.komputerGaming5}>{displayItem}</Text>

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
  pengirim: {
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    lineHeight: 22,
    color: "#217b50",
    fontSize: 11,
    marginBottom: 8
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20
  },
  item: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#016837",
    marginRight: 12,
    marginTop: 6
  },
  dwiArunaPutri: {
    fontFamily: "Montserrat-Regular",
    lineHeight: 22,
    color: "#217b50",
    fontSize: 11,
    flex: 1
  },
  tampilanTombolPreviewPengirim: {
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    lineHeight: 22,
    color: "#217b50",
    fontSize: 11,
    marginBottom: 8
  },
  receiverRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20
  },
  inner: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#016837",
    marginRight: 12,
    marginTop: 6
  },
  syifaKhoirunisaUpt: {
    fontFamily: "Montserrat-Regular",
    lineHeight: 22,
    color: "#217b50",
    fontSize: 11,
    flex: 1
  },
  barangYangDi: {
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    lineHeight: 22,
    color: "#217b50",
    fontSize: 11,
    marginBottom: 8
  },
  komputerGaming5: {
    fontFamily: "Montserrat-Regular",
    lineHeight: 22,
    color: "#217b50",
    fontSize: 11,
    marginBottom: 20
  },
  estimasiTarif: {
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    lineHeight: 22,
    color: "#016837",
    fontSize: 11
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

export default Preview_Send;