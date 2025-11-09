import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../hooks/supabaseClient";  // sesuaikan path-nya

const Logout: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Hapus sesi login dari Supabase
        await supabase.auth.signOut();

        // Arahkan ke halaman Login
        router.replace("../screens/Login");
      } catch (error) {
        console.error("Gagal logout:", error);
      }
    };

    handleLogout();
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007BFF" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});

export default Logout;
