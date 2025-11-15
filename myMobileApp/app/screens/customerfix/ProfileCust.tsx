import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../hooks/supabaseClient";

interface UserData {
  id: string;
  nim: string;
  nama: string;
  foto_url?: string | null;
  role?: string;
}

const Profile: React.FC = () => {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // edit states
  const [editing, setEditing] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>("");
  const [editNim, setEditNim] = useState<string>("");
  const [editPhotoUrl, setEditPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // image preview modal
  const [showImagePreview, setShowImagePreview] = useState<boolean>(false);

  // change password modal
  const [showChangePassword, setShowChangePassword] = useState<boolean>(false);
  const [oldPassword, setOldPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const storedNim = await AsyncStorage.getItem("nim");
      const storedRole = await AsyncStorage.getItem("role"); // 'customer' atau 'driver'

      if (!storedNim || !storedRole) {
        setUserData(null);
        setLoading(false);
        return;
      }

      const table = storedRole === "driver" ? "driver" : "customer";
      const { data: userDataFromTable, error: tableErr } = await supabase
        .from(table)
        .select("id, nim, nama")
        .eq("nim", storedNim)
        .maybeSingle();

      if (tableErr || !userDataFromTable) {
        setUserData(null);
        setLoading(false);
        return;
      }

      // try get foto_url from profiles (auth user)
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      let profileData: any = null;
      if (userId) {
        const { data: profData } = await supabase
          .from("profiles")
          .select("foto_url")
          .eq("id", userId)
          .maybeSingle();
        profileData = profData;
      }

      setUserData({
        id: userDataFromTable.id || userId || "",
        nim: userDataFromTable.nim || storedNim,
        nama: userDataFromTable.nama || "",
        foto_url: profileData?.foto_url || null,
        role: storedRole,
      });

      setEditName(userDataFromTable.nama || "");
      setEditNim(userDataFromTable.nim || storedNim);
      setEditPhotoUrl(profileData?.foto_url || null);
    } catch (err) {
      console.error("❌ Error loading profile:", err);
    } finally {
      setLoading(false);
    }
  };

  // pick image and upload to Supabase storage -> set editPhotoUrl
  const pickAndUploadImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Izin diperlukan", "Berikan akses galeri untuk mengunggah foto.");
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (res.canceled) return;

      const asset = res.assets?.[0];
      if (!asset?.uri) {
        Alert.alert("Error", "Tidak ada foto dipilih.");
        return;
      }
      const uri = asset.uri;

      setUploadingPhoto(true);

      const response = await fetch(uri);
      const blob = await response.blob();

      const filename = `${(userData?.id || editNim || "anon")}-${Date.now()}`;
      const ext = uri.split(".").pop()?.split("?")[0] || "jpg";
      const path = `${filename}.${ext}`;

      // upload to bucket "avatar" (sesuai bucket Anda)
      const { error: uploadErr } = await supabase.storage
        .from("avatar")
        .upload(path, blob, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: publicData } = supabase.storage.from("avatar").getPublicUrl(path);
      const publicUrl = publicData?.publicUrl || null;
      setEditPhotoUrl(publicUrl);
      Alert.alert("Sukses", "Foto berhasil diunggah.");
    } catch (e: any) {
      console.error("Upload photo error", e);
      Alert.alert("Error", e?.message || "Gagal mengunggah foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!userData?.role || !['customer', 'driver'].includes(userData.role)) {
      Alert.alert('Error', 'Role tidak valid. Silakan login ulang.');
      return;
    }

    setSaving(true);
    try {
      // get auth user id
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      if (!userId) {
        console.warn('⚠️ No auth user ID, skipping profiles insert');
        // still update role table
      } else {
        const payload = {
          id: userId,
          role: userData.role,
          nim: editNim.trim() || userData.nim || null,
          nama: editName.trim() || userData.nama || null,
          foto_url: editPhotoUrl || userData.foto_url || null,
          updated_at: new Date().toISOString(),
        };

        console.log('📤 Upserting profiles payload:', payload);

        const { error } = await supabase
          .from('profiles')
          .upsert([payload], { onConflict: 'id' });

        if (error) {
          console.error('❌ Profiles upsert error:', error);
          throw error;
        }
        console.log('✅ Profiles upsert successful');
      }

      // update name & nim in driver/customer table (required for persistence)
      const table = userData.role === "driver" ? "driver" : "customer";
      const updateData: any = {};
      if (editName.trim()) updateData.nama = editName.trim();
      if (editNim.trim()) updateData.nim = editNim.trim();

      if (Object.keys(updateData).length > 0) {
        console.log('📤 Updating role table:', table, updateData);
        const upd = await supabase.from(table).update(updateData).eq("id", userData.id);
        if (upd.error) {
          console.error('❌ Role table update error:', upd.error);
          throw upd.error;
        }
        console.log('✅ Role table update successful');
      }

      await loadUserData();
      setEditing(false);
      Alert.alert("Sukses", "Profil berhasil diperbarui");
    } catch (err: any) {
      console.error("❌ Error saving profile:", err);
      Alert.alert("Error", err?.message || "Gagal menyimpan profil");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChangePassword = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowChangePassword(true);
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Semua field harus diisi!");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Password baru dan verifikasi password tidak cocok!");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "Password baru minimal 6 karakter!");
      return;
    }

    setSaving(true);
    try {
      // try update Supabase auth password (if session available)
      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData?.user?.id;

      if (authUserId && authUserId === userData?.id) {
        // update auth user password
        const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
        if (updateErr) {
          console.warn("Gagal update auth password:", updateErr);
          // continue to update role table as fallback
        }
      }

      // update password in role table (driver/customer) to keep consistency with existing app logic
      const table = userData?.role === "driver" ? "driver" : "customer";
      const upd = await supabase.from(table).update({ password: newPassword }).eq("id", userData?.id);
      if (upd.error) {
        console.warn("Gagal update password di tabel role:", upd.error);
        // still notify user about success of auth update if any
        Alert.alert("Perhatian", "Gagal menyimpan password ke tabel lokal. Cek console.");
      } else {
        Alert.alert("Sukses", "Password berhasil diubah!");
        setShowChangePassword(false);
      }
    } catch (err: any) {
      console.error("❌ Error change password:", err);
      Alert.alert("Error", err?.message || "Gagal mengubah password");
    } finally {
      setSaving(false);
    }
  };

  // <-- ADDED: centralized sign out handler
  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Apakah Anda yakin ingin keluar?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Keluar",
          onPress: async () => {
            try {
              // sign out Supabase auth session (if any)
              try {
                await supabase.auth.signOut();
              } catch (e) {
                // non-fatal — continue clearing local session
                console.warn("Supabase signOut error:", e);
              }

              // remove local session keys
              await AsyncStorage.multiRemove(['userSession', 'nim', 'role']);

              // navigate to auth login screen (replace so user cannot go back)
              router.replace('/screens/Login');
            } catch (err) {
              console.error("Sign out failed:", err);
              Alert.alert("Error", "Gagal keluar. Coba lagi.");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#016837" />
        <Text style={{ color: "#016837", marginTop: 10 }}>Memuat data...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Back */}
        <TouchableOpacity style={styles.backWrapper} onPress={() => router.back()} activeOpacity={0.8}>
          <View style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </View>
        </TouchableOpacity>

        {/* Profile box */}
        <View style={styles.profileBox}>
          <TouchableOpacity
            style={styles.imageContainer}
            onPress={() => setShowImagePreview(true)}
            activeOpacity={0.9}
          >
            <Image
              source={{
                uri: editPhotoUrl || userData?.foto_url || require("../../../assets/images/Passenger.png") as any,
              }}
              style={styles.avatarBig}
            />
            <Text style={styles.profileTitle}>Profile Account</Text>
            <TouchableOpacity
              onPress={pickAndUploadImage}
              style={styles.editImageBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.editIconText}>✏️</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        {/* Fields */}
        <View style={styles.fieldWrapper}>
          <View style={styles.field}>
            <Text style={styles.fieldText}>{userData?.nim || "NIM"}</Text>
          </View>

          <View style={[styles.field, { marginTop: 18 }]}>
            <Text style={styles.fieldText}>{userData?.nama || "Nama"}</Text>
          </View>

          <View style={[styles.field, { marginTop: 18, flexDirection: "row", alignItems: "center" }]}>
            <Text style={styles.fieldText}>Password</Text>
            <TouchableOpacity style={styles.editFieldBtn} onPress={handleOpenChangePassword}>
              <Text style={styles.editIconText}>✏️</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom navigation (visual only, keep handlers) */}
        <View style={styles.bottomNavBg} />
        <TouchableOpacity style={styles.navBtnLeft} onPress={() => router.replace({ pathname: '/screens/customerfix/PageCustomer', params: { nama: userData?.nama, nim: userData?.nim, userId: userData?.id, profileImageUrl: editPhotoUrl }})}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Beranda</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtnCenter} onPress={() => router.replace({ pathname: '/screens/customerfix/Riwayat_Customer', params: { nama: userData?.nama, nim: userData?.nim, userId: userData?.id, profileImageUrl: editPhotoUrl }})}>
          <Text style={styles.navIcon}>🕐</Text>
          <Text style={styles.navLabel}>Riwayat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtnRight} onPress={() => router.replace({ pathname: '/screens/customerfix/TermsAndConditionCustomer', params: { nama: userData?.nama, nim: userData?.nim, userId: userData?.id, profileImageUrl: editPhotoUrl }})}>
          <Text style={styles.navIcon}>📋</Text>
          <Text style={styles.navLabel}>Terms n Cond</Text>
        </TouchableOpacity>

        {/* Image Preview Modal */}
        <Modal visible={showImagePreview} transparent={true} animationType="fade" onRequestClose={() => setShowImagePreview(false)}>
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowImagePreview(false)} activeOpacity={1}>
              <Image
                source={{ uri: editPhotoUrl || userData?.foto_url || "https://cdn-icons-png.flaticon.com/512/847/847969.png" }}
                style={styles.previewFull}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </Modal>

        {/* Change Password Modal */}
        <Modal visible={showChangePassword} transparent={true} animationType="slide" onRequestClose={() => setShowChangePassword(false)}>
          <View style={styles.changePwdOverlay}>
            <View style={styles.changePwdContainer}>
              <Text style={styles.changePwdTitle}>Ubah Password</Text>

              <Text style={styles.changePwdLabel}>Password Lama</Text>
              <TextInput style={styles.changePwdInput} secureTextEntry value={oldPassword} onChangeText={setOldPassword} />

              <Text style={[styles.changePwdLabel, { marginTop: 10 }]}>Password Baru</Text>
              <TextInput style={styles.changePwdInput} secureTextEntry value={newPassword} onChangeText={setNewPassword} />

              <Text style={[styles.changePwdLabel, { marginTop: 10 }]}>Verifikasi Password</Text>
              <TextInput style={styles.changePwdInput} secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />

              <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 18 }}>
                <TouchableOpacity onPress={() => setShowChangePassword(false)} style={[styles.actionButton, { backgroundColor: "#E5E7EB", marginRight: 8 }]}>
                  <Text style={{ color: "#374151", fontWeight: "600" }}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleChangePassword} style={[styles.actionButton, { backgroundColor: "#016837" }]}>
                  <Text style={{ color: "#fff", fontWeight: "600" }}>{saving ? "Menyimpan..." : "Simpan"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    paddingBottom: 120,
  },
  backWrapper: {
    position: "absolute",
    top: 32,
    left: 18,
    zIndex: 10,
  },
  backBtn: {
    width: 49,
    height: 47,
    borderRadius: 25,
    backgroundColor: "#33cc66",
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.95,
  },
  backIcon: {
    fontSize: 26,
    color: "#fff",
    fontWeight: "700",
  },
  profileBox: {
    width: "100%",
    alignItems: "center",
    marginTop: 80,
  },
  imageContainer: {
    alignItems: "center",
    width: 325,
    height: 110,
    borderColor: "#016837",
    borderRadius: 26,
    borderWidth: 1,
    paddingVertical: 10,
    position: "relative",
    backgroundColor: "#fff",
  },
  avatarBig: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginTop: -40,
    borderWidth: 3,
    borderColor: "#016837",
    backgroundColor: "#f5f5f5",
  },
  profileTitle: {
    marginTop: 6,
    fontSize: 20,
    color: "#5a2736",
    fontWeight: "700",
  },
  editImageBtn: {
    position: "absolute",
    right: 14,
    top: 12,
  },
  editIconText: {
    fontSize: 20,
  },
  fieldWrapper: {
    width: "100%",
    alignItems: "center",
    marginTop: 28,
  },
  field: {
    width: 325,
    height: 65,
    borderColor: "#016837",
    borderRadius: 26,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  fieldText: {
    textAlign: "center",
    fontSize: 18,
    color: "#5a2736",
    fontWeight: "700",
  },
  editFieldBtn: {
    position: "absolute",
    right: 18,
  },
  signOutButton: {
    width: 325,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#ff4444",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
  },
  signOutText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  bottomNavBg: {
    position: "absolute",
    bottom: 12,
    left: 18,
    width: 108,
    height: 71,
    borderRadius: 18,
    backgroundColor: "#d2ffde",
  },
  navBtnLeft: {
    position: "absolute",
    bottom: 18,
    left: 63,
    alignItems: "center",
  },
  navBtnCenter: {
    position: "absolute",
    bottom: 18,
    left: 185,
    alignItems: "center",
  },
  navBtnRight: {
    position: "absolute",
    bottom: 18,
    left: 307,
    alignItems: "center",
  },
  navIcon: {
    fontSize: 28,
  },
  navLabel: {
    color: "#016837",
    fontSize: 10,
    marginTop: 4,
  },

  // modal preview
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  previewFull: {
    width: "90%",
    height: "70%",
  },

  // change password modal
  changePwdOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  changePwdContainer: {
    width: 325,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  changePwdTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#016837",
    marginBottom: 12,
    textAlign: "center",
  },
  changePwdLabel: {
    color: "#065F46",
    fontWeight: "700",
    marginBottom: 6,
  },
  changePwdInput: {
    height: 44,
    borderColor: "#D1FAE5",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
export default Profile;
