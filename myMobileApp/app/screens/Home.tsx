import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../hooks/supabaseClient"; // pastikan path ini sesuai di proyek kamu
import { User } from "@supabase/supabase-js";

const GOJEK_LOGO = "https://upload.wikimedia.org/wikipedia/commons/2/2a/Gojek_logo.svg";
const GOFOOD_ICON = "https://img.icons8.com/color/48/000000/food.png";
const GORIDE_ICON = "https://img.icons8.com/color/48/000000/motorcycle.png";
const HISTORY_ICON = "https://img.icons8.com/ios-filled/32/0D8F4F/time-machine.png";
const RULES_ICON = "https://img.icons8.com/ios-filled/32/0D8F4F/rules.png";
const HOME_ICON = "https://img.icons8.com/ios-filled/32/0D8F4F/home.png";

const Home: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  // Ambil user aktif dari Supabase Auth
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
    };
    fetchUser();

    // Listener untuk perubahan status auth (login/logout)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Fungsi logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("..//screens/Login"); // Arahkan kembali ke halaman login
  };

  return (
    <View style={styles.container}>
      {/* Header kiri atas */}
      <View style={styles.header}>
        <Image source={{ uri: GOJEK_LOGO }} style={styles.logo} />
        <Text style={styles.greetingText}>
          Hi, {user?.email || "User"}
        </Text>
      </View>

      {/* Pilih layanan */}
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} style={styles.contentScroll}>
        <View style={styles.serviceSection}>
          <Text style={styles.serviceTitle}>Pilih Layanan</Text>

          {/* GoFood Button */}
          <TouchableOpacity style={styles.serviceButton}>
            <Image source={{ uri: GOFOOD_ICON }} style={styles.serviceIcon} />
            <View>
              <Text style={styles.serviceName}>GoFood</Text>
              <Text style={styles.serviceDesc}>Anterin makanan</Text>
            </View>
          </TouchableOpacity>

          {/* GoRide Button */}
          <TouchableOpacity style={styles.serviceButton}>
            <Image source={{ uri: GORIDE_ICON }} style={styles.serviceIcon} />
            <View>
              <Text style={styles.serviceName}>GoRide</Text>
              <Text style={styles.serviceDesc}>Antar kamu</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <View style={styles.navButtonsContainer}>
          <TouchableOpacity style={styles.navButton}>
            <Image source={{ uri: HOME_ICON }} style={styles.navIcon} />
            <Text style={styles.navText}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navButton} onPress={() => router.push("..//screens/History")}>
            <Image source={{ uri: HISTORY_ICON }} style={styles.navIcon} />
            <Text style={styles.navText}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navButton} onPress={() => router.push("..//screens/Term")}>
            <Image source={{ uri: RULES_ICON }} style={styles.navIcon} />
            <Text style={styles.navText}>Peraturan</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navButton} onPress={handleLogout}>
            <Text style={[styles.navText, { fontSize: 14, color: "#E9573F" }]}>Keluar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#38A169", paddingTop: 50 },
  header: { position: "absolute", top: 6, left: 20, flexDirection: "row", alignItems: "center", zIndex: 10 },
  logo: { width: 40, height: 40, marginRight: 10 },
  greetingText: { color: "white", fontSize: 18, fontWeight: "bold" },
  contentScroll: { flex: 1, marginTop: 100 },
  serviceSection: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  serviceTitle: { color: "white", fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  serviceButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    elevation: 3,
    padding: 15,
    marginBottom: 15,
  },
  serviceIcon: { width: 48, height: 48, marginRight: 15 },
  serviceName: { fontWeight: "bold", color: "#10B981", fontSize: 18 },
  serviceDesc: { color: "#10B981", fontSize: 14 },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    elevation: 10,
  },
  navButtonsContainer: { flexDirection: "row", justifyContent: "space-around", width: "100%" },
  navButton: { flexDirection: "column", alignItems: "center" },
  navIcon: { width: 28, height: 28, tintColor: "#10B981" },
  navText: { fontSize: 10, fontWeight: "bold", marginTop: 4, color: "#10B981" },
});

export default Home;
