import { useState } from "react";
import QRCode from "qrcode";

export default function PaymentScreen() {
  const [qrImg, setQrImg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBayar = async () => {
    setLoading(true);

    const res = await fetch(
      "https://lhdpyvrihbrgrfdqakie.supabase.co/functions/v1/create-payment",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({
          nominal: 15000,
          order_type: "produk",
          order_id: 123
        }),
      }
    );

    const result = await res.json();
    console.log("RESULT:", result);

    const qrData = await QRCode.toDataURL(result.payment_url);
    setQrImg(qrData);

    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <button onClick={handleBayar} disabled={loading}>
        {loading ? "Loading..." : "Buat QR Pembayaran"}
      </button>

      {qrImg !== "" && (
        <img src={qrImg} style={{ width: 250, height: 250, marginTop: 20 }} />
      )}
    </div>
  );
}
