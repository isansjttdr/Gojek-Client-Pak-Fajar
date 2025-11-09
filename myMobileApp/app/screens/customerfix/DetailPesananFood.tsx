import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { 
  Alert,
  StyleSheet, 
  Text, 
  TextInput,
  TouchableOpacity, 
  View,
  ScrollView,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../hooks/supabaseClient";

const DetailPesananFood = () => {
  const router = useRouter();
  const { 
    lokasiResto, 
    lokasiTujuan, 
    ongkir,
    customerId 
  } = useLocalSearchParams();

  const [detailPesanan, setDetailPesanan] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLanjutkan = async () => {
    if (!detailPesanan.trim()) {
      Alert.alert("Perhatian", "Mohon isi detail pesanan Anda");
      return;
    }

    if (!customerId) {
      Alert.alert("Error", "Customer ID tidak ditemukan");
      return;
    }

    Alert.alert(
      "Konfirmasi",
      "Pesanan Anda akan segera diproses",
      [
        {
          text: "Batal",
          style: "cancel"
        },
        {
          text: "Ya, Lanjutkan",
          onPress: async () => {
            setSubmitting(true);
            try {
              // Insert to scoot_food table
              const { data, error } = await supabase
                .from("scoot_food")
                .insert([{
                  id_customer: customerId,
                  lokasi_resto: lokasiResto,
                  lokasi_tujuan: lokasiTujuan,
                  detail_pesanan: detailPesanan,
                  ongkir: ongkir ? Number(ongkir) : 0,
                  status: "pending"
                }])
                .select()
                .single();

              if (error) throw error;

              Alert.alert("Berhasil", "Pesanan Anda telah dibuat!", [
                {
                  text: "OK",
                  onPress: () => router.push("/screens/customerfix/PageCustomer")
                }
              ]);
            } catch (err) {
              console.error("Error creating order:", err);
              Alert.alert("Error", "Gagal membuat pesanan. Silakan coba lagi.");
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.viewBg}>
        <ScrollView style={styles.view}>
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          {/* Detail Card */}
          <View style={styles.detailCard}>
            <Text style={styles.cardTitle}>🍔 Mau makan apa dari resto ini?</Text>
            
            {/* Lokasi Resto */}
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📍</Text>
              <Text style={styles.infoText}>
                {lokasiResto || "Lokasi resto tidak diisi"}
              </Text>
            </View>
            
            {/* Lokasi Antar */}
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🏠</Text>
              <Text style={styles.infoText}>
                Antar ke: {lokasiTujuan || "Lokasi tujuan tidak diisi"}
              </Text>
            </View>

            {/* Detail Pesanan Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textArea}
                placeholder={`Contoh:\nAyam Geprek 1\nNila Bakar 1\nEs Teh Manis 2\n(ayam gepreknya pedas sedang, gak pakai kol)`}
                value={detailPesanan}
                onChangeText={setDetailPesanan}
                multiline
                numberOfLines={8}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Ongkir Info */}
          <View style={styles.ongkirInfo}>
            <Text style={styles.ongkirInfoLabel}>Total Ongkir:</Text>
            <Text style={styles.ongkirInfoValue}>
              Rp {ongkir ? Number(ongkir).toLocaleString() : '0'}
            </Text>
          </View>

          {/* Lanjutkan Pesanan Button */}
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={handleLanjutkan}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.submitText}>Lanjutkan Pesanan</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
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
    color: '#10B981',
    fontWeight: 'bold',
  },
  detailCard: {
    backgroundColor: 'rgba(209, 250, 229, 0.5)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  inputContainer: {
    marginTop: 16,
  },
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    minHeight: 150,
    textAlignVertical: 'top',
  },
  ongkirInfo: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  ongkirInfoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  ongkirInfoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  submitButton: {
    backgroundColor: '#10B981',
    borderRadius: 34,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    marginBottom: 30,
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default DetailPesananFood;