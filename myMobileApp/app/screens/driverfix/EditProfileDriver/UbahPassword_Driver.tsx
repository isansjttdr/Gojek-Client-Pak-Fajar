import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../../hooks/supabaseClient';

const UbahPassword_Driver = () => {
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const [passwordLama, setPasswordLama] = React.useState('');
  const [passwordBaru, setPasswordBaru] = React.useState('');
  const [verifikasiPassword, setVerifikasiPassword] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState('');

  const handleSavePassword = async () => {
    if (!passwordLama || !passwordBaru || !verifikasiPassword) {
      Alert.alert('Error', 'Semua field harus diisi!');
      return;
    }
    if (passwordBaru !== verifikasiPassword) {
      Alert.alert('Error', 'Password baru dan verifikasi tidak cocok!');
      return;
    }
    if (passwordBaru.length < 6) {
      Alert.alert('Error', 'Password minimal 6 karakter!');
      return;
    }

    setSaving(true);
    try {
      // Insert into ubahpassword_driver table for logging
      const { error: insertError } = await supabase
        .from('ubahpassword_driver')
        .insert([{
          driver_id: userId,
          password_lama: passwordLama,
          password_baru: passwordBaru,
          status: 'Berhasil'
        }]);
      if (insertError) {
        console.error('Insert ubahpassword_driver error', insertError);
        Alert.alert('Error', 'Gagal mencatat perubahan password');
        return;
      }

      // Try update Supabase auth if current session matches userId
      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData?.user?.id;
      if (authUserId && authUserId === (userId as string)) {
        const { error: updErr } = await supabase.auth.updateUser({ password: passwordBaru });
        if (updErr) {
          console.warn('Auth update password failed', updErr);
        }
      }

      // Update driver table password as app expects
      const { error } = await supabase.from('driver').update({ password: passwordBaru }).eq('id', userId);
      if (error) {
        console.error('Update driver password error', error);
        Alert.alert('Error', 'Gagal menyimpan password ke tabel driver');
      } else {
        setSuccessMessage('Password berhasil diubah');
        Alert.alert('Sukses', 'Password berhasil diubah', [{ text: 'OK', onPress: () => router.back() }]);
      }
    } catch (err: any) {
      console.error('Change password error', err);
      Alert.alert('Error', err?.message || 'Gagal mengubah password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.viewBg}>
        <View style={styles.container}>
          <Text style={styles.title}>Ubah Password</Text>
          {!successMessage && (
            <>
              <TextInput placeholder="Password Lama" secureTextEntry value={passwordLama} onChangeText={setPasswordLama} style={styles.input} />
              <TextInput placeholder="Password Baru" secureTextEntry value={passwordBaru} onChangeText={setPasswordBaru} style={styles.input} />
              <TextInput placeholder="Verifikasi Password" secureTextEntry value={verifikasiPassword} onChangeText={setVerifikasiPassword} style={styles.input} />
              <TouchableOpacity style={[styles.btn, saving && { opacity: 0.7 }]} onPress={handleSavePassword} disabled={saving}>
                <Text style={styles.btnText}>{saving ? 'Menyimpan...' : 'Simpan'}</Text>
              </TouchableOpacity>
            </>
          )}
          {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  viewBg: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20, marginTop: 40 },
  title: { fontSize: 20, color: '#016837', fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  input: { height: 48, borderWidth: 1, borderColor: '#16a34a', borderRadius: 8, paddingHorizontal: 12, marginBottom: 12 },
  btn: { backgroundColor: '#016837', height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  successText: {
    marginTop: 12,
    color: '#016837',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center'
  }
});

export default UbahPassword_Driver;