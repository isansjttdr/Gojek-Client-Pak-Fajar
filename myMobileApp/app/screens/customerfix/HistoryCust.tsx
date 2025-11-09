import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Riwayat_Customer = () => {
  const router = useRouter();
  const { nama, nim, email, userId } = useLocalSearchParams();

  // Buat object params untuk pass ke semua screen
  const userParams = {
    nama: nama || '',
    nim: nim || '',
    email: email || '',
    userId: userId || ''
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          {/* Header */}
          <Text style={styles.title}>RIWAYAT</Text>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.paragraph}>
            Halaman riwayat sedang dalam pengembangan.
          </Text>

          <Text style={styles.paragraph}>
            Di halaman ini, Anda dapat melihat riwayat pesanan yang telah diselesaikan.
          </Text>

          <Text style={styles.paragraph}>
            Informasi yang akan ditampilkan meliputi tanggal, waktu, lokasi, dan total pembayaran dari setiap pesanan.
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
        
        <View style={[styles.navItem, styles.navItemActive]}>
          <View style={styles.navIcon}>
            <Text style={styles.navIconText}>🕒</Text>
          </View>
          <Text style={styles.navText}>Riwayat</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.replace({
            pathname: '/screens/customerfix/TermCust',
            params: userParams
          })}
          activeOpacity={0.7}
        >
          <View style={styles.navIcon}>
            <Text style={styles.navIconText}>📋</Text>
          </View>
          <Text style={styles.navText}>Terms & Cond</Text>
        </TouchableOpacity>
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

export default Riwayat_Customer;