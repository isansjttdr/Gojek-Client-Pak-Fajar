import * as Linking from "expo-linking";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

/**
 * PembayaranSend.tsx
 *
 * - UI: masukkan nominal -> minta payment_url ke backend -> tampilkan QR.
 * - Backend expected endpoints (implement di server Anda):
 *   POST /api/createPayment
 *     body: { orderId, amount, service: 'Send' }
 *     response: { payment_url, payment_id }
 *
 *   GET /api/paymentStatus?payment_id=...
 *     response: { status: 'pending'|'paid'|'failed' }
 *
 * - Install dependency: react-native-qrcode-svg
 *   npm install react-native-qrcode-svg
 *
 * - Jangan ubah file lain. Sesuaikan endpoint backend sesuai environment Anda.
 */

interface CreatePaymentResp {
  payment_url: string;
  payment_id?: string;
}

const PembayaranSend: React.FC = () => {
  const [amount, setAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
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
      // Ganti URL ini ke backend Anda yang akan memanggil Payment Gateway (Midtrans/Xendit/...)
      const res = await fetch("https://YOUR_BACKEND_DOMAIN/api/createPayment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: "ORDER_ID_PLACEHOLDER", // ganti sesuai context/params
          amount: amt,
          service: "Send",
        }),
      });

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

      // start polling payment status if payment_id provided
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
        const res = await fetch(`https://YOUR_BACKEND_DOMAIN/api/paymentStatus?payment_id=${encodeURIComponent(pid)}`);
        if (!res.ok) {
          console.warn("paymentStatus non-ok", res.status);
          return;
        }
        const j = await res.json();
        const st = String(j.status || "").toLowerCase();
        setStatus(st);
        if (st === "paid" || st === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          if (st === "paid") {
            Alert.alert("Pembayaran berhasil", "Terima kasih, pembayaran terkonfirmasi.");
            // Здесь можно navigate ke halaman success / selesai / close
          } else {
            Alert.alert("Pembayaran gagal", "Silakan coba lagi atau hubungi dukungan.");
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
      console.warn("openURL failed", e);
      Alert.alert("Error", "Gagal membuka link pembayaran");
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pembayaran Send</Text>

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
            {Platform.OS === "web" ? (
              // web: show link
              <TouchableOpacity onPress={openInBrowser}>
                <Text style={styles.link}>{qrUrl}</Text>
              </TouchableOpacity>
            ) : (
              // native: render QR as an image from a public QR service (no extra native deps)
              <Image
                source={{
                  uri: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                    qrUrl || ""
                  )}`,
                }}
                style={{ width: 220, height: 220 }}
                resizeMode="contain"
              />
            )}
          </View>

          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#0b74ff", marginTop: 12 }]} onPress={openInBrowser}>
            <Text style={styles.actionText}>Buka di Browser</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Text style={styles.hint}>
        Catatan: QR bersifat dinamis. Backend harus memanggil payment gateway dan mengembalikan payment_url serta payment_id (opsional) untuk polling.
      </Text>
    </View>
  );
};

export default PembayaranSend;

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
  link: { color: "#0b74ff", textDecorationLine: "underline" },
});