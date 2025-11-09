import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TermsAndConditionDriver = () => {
  const router = useRouter();
  const { nama, nim, email, jenisMotor, plat, userId } = useLocalSearchParams();

  // Buat object params untuk pass ke semua screen
  const userParams = {
    nama: nama || '',
    nim: nim || '',
    email: email || '',
    jenisMotor: jenisMotor || '',
    plat: plat || '',
    userId: userId || ''
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          {/* Header */}
          <Text style={styles.title}>TERMS & CONDITIONS</Text>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.paragraph}>
            Pembayaran hanya dapat dilakukan dengan QRIS dan cash.
          </Text>

          <Text style={styles.paragraph}>
            Karena keterbatasan metode pembayaran, maka pada layanan ScootSend pembayaran dilakukan di awal.
          </Text>

          <Text style={styles.paragraph}>
            Proses untuk selebihnya hanya melalui chat.
          </Text>

          <Text style={styles.paragraph}>
            Pembatalan hanya dapat dilakukan jika belum mendapatkan driver.
          </Text>

          <Text style={styles.paragraph}>
            Pemesanan makanan hanya dapat ditulis di notes dan tidak terkalkulasi secara otomatis sehingga driver diwajibkan mengirim nota untuk menyelesaikan pembayaran yang sah.
          </Text>

          <Text style={styles.paragraph}>
            Status resto tutup tidak dapat dilihat di langsung di aplikasi, harus cek manual melalui Google maps.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.replace({
            pathname: '/screens/customerfix/PageCustomer',
            params: userParams
          })}
          activeOpacity={0.7}
        >
          <View style={styles.navIcon}>
            <Text style={styles.navIconText}>🏠</Text>
          </View>
          <Text style={styles.navText}>Beranda</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.replace({
            pathname: '../screens/History',
            params: userParams
          })}
          activeOpacity={0.7}
        >
          <View style={styles.navIcon}>
            <Text style={styles.navIconText}>🕒</Text>
          </View>
          <Text style={styles.navText}>Riwayat</Text>
        </TouchableOpacity>
        
        <View style={[styles.navItem, styles.navItemActive]}>
          <View style={styles.navIcon}>
            <Text style={styles.navIconText}>📋</Text>
          </View>
          <Text style={styles.navText}>Terms & Cond</Text>
        </View>
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
  scrollView: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Montserrat-Bold",
    color: "#016837",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 20,
    lineHeight: 28,
  },
  content: {
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  paragraph: {
    fontSize: 12,
    fontFamily: "Montserrat-Regular",
    color: "#016837",
    lineHeight: 20,
    textAlign: "left",
    marginBottom: 18,
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  navItem: {
    alignItems: "center",
    flex: 1,
  },
  navItemActive: {
    backgroundColor: "#d2ffde",
    borderRadius: 18,
    paddingVertical: 6,
  },
  navIcon: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  navIconText: {
    fontSize: 22,
  },
  navText: {
    fontSize: 10,
    color: "#016837",
    marginTop: 2,
    fontFamily: "Montserrat-Regular",
  },
});

export default TermsAndConditionDriver;