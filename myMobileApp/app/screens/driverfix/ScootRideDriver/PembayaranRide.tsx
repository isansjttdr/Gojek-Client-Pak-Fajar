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

import { StackActions, useNavigation } from "@react-navigation/native";
import Constants from "expo-constants";
import QRCode from "react-native-qrcode-svg";

interface CreatePaymentResp {
  qr_url: string;
  id: number;
  status: string;
}

const PembayaranRide: React.FC = () => {
  const navigation = useNavigation();

  const [amount, setAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null); 
  const [status, setStatus] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setQrDataUrl(null);

    if (Platform.OS === "web" && qrUrl) {
      import("qrcode")
        .then((qrcode) => qrcode.toDataURL(qrUrl))
        .then((dataUrl: string) => {
          if (mounted) setQrDataUrl(dataUrl);
        })
        .catch(() => setQrDataUrl(null));
    }

    return () => {
      mounted = false;
    };
  }, [qrUrl]);

  const createPayment = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert("Nominal tidak valid", "Masukkan nominal pembayaran yang benar.");
      return;
    }

    setLoading(true);
    setQrUrl(null);
    setStatus(null);

    try {
      // ambil kunci Supabase dari expo constants / env (fallback placeholder)
      const SUPABASE_KEY =
        Constants.expoConfig?.extra?.SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        "<YOUR_SUPABASE_ANON_KEY>";

      const res = await fetch(
        "https://lhdpyvrihbrgrfdqakie.supabase.co/functions/v1/bright-action",
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "apikey": SUPABASE_KEY,
          },
          body: JSON.stringify({
            order_type: "ride",
            order_id: 10, 
            jumlah: amt,
          }),
        }
      );

      if (!res.ok) {
        const json = await res.json();
        console.error("createPayment failed:", res.status, json);
        throw new Error(json.error || json.details || "Gagal membuat pembayaran");
      }

      const json: CreatePaymentResp = await res.json();

      setQrUrl(json.qr_url);
      setStatus(json.status);

      startPolling(json.id);

    } catch (err: any) {
      console.error("createPayment error:", err);
      Alert.alert("Error", err?.message || "Gagal membuat pembayaran");
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (paymentId: number) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `https://lhdpyvrihbrgrfdqakie.supabase.co/functions/v1/payment-status?payment_id=${paymentId}`
        );

        if (!res.ok) return;

        const j = await res.json();
        const st = j.status?.toLowerCase();
        setStatus(st);

        if (st === "paid" || st === "failed") {
          clearInterval(pollRef.current!);
          pollRef.current = null;

          if (st === "paid") {
            navigation.dispatch(
              StackActions.replace("PembayaranSukses", {
                paymentId,
                amount,
              })
            );
          } else {
            Alert.alert("Gagal", "Pembayaran gagal.");
          }
        }
      } catch (e) {
        console.warn("polling error:", e);
      }
    }, 3000);
  };

  const openInBrowser = () => {
    if (!qrUrl) return;
    Linking.openURL(qrUrl).catch(() =>
      Alert.alert("Error", "Gagal membuka link pembayaran")
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pembayaran Ride</Text>

      <Text style={styles.label}>Nominal (Rp)</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder="Masukkan nominal"
        style={styles.input}
      />

      <TouchableOpacity
        style={styles.actionBtn}
        onPress={createPayment}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.actionText}>Buat QR Pembayaran</Text>
        )}
      </TouchableOpacity>

      {qrUrl ? (
        <View style={styles.qrContainer}>
          <Text style={styles.info}>Status: {status || "pending"}</Text>

          <View style={styles.qrBox}>
            {Platform.OS === "web" ? (
              qrDataUrl ? (
                <Image source={{ uri: qrDataUrl }} style={{ width: 220, height: 220 }} />
              ) : (
                <TouchableOpacity onPress={openInBrowser}>
                  <Text style={styles.link}>{qrUrl}</Text>
                </TouchableOpacity>
              )
            ) : (
              <QRCode value={qrUrl} size={220} />
            )}
          </View>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#0b74ff", marginTop: 12 }]}
            onPress={openInBrowser}
          >
            <Text style={styles.actionText}>Buka di Browser</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Text style={styles.hint}>
        QR dinamis. Backend akan mengembalikan qr_url dan status akan dipantau otomatis.
      </Text>
    </View>
  );
};

export default PembayaranRide;

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