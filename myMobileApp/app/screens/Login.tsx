import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../hooks/supabaseClient";
import { LoginFormState } from '../../src/types';

const Login: React.FC = () => {
  const router = useRouter(); 
  const [form, setForm] = useState<LoginFormState>({ nim: "", password: "" });
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleChange = (name: keyof LoginFormState, value: string) => {
    setForm({ ...form, [name]: value });
    setError("");
  };

  const handleSubmit = async () => {
    if (!form.nim.trim() || !form.password.trim()) {
      setError("NIM dan Password harus diisi!");
      Alert.alert("Validasi", "NIM dan Password harus diisi!");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // 1) cek customer
      const { data: customerData, error: customerError } = await supabase
        .from("customer")
        .select("id, nim, nama, nomor_telepon, email, password")
        .eq("nim", form.nim.trim())
        .eq("password", form.password)
        .maybeSingle();

      if (customerError) {
        console.warn("Supabase customer query error:", customerError);
      }

      if (customerData) {
        // ambil foto profil (jika ada) dari tabel profiles
        let profileImageUrl: string | null = null;
        try {
          const { data: prof } = await supabase.from("profiles").select("foto_url").eq("id", customerData.id).maybeSingle();
          profileImageUrl = prof?.foto_url || null;
        } catch (e) { /* ignore */ }

        // simpan session lokal
        const session = {
          role: "customer",
          userId: customerData.id,
          nama: customerData.nama,
          nim: customerData.nim,
          email: customerData.email || null,
          profileImageUrl,
        };
        await AsyncStorage.setItem("nim", customerData.nim);
        await AsyncStorage.setItem("role", "customer");
        await AsyncStorage.setItem("userSession", JSON.stringify({ params: session }));

        // arahkan ke PageCustomer
        router.replace({
          pathname: "/screens/customerfix/PageCustomer",
          params: {
            userId: customerData.id,
            nama: customerData.nama,
            nim: customerData.nim,
            profileImageUrl,
          },
        });

        setLoading(false);
        return;
      }

      // 2) cek driver
      const { data: driverData, error: driverError } = await supabase
        .from("driver")
        .select("id, nim, nama, nomor_telepon, email, password")
        .eq("nim", form.nim.trim())
        .eq("password", form.password)
        .maybeSingle();

      if (driverError) {
        console.warn("Supabase driver query error:", driverError);
      }

      if (driverData) {
        // ambil foto profil (jika ada)
        let profileImageUrl: string | null = null;
        try {
          const { data: prof } = await supabase.from("profiles").select("foto_url").eq("id", driverData.id).maybeSingle();
          profileImageUrl = prof?.foto_url || null;
        } catch (e) { /* ignore */ }

        const session = {
          role: "driver",
          userId: driverData.id,
          nama: driverData.nama,
          nim: driverData.nim,
          email: driverData.email || null,
          profileImageUrl,
        };
        await AsyncStorage.setItem("nim", driverData.nim);
        await AsyncStorage.setItem("role", "driver");
        await AsyncStorage.setItem("userSession", JSON.stringify({ params: session }));

        // arahkan ke HomeDriver (folder driverfix)
        router.replace({
          pathname: "/screens/driverfix/HomeDriver",
          params: {
            userId: driverData.id,
            nama: driverData.nama,
            nim: driverData.nim,
            profileImageUrl,
          }
        });

        setLoading(false);
        return;
      }

      // tidak ditemukan
      setError("Login gagal! NIM atau password salah.");
      Alert.alert("Login Gagal", "NIM atau password yang Anda masukkan salah.");
    } catch (e: any) {
      console.error("❌ Error login:", e);
      setError("Terjadi kesalahan sistem.");
      Alert.alert("Error", e.message || "Terjadi kesalahan saat login.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.view}>
        <Text style={styles.title}>🛴 Login UnScoot</Text>
        <Text style={styles.subtitle}>Masuk sebagai Driver atau Customer</Text>
        
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Masukkan NIM"
            placeholderTextColor="#c4bfbf"
            value={form.nim}
            onChangeText={(text) => handleChange("nim", text)} 
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Masukkan Password"
            placeholderTextColor="#c4bfbf"
            value={form.password}
            onChangeText={(text) => handleChange("password", text)}
            secureTextEntry={!showPassword}
            editable={!loading}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text>{showPassword ? "👁️" : "👁️‍🗨️"}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Memproses..." : "Login"}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.registerLink}>
          <Text style={styles.registerText}>
            Belum punya akun?{" "}
            <Text 
              style={styles.registerLinkText} 
              onPress={() => !loading && router.replace('/screens/Register')}
            >
              Daftar
            </Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    padding: 20 
  },
  view: {
    width: '100%',
    alignItems: 'center',
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#4ab100', 
    textAlign: 'center', 
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorText: { 
    color: '#EF4444', 
    textAlign: 'center', 
    marginBottom: 16, 
    fontWeight: '600',
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    width: '100%',
  },
  inputContainer: { 
    width: '100%',
    height: 50,
    borderColor: '#4ab100', 
    borderWidth: 1.5, 
    marginBottom: 12, 
    borderRadius: 25, 
    backgroundColor: '#F9FAFB',
    flexDirection: 'row',
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: { 
    flex: 1,
    fontSize: 12,
    color: '#000',
    textAlign: 'center',
  },
  eyeIcon: {
    padding: 8,
  },
  button: { 
    backgroundColor: '#4ab100', 
    paddingVertical: 12, 
    paddingHorizontal: 32,
    borderRadius: 25, 
    alignItems: 'center', 
    marginTop: 16,
    width: 120,
    height: 40,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: { 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 14,
  },
  registerLink: { 
    marginTop: 20, 
    alignItems: 'center', 
    flexDirection: 'row',
    gap: 4,
  },
  registerText: { 
    color: '#6B7280', 
    fontWeight: '600',
    fontSize: 12,
  },
  registerLinkText: { 
    color: '#4ab100', 
    fontWeight: 'bold',
  }
});

export default Login;