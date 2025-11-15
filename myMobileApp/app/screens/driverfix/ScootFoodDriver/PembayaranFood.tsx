import Constants from "expo-constants";
import * as Linking from "expo-linking";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

interface CreatePaymentResp {
  payment_url: string;
  payment_id?: string;
}

const PembayaranFood: React.FC = () => {
  const [amount, setAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  // TODO: ganti ini sesuai param dari screen sebelumnya
  const id_scoot_send = "dummy_scoot";
  const food = "dummy_food";
  const rid = "dummy_rid";

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const createPayment = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert("Nominal tidak valid", "Masukkan nominal pembayaran yang benar.");
      return;
    }

    setLoading(true);
    setQrUrl(null);
    setStatus(null);
    setPaymentId(null);

    try {
      // get supabase key from expo constants or env
      const SUPABASE_KEY =
        Constants.expoConfig?.extra?.SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        "<YOUR_SUPABASE_ANON_KEY>";

      const res = await fetch(
        "https://lhdpyvrihbrgrfdqakie.supabase.co/functions/v1/clever-action",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // required by Supabase Edge Function
            Authorization: `Bearer ${SUPABASE_KEY}`,
            apikey: SUPABASE_KEY,
          },
          body: JSON.stringify({
            id_scoot_send,
            food,
            rid,
            orderId: "ORDER_ID_PLACEHOLDER",
            amount: amt,
            service: "food",
          }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        console.error("createPayment failed:", res.status, text);
        throw new Error("Gagal membuat permintaan pembayaran");
      }

      const json: CreatePaymentResp = await res.json();
      if (!json.payment_url) throw new Error("payment_url tidak diterima dari server");

      setQrUrl(json.payment_url);
      if (json.payment_id) setPaymentId(json.payment_id);
      setStatus("pending");

      if (json.payment_id) startPolling(json.payment_id);
    } catch (err: any) {
      console.error("createPayment error:", err);
      Alert.alert("Error", err?.message || "Gagal membuat pembayaran");
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (pid: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `https://YOUR_BACKEND_DOMAIN/api/paymentStatus?payment_id=${encodeURIComponent(
            pid
          )}`
        );
        if (!res.ok) return;

        const j = await res.json();
        const st = String(j.status || "").toLowerCase();
        setStatus(st);

        if (st === "paid" || st === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;

          if (st === "paid") {
            Alert.alert("Pembayaran berhasil", "Terima kasih!");
          } else {
            Alert.alert("Pembayaran gagal", "Silakan coba lagi.");
          }
        }
      } catch (e) {
        console.warn("polling error", e);
      }
    }, 3000);
  };

  const openInBrowser = () => {
    if (!qrUrl) return;
    Linking.openURL(qrUrl).catch((e) => {
      Alert.alert("Error", "Gagal membuka link pembayaran");
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pembayaran Food</Text>

      <Text style={styles.label}>Nominal (Rp)</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder="Masukkan nominal"
        style={styles.input}
      />

      <TouchableOpacity style={styles.actionBtn} onPress={createPayment} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionText}>Buat QR Pembayaran</Text>}
      </TouchableOpacity>

      {qrUrl ? (
        <View style={styles.qrContainer}>
          <Text style={styles.info}>Status: {status}</Text>

          <View style={styles.qrBox}>
            <Image
              source={{
                uri: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                  qrUrl || ""
                )}`,
              }}
              style={{ width: 220, height: 220 }}
              resizeMode="contain"
            />
          </View>

          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#0b74ff", marginTop: 12 }]} onPress={openInBrowser}>
            <Text style={styles.actionText}>Buka di Browser</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Text style={styles.hint}>
        Backend harus mengembalikan payment_url dan payment_id.
      </Text>
    </View>
  );
};

export default PembayaranFood;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12, color: "#016837" },
  label: { alignSelf: "flex-start", marginLeft: 6, fontWeight: "600", marginTop: 8 },
  input: {
    width: "100%",
    height: 44,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  actionBtn: {
    marginTop: 12,
    width: "100%",
    backgroundColor: "#016837",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  actionText: { color: "#fff", fontWeight: "700" },
  qrContainer: { marginTop: 18, alignItems: "center" },
  qrBox: {
    width: 240,
    height: 240,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  info: { fontWeight: "700", marginBottom: 8 },
  hint: { marginTop: 18, color: "#6b7280", textAlign: "center", fontSize: 12 },
});
