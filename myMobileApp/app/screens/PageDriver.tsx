import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from 'expo-router';
import { supabase } from '../../hooks/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Order {
  id: string;
  tujuan: string;
  asal: string;
  waktu: string;
  tarif: string;
}

const PageDriver: React.FC = () => {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [loggedInName, setLoggedInName] = useState<string>('');
  const [loggedInNim, setLoggedInNim] = useState<string>('');
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editNim, setEditNim] = useState<string>('');

  const toggleStatus = () => {
    setIsOnline(!isOnline);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      await AsyncStorage.removeItem('nim');
      console.log('✅ Logout berhasil');
    } catch (e) {
      console.error('❌ Sign out error', e);
    } finally {
      router.replace('../screens/Login');
    }
  };

  const fetchDriverByIdOrNim = async (nim?: string) => {
    try {
      setLoadingProfile(true);
      const storedNim = await AsyncStorage.getItem('nim');
      console.log('📦 Stored NIM dari AsyncStorage:', storedNim);

      if (!storedNim) {
        console.log('⚠️ NIM tidak ditemukan di AsyncStorage');
        setLoggedInName('');
        setLoggedInNim('');
        setLoadingProfile(false);
        return;
      }

      const { data: drv, error } = await supabase
        .from('driver')
        .select('nama,nim')
        .eq('nim', storedNim)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching driver by NIM:', error);
        setLoggedInName('');
        setLoggedInNim('');
      } else if (drv) {
        console.log('✅ Driver ditemukan:', drv);
        setLoggedInName(drv.nama || '');
        setLoggedInNim(drv.nim || '');
      } else {
        console.log('⚠️ Driver tidak ditemukan di database dengan NIM:', storedNim);
        setLoggedInName('');
        setLoggedInNim('');
      }
    } catch (e) {
      console.error('Error fetching driver profile:', e);
      setLoggedInName('');
      setLoggedInNim('');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleOpenProfile = () => {
    setEditName(loggedInName);
    setEditNim(loggedInNim);
    setShowProfileModal(true);
  };

  const handleSaveProfile = async () => {
    try {
      const { data: authResp } = await supabase.auth.getUser();
      const me = authResp?.user?.id;

      if (!me) {
        Alert.alert('Error', 'User tidak ditemukan');
        return;
      }

      const { error } = await supabase
        .from('driver')
        .update({ nama: editName.trim(), nim: editNim.trim() })
        .eq('id', me);

      if (error) {
        console.error('❌ Error updating profile:', error);
        Alert.alert('Error', 'Gagal memperbarui profil');
        return;
      }

      // Update AsyncStorage dengan NIM baru
      await AsyncStorage.setItem('nim', editNim.trim());
      
      setLoggedInName(editName.trim());
      setLoggedInNim(editNim.trim());
      setShowProfileModal(false);
      Alert.alert('Sukses', 'Profil berhasil diperbarui');
    } catch (e) {
      console.error('❌ Error saving profile:', e);
      Alert.alert('Error', 'Terjadi kesalahan');
    }
  };

  const handleAmbilPesanan = (order: Order) => {
    console.log('Navigating to AmbilPesanan with order:', order);
    router.push({
      pathname: '../screens/AmbilPesanan',
      params: { 
        orderId: order.id,
        tujuan: order.tujuan,
        asal: order.asal,
        waktu: order.waktu,
        tarif: order.tarif
      }
    });
  };

  const orders: Order[] = [
    {
      id: "1",
      tujuan: "Jl. Slamet Riyadi, Surakarta",
      asal: "UNS Kentingan",
      waktu: "5 menit yang lalu",
      tarif: "Rp 15.000",
    },
    {
      id: "2",
      tujuan: "Jl. Adi Sucipto, Manahan",
      asal: "Jl. Gatot Subroto",
      waktu: "10 menit yang lalu",
      tarif: "Rp 22.000",
    },
  ];

  const renderOrder = ({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>Tujuan:</Text>
        <Text style={styles.text}>{item.tujuan}</Text>
        <Text style={styles.label}>Asal:</Text>
        <Text style={styles.text}>{item.asal}</Text>
        <Text style={styles.time}>{item.waktu}</Text>
      </View>
      <View style={styles.rightSection}>
        <TouchableOpacity
          style={styles.buttonAmbil}
          onPress={() => handleAmbilPesanan(item)}
        >
          <Text style={styles.buttonText}>Ambil</Text>
        </TouchableOpacity>
        <Text style={styles.tarif}>Estimasi Tarif:</Text>
        <Text style={styles.tarifValue}>{item.tarif}</Text>
      </View>
    </View>
  );

  useEffect(() => {
    fetchDriverByIdOrNim();
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.profileButton} onPress={handleOpenProfile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{loggedInName ? loggedInName.charAt(0).toUpperCase() : 'D'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.greeting}>Hi, {loggedInName || 'Driver'}</Text>
            <Text style={styles.subText}>
              {loggedInName ? 'Semangat UnScoot hari ini!' : (loadingProfile ? 'Memuat...' : 'Tap untuk lihat profil')}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleButton,
            { backgroundColor: isOnline ? "#4CAF50" : "#d9534f" },
          ]}
          onPress={toggleStatus}
        >
          <Text style={styles.toggleText}>{isOnline ? "ON" : "OFF"}</Text>
        </TouchableOpacity>
      </View>

      {/* Konten */}
      <View style={styles.content}>
        {!isOnline ? (
          <View style={styles.offContainer}>
            <Image
              source={{
                uri: "https://cdn-icons-png.flaticon.com/512/5756/5756762.png",
              }}
              style={styles.imageOff}
            />
            <Text style={styles.offText}>
              Hidupin dulu biar bisa menerima pesanan
            </Text>
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id}
            renderItem={renderOrder}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>

      {/* Tombol Logout di tengah bawah */}
      <View style={styles.logoutContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Profil */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Profil Driver</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nama</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Masukkan nama"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NIM</Text>
              <TextInput
                style={styles.input}
                value={editNim}
                onChangeText={setEditNim}
                placeholder="Masukkan NIM"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowProfileModal(false)}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveProfile}
              >
                <Text style={styles.saveButtonText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default PageDriver;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F6FA",
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
  },
  profileInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subText: {
    fontSize: 14,
    color: '#777',
  },
  toggleButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  toggleText: {
    color: "#fff",
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  offContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  imageOff: {
    width: 120,
    height: 120,
    marginBottom: 15,
  },
  offText: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  text: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  rightSection: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  buttonAmbil: {
    backgroundColor: "#4CAF50",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  tarif: {
    fontSize: 12,
    color: "#777",
  },
  tarifValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
  },
  logoutContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 10,
    elevation: 3,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});