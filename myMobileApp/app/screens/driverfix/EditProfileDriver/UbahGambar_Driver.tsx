import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, Alert, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../../hooks/supabaseClient';
// Or create the file at src/database/uploadProfileImage.ts if it does not exist.

// Dummy implementation for getProfileImageUrl, replace with your actual logic as needed
async function getProfileImageUrl(userId: string, role: string): Promise<string | null> {
  // Example: fetch from Supabase storage or your backend
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('foto_url')
      .eq('id', userId)
      .single();
    if (error || !data?.foto_url) return null;
    return data.foto_url;
  } catch {
    return null;
  }
}

// Dummy implementation for uploadProfileImage, replace with your actual logic as needed
async function uploadProfileImage(
  userId: string,
  imageUri: string,
  role: string
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    // Fetch the image as a blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Determine extension safely from blob MIME type (fallback to jpg)
    let ext = 'jpg';
    if (blob && blob.type) {
      const parts = blob.type.split('/');
      if (parts.length === 2 && parts[1]) {
        // strip possible suffixes like "svg+xml"
        ext = parts[1].split('+')[0];
      }
    }

    // Generate a safe filename (no colon/URL parts)
    const fileName = `${userId}_${Date.now()}.${ext}`;
    const filePath = `${role}/${fileName}`;

    // Upload to Supabase Storage - include contentType
    const { data, error } = await supabase.storage
      .from('profile-images')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: blob.type || `image/${ext}`,
      });

    if (error) {
      return { success: false, error: error.message };
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath);

    return {
      success: true,
      imageUrl: publicUrlData?.publicUrl,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' };
  }
}

const UbahGambar_Driver = () => {
  const router = useRouter();
  const { nama, nim, email, userId, profileImageUrl } = useLocalSearchParams();

  const [currentImageUrl, setCurrentImageUrl] = React.useState<string | null>(typeof profileImageUrl === 'string' ? profileImageUrl : null);
  const [selectedImageUri, setSelectedImageUri] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState('');

  React.useEffect(() => { loadProfileImage(); }, []);

  const loadProfileImage = async () => {
    if (userId && typeof userId === 'string') {
      const imageUrl = await getProfileImageUrl(userId, 'driver');
      if (imageUrl) setCurrentImageUrl(imageUrl);
    }
  };

  const handleImageSelect = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission Denied', 'Berikan izin akses galeri'); return; }

      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.8 });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset?.uri) return;
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) { Alert.alert('File Terlalu Besar', 'Maks 5MB'); return; }
      setSelectedImageUri(asset.uri);
    } catch (err) {
      console.error('Image select error', err);
      Alert.alert('Error', 'Gagal memilih gambar');
    }
  };

  const handleApply = async () => {
    if (!selectedImageUri) { router.back(); return; }
    setUploading(true);
    try {
      const res = await uploadProfileImage(userId as string, selectedImageUri, 'driver');
      setUploading(false);
      if (res.success) {
        const oldImageUrl = currentImageUrl;
        setCurrentImageUrl(res.imageUrl || null);
        // Insert into ubahgambar_driver table for logging
        const { error: insertError } = await supabase
          .from('ubahgambar_driver')
          .insert([{
            driver_id: userId,
            foto_lama: oldImageUrl,
            foto_baru: res.imageUrl,
            status: 'Berhasil'
          }]);
        if (insertError) {
          console.error('Insert ubahgambar_driver error', insertError);
          Alert.alert('Error', 'Gagal mencatat perubahan gambar');
          return;
        }
        // update profiles table foto_url (if you want keep sync)
        try {
          const { error } = await supabase.from('profiles').upsert({ id: userId, foto_url: res.imageUrl });
          if (error) console.warn('Upsert profile foto error', error);
        } catch (e) { /* ignore */ }

        setSuccessMessage('Foto berhasil diubah');
        Alert.alert('Sukses', 'Foto profil berhasil diubah', [{ text: 'OK', onPress: () => router.back() }]);
      } else {
        Alert.alert('Gagal Upload', res.error || 'Cek console');
      }
    } catch (err) {
      setUploading(false);
      console.error('Upload error', err);
      Alert.alert('Error', 'Gagal mengunggah gambar');
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.viewBg}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.imageContainer} onPress={() => setShowPreview(true)}>
            <Image source={{ uri: selectedImageUri || currentImageUrl || undefined }} style={styles.image} />
          </TouchableOpacity>

          {!successMessage && (
            <>
              <TouchableOpacity style={styles.pickBtn} onPress={handleImageSelect} disabled={uploading}>
                {uploading ? <ActivityIndicator color="#016837" /> : <Text style={styles.pickText}>Ambil dari gallery 🖼️</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.applyBtn} onPress={handleApply} disabled={uploading}>
                <Text style={styles.applyText}>{uploading ? 'Uploading...' : 'Apply'}</Text>
              </TouchableOpacity>
            </>
          )}

          {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

          <Modal visible={showPreview} transparent animationType="fade" onRequestClose={() => setShowPreview(false)}>
            <View style={styles.previewBg}>
              <TouchableOpacity style={styles.previewBg} onPress={() => setShowPreview(false)}>
                <Image source={{ uri: selectedImageUri || currentImageUrl || undefined }} style={styles.previewImage} resizeMode="contain" />
              </TouchableOpacity>
            </View>
          </Modal>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  viewBg: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, alignItems: 'center', paddingTop: 80 },
  imageContainer: { width: 271, height: 271, borderRadius: 40, borderWidth: 3, borderColor: '#016837', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  pickBtn: { marginTop: 24, borderWidth: 1, borderColor: '#016837', borderRadius: 12, padding: 12, width: 271, alignItems: 'center' },
  pickText: { color: '#5a2736' },
  applyBtn: { marginTop: 16, backgroundColor: '#33cc66', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 21 },
  applyText: { color: '#fff', fontWeight: '700' },
  previewBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  previewImage: { width: '90%', height: '70%' },
  successText: {
    marginTop: 12,
    color: '#016837',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center'
  }
});

export default UbahGambar_Driver;