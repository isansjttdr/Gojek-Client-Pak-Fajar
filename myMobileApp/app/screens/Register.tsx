import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../hooks/supabaseClient";

interface RegisterFormState {
  nim: string;
  nama: string;
  email: string;
  password: string;
  role: "customer" | "driver";
  jenisMotor?: string;
  plat?: string;
}

const Register: React.FC = () => {
  const router = useRouter();
  const [form, setForm] = useState<RegisterFormState>({
    nim: "",
    nama: "",
    email: "",
    password: "",
    role: "customer",
    jenisMotor: "",
    plat: "",
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleChange = (name: keyof RegisterFormState, value: string) => {
    setForm({ ...form, [name]: value });
    setError("");
  };

  const handleSubmit = async () => {
    // Validasi input
    if (!form.nim.trim() || !form.nama.trim() || !form.email.trim() || !form.password.trim()) {
      setError("NIM, Nama, Email, dan Password wajib diisi!");
      Alert.alert("Validasi", "Semua field wajib diisi!");
      return;
    }

    if (form.role === "driver" && (!form.jenisMotor?.trim() || !form.plat?.trim())) {
      setError("Jenis Motor dan Plat wajib diisi untuk driver!");
      Alert.alert("Validasi", "Jenis Motor dan Plat wajib diisi!");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // 1. CEK NIM SUDAH ADA ATAU BELUM DI CUSTOMER ATAU DRIVER
      const { data: existingCustomer } = await supabase
        .from("customer")
        .select("nim")
        .eq("nim", form.nim)
        .maybeSingle();

      const { data: existingDriver } = await supabase
        .from("driver")
        .select("nim")
        .eq("nim", form.nim)
        .maybeSingle();

      if (existingCustomer || existingDriver) {
        setError("NIM sudah terdaftar!");
        Alert.alert("Registrasi Gagal", "NIM ini sudah digunakan untuk registrasi.");
        setLoading(false);
        return;
      }

      // 2. CEK EMAIL SUDAH ADA ATAU BELUM DI AUTH
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { role: form.role, nim: form.nim, nama: form.nama } }, // optional metadata
      });

      if (signUpError) {
        console.error("Supabase signUp error:", signUpError);
        setError(signUpError.message || "Gagal registrasi (cek console).");
        Alert.alert("Registrasi Gagal", signUpError.message || "Email ini sudah digunakan.");
        setLoading(false);
        return;
      }
      const userId = signUpData?.user?.id;
      if (!userId) {
        console.error("signUp returned no user id:", signUpData);
        Alert.alert("Registrasi Gagal", "Tidak mendapatkan user id dari Supabase. Cek dashboard Auth.");
        setLoading(false);
        return;
      }

      // 3. INSERT KE TABEL CUSTOMER ATAU DRIVER
      if (form.role === "customer") {
        const { error: customerError } = await supabase
          .from("customer")
          .insert([
            {
              id: userId,
              nim: form.nim.trim(),
              nama: form.nama.trim(),
              email: form.email.trim(),
              password: form.password.trim(), // NOTE: jika kolom password di DB adalah bigint, ubah tipe kolom ke text/varchar
              nomor_telepon: null,
            },
          ]);

        if (customerError) throw customerError;

        console.log("✅ Customer registered:", form.nama);

        // Simpan ke AsyncStorage
        await AsyncStorage.setItem("nim", form.nim.trim());
        await AsyncStorage.setItem("role", "customer");

        Alert.alert("Sukses", "Registrasi berhasil! Silakan login.");
        router.replace("../screens/Login");
      } else {
        // DRIVER
        const { error: driverError } = await supabase
          .from("driver")
          .insert([
            {
              id: userId,
              nim: form.nim.trim(),
              nama: form.nama.trim(),
              email: form.email.trim(),
              password: form.password.trim(),
              jenis_motor: form.jenisMotor?.trim() || null,
              nomor_plat: form.plat?.trim() || null, // sesuai schema: nomor_plat
              nomor_telepon: null,
            },
          ]);

        if (driverError) throw driverError;

        console.log("✅ Driver registered:", form.nama);

        // Simpan ke AsyncStorage
        await AsyncStorage.setItem("nim", form.nim.trim());
        await AsyncStorage.setItem("role", "driver");

        Alert.alert("Sukses", "Registrasi berhasil! Silakan login.");
        router.replace("../screens/Login");
      }
    } catch (e: any) {
      console.error("❌ Error registrasi:", e);
      setError("Terjadi kesalahan sistem.");
      Alert.alert("Error", e.message || "Terjadi kesalahan saat registrasi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.view}>
        <Text style={styles.title}>
          {form.role === "customer" ? "Daftar sebagai Customer" : "Daftar sebagai Driver"}
        </Text>
        <Text style={styles.subtitle}>Isi data diri kamu dengan benar</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Nama */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Masukkan Nama"
            placeholderTextColor="#c4bfbf"
            value={form.nama}
            onChangeText={(text) => handleChange("nama", text)}
            editable={!loading}
          />
        </View>

        {/* NIM */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Masukkan NIM"
            placeholderTextColor="#c4bfbf"
            value={form.nim}
            onChangeText={(text) => handleChange("nim", text)}
            editable={!loading}
          />
        </View>

        {/* Email */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Masukkan Email"
            placeholderTextColor="#c4bfbf"
            value={form.email}
            onChangeText={(text) => handleChange("email", text)}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        {/* Password */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Masukkan Password"
            placeholderTextColor="#c4bfbf"
            secureTextEntry={!showPassword}
            value={form.password}
            onChangeText={(text) => handleChange("password", text)}
            editable={!loading}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text>{showPassword ? "👁️" : "👁️‍🗨️"}</Text>
          </TouchableOpacity>
        </View>

        {/* Jenis Motor (Driver Only) */}
        {form.role === "driver" && (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Jenis Motor"
              placeholderTextColor="#c4bfbf"
              value={form.jenisMotor}
              onChangeText={(text) => handleChange("jenisMotor", text)}
              editable={!loading}
            />
          </View>
        )}

        {/* Plat Motor (Driver Only) */}
        {form.role === "driver" && (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Nomor Plat Motor"
              placeholderTextColor="#c4bfbf"
              value={form.plat}
              onChangeText={(text) => handleChange("plat", text)}
              editable={!loading}
            />
          </View>
        )}

        {/* Role Toggle */}
        <View style={styles.roleToggle}>
          <TouchableOpacity
            style={[
              styles.roleButton,
              form.role === "customer" && styles.roleButtonActive,
            ]}
            onPress={() => handleChange("role", "customer")}
            disabled={loading}
          >
            <Text
              style={[
                styles.roleButtonText,
                form.role === "customer" && styles.roleButtonTextActive,
              ]}
            >
              Customer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.roleButton,
              form.role === "driver" && styles.roleButtonActive,
            ]}
            onPress={() => handleChange("role", "driver")}
            disabled={loading}
          >
            <Text
              style={[
                styles.roleButtonText,
                form.role === "driver" && styles.roleButtonTextActive,
              ]}
            >
              Driver
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? "Loading..." : "Daftar"}</Text>
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Sudah punya akun?</Text>
          <TouchableOpacity
            onPress={() => !loading && router.replace("../screens/Login")}
          >
            <Text style={styles.loginLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  view: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#4ab100",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  errorText: {
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 16,
    fontWeight: "600",
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: 8,
    width: "100%",
  },
  inputContainer: {
    width: "100%",
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#4ab100",
    marginBottom: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
  },
  input: {
    flex: 1,
    fontSize: 12,
    color: "#000",
    textAlign: "center",
  },
  eyeIcon: {
    padding: 8,
  },
  roleToggle: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 10,
  },
  roleButton: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#4ab100",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  roleButtonActive: {
    backgroundColor: "#4ab100",
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4ab100",
  },
  roleButtonTextActive: {
    color: "#fff",
  },
  button: {
    width: 120,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#4ab100",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  loginContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  loginText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#000",
  },
  loginLink: {
    color: "#4ab100",
    fontSize: 10,
    fontWeight: "700",
  },
});

export default Register;