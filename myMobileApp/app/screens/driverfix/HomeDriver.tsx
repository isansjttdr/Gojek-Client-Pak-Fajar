import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../hooks/supabaseClient'; // Sesuaikan path

interface ScootRideOrder {
  id_scoot_ride: number;
  id_customer: string;
  id_driver: string;
  lokasi_jemput: string;
  lokasi_tujuan: string;
  tarif: number;
  status: string;
}

interface ScootFoodOrder {
  id_scoot_food: number;
  id_customer: string;
  id_driver: string;
  lokasi_resto: string;
  lokasi_tujuan: string;
  detail_pesanan: string;
  ongkir: number;
  status: string;
}

interface ScootSendOrder {
  id_scoot_send: number;
  id_customer: string;
  id_driver: string;
  lokasi_jemput_barang: string;
  lokasi_tujuan: string;
  nama_penerima: string;
  berat: number;
  kategori_barang: string;
  tarif: number;
  status: string;
}

const HomeDriver = () => {
  const { nama, nim, email, jenisMotor, plat, userId, profileImageUrl } = useLocalSearchParams();
  const router = useRouter();
  const displayName = nama || 'Nicholas';

  const [currentImageUrl, setCurrentImageUrl] = React.useState<string | null>(
    typeof profileImageUrl === 'string' ? profileImageUrl : null
  );
  const [showPreview, setShowPreview] = React.useState(false);
  
  // 🔥 State untuk toggle dan pesanan aktif
  const [isOrderActive, setIsOrderActive] = React.useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = React.useState(false);
  
  // State untuk masing-masing layanan
  const [rideOrder, setRideOrder] = React.useState<ScootRideOrder | null>(null);
  const [foodOrder, setFoodOrder] = React.useState<ScootFoodOrder | null>(null);
  const [sendOrder, setSendOrder] = React.useState<ScootSendOrder | null>(null);

  // new: arrays to hold all on-progress orders (keperluan tampilan multiple)
  const [rideOrders, setRideOrders] = React.useState<ScootRideOrder[]>([]);
  const [foodOrders, setFoodOrders] = React.useState<ScootFoodOrder[]>([]);
  const [sendOrders, setSendOrders] = React.useState<ScootSendOrder[]>([]);

  const scootRideImage = require('../../../assets/images/ScootRide.png');
  const scootFoodImage = require('../../../assets/images/ScootFood.png');
  const scootSendImage = require('../../../assets/images/ScootSend.png');

  // Handle tombol back Android - close app saat di Home
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        BackHandler.exitApp();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [])
  );

  // Buat object params untuk pass ke semua screen
  const userParams = {
    nama: nama || '',
    nim: nim || '',
    email: email || '',
    jenisMotor: jenisMotor || '',
    plat: plat || '',
    userId: userId || '',
    profileImageUrl: currentImageUrl || ''
  };

  // 🔍 Fetch SEMUA pesanan aktif dari 3 tabel
  const fetchAllActiveOrders = React.useCallback(async () => {
    if (!userId) {
      console.warn('⚠️ User ID tidak tersedia');
      return;
    }

    try {
      setIsLoadingOrders(true);
      console.log('🔍 Fetching all active orders for driver:', userId);

      // Query ScootRide (ambil semua on progress untuk driver)
      const { data: rideData, error: rideError } = await supabase
        .from('scoot_ride')
        .select('id_scoot_ride, id_customer, id_driver, lokasi_jemput, lokasi_tujuan, tarif, status')
        .eq('id_driver', userId)
        .eq('status', 'on progress')
        .order('timestamp', { ascending: false });

      if (rideError) {
        console.error('❌ Error fetching ScootRide:', rideError);
      } else {
        // set array + singel-first for backwards compatibility
        setRideOrders(rideData ?? []);
        setRideOrder(Array.isArray(rideData) && rideData.length > 0 ? rideData[0] : null);
        console.log('✅ ScootRide order:', rideData ? 'Found' : 'Not found');
      }

      // Query ScootFood (ambil semua on progress untuk driver)
      const { data: foodData, error: foodError } = await supabase
        .from('scoot_food')
        .select('id_scoot_food, id_customer, id_driver, lokasi_resto, lokasi_tujuan, detail_pesanan, ongkir, status')
        .eq('id_driver', userId)
        .eq('status', 'on progress')
        .order('timestamp', { ascending: false });

      if (foodError) {
        console.error('❌ Error fetching ScootFood:', foodError);
      } else {
        setFoodOrders(foodData ?? []);
        setFoodOrder(Array.isArray(foodData) && foodData.length > 0 ? foodData[0] : null);
        console.log('✅ ScootFood order:', foodData ? 'Found' : 'Not found');
      }

      // Query ScootSend (ambil semua on progress untuk driver)
      const { data: sendData, error: sendError } = await supabase
        .from('scoot_send')
        .select('id_scoot_send, id_customer, id_driver, lokasi_jemput_barang, lokasi_tujuan, nama_penerima, berat, kategori_barang, tarif, status')
        .eq('id_driver', userId)
        .eq('status', 'on progress')
        .order('timestamp', { ascending: false });

      if (sendError) {
        console.error('❌ Error fetching ScootSend:', sendError);
      } else {
        setSendOrders(sendData ?? []);
        setSendOrder(Array.isArray(sendData) && sendData.length > 0 ? sendData[0] : null);
        console.log('✅ ScootSend order:', sendData ? 'Found' : 'Not found');
      }

    } catch (err) {
      console.error('❌ Error fetching orders:', err);
      Alert.alert('Error', 'Gagal memuat pesanan aktif');
    } finally {
      setIsLoadingOrders(false);
    }
  }, [userId]);

  // Toggle handler
  const handleToggleOrders = async (value: boolean) => {
    setIsOrderActive(value);
    
    if (value) {
      await fetchAllActiveOrders();
    } else {
      // Reset semua order
      setRideOrder(null);
      setFoodOrder(null);
      setSendOrder(null);
    }
  };

  // Navigation handlers untuk default cards
  const handleScootRide = () => {
    router.push({
      pathname: '/screens/driverfix/ScootRideDriver/Daftar_Pesanan_ScootRide_Off',
      params: userParams
    });
  };

  const handleScootFood = () => {
    router.push({
      pathname: '/screens/driverfix/ScootFoodDriver/Daftar_Pesanan_ScootFood_Off',
      params: userParams
    });
  };

  const handleScootSend = () => {
    router.push({
      pathname: '/screens/driverfix/ScootSendDriver/Daftar_Pesanan_ScootSend_Off',
      params: userParams
    });
  };

  const handleEditProfile = () => {
    router.push({
      pathname: '/screens/driverfix/EditProfileDriver/EditProfile_Driver',
      params: userParams
    });
  };

  const handleRiwayat = () => {
    router.replace({
      pathname: '/screens/driverfix/Riwayat_Driver',
      params: userParams
    });
  };

  const handleTerms = () => {
    router.replace({
      pathname: '/screens/driverfix/TermsAndConditionDriver',
      params: userParams
    });
  };

  //  Chat handlers untuk masing-masing layanan
  const handleChatRide = () => {
    if (!rideOrder) {
      Alert.alert('Info', 'Tidak ada pesanan ScootRide aktif');
      return;
    }

    router.push({
      pathname: '/screens/driverfix/ScootRideDriver/HalamanChat_Ride_Driver',
      params: {
        orderId: rideOrder.id_scoot_ride.toString(),
        customerId: rideOrder.id_customer,
        driverId: rideOrder.id_driver,
        ...userParams
      }
    });
  };

  const handleChatFood = () => {
    if (!foodOrder) {
      Alert.alert('Info', 'Tidak ada pesanan ScootFood aktif');
      return;
    }

    router.push({
      pathname: '/screens/driverfix/ScootFoodDriver/HalamanChat_Food_Driver',
      params: {
        orderId: foodOrder.id_scoot_food.toString(),
        customerId: foodOrder.id_customer,
        driverId: foodOrder.id_driver,
        ...userParams
      }
    });
  };

  const handleChatSend = () => {
    if (!sendOrder) {
      Alert.alert('Info', 'Tidak ada pesanan ScootSend aktif');
      return;
    }

    router.push({
      pathname: '/screens/driverfix/ScootSendDriver/HalamanChat_Send_Driver',
      params: {
        orderId: sendOrder.id_scoot_send.toString(),
        customerId: sendOrder.id_customer,
        driverId: sendOrder.id_driver,
        ...userParams
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={() => setShowPreview(true)}
            activeOpacity={0.8}
          >
            {currentImageUrl ? (
              <Image
                source={{ uri: currentImageUrl }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <Image
                source={require('../../../assets/images/driver.png')}
                style={styles.avatar}
                resizeMode="cover"
              />
            )}
          </TouchableOpacity>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>Hai, {displayName}!</Text>
            <Text style={styles.subGreeting}>Semangat ngeUnScoot hari ini</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={handleEditProfile}
              activeOpacity={0.7}
            >
              <Text style={styles.editText}>Edit Profil</Text>
            </TouchableOpacity>
          </View>
        </View> 

        {/* 🔥 TOGGLE SECTION */}
        <View style={styles.toggleSection}>
          <Text style={styles.toggleTitle}></Text>
          <View style={styles.toggleWrapper}>
            <Text style={styles.toggleLabel}>{isOrderActive ? 'ON' : 'OFF'}</Text>
            <Switch
              value={isOrderActive}
              onValueChange={handleToggleOrders}
              trackColor={{ false: '#d0d0d0', true: '#4CAF50' }}
              thumbColor={isOrderActive ? '#016837' : '#f4f3f4'}
              ios_backgroundColor="#d0d0d0"
            />
          </View>
        </View>

        {/* Loading State */}
        {isLoadingOrders && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#016837" />
            <Text style={styles.loadingText}>Memuat pesanan aktif...</Text>
          </View>
        )}

        {/* CONDITIONAL RENDERING */}
        {isOrderActive && !isLoadingOrders ? (
          // ==================== TAMPILKAN PESANAN AKTIF ====================
          <View style={styles.ordersContainer}>
            
            {/* 🚗 SCOOTRIDE SECTION */}
            <View style={styles.serviceSection}>
              <Text style={styles.serviceSectionTitle}>🚗 ScootRide - Pesanan Aktif</Text>
              {rideOrders && rideOrders.length > 0 ? (
                rideOrders.map((r) => (
                  <View style={styles.orderCard} key={r.id_scoot_ride}>
                    <View style={styles.orderRow}>
                      <Text style={styles.orderLabel}>📍 Lokasi Jemput:</Text>
                      <Text style={styles.orderValue}>{r.lokasi_jemput}</Text>
                    </View>
                    <View style={styles.orderRow}>
                      <Text style={styles.orderLabel}>📍 Lokasi Tujuan:</Text>
                      <Text style={styles.orderValue}>{r.lokasi_tujuan}</Text>
                    </View>
                    <View style={styles.orderRow}>
                      <Text style={styles.orderLabel}>💰 Tarif:</Text>
                      <Text style={styles.orderValue}>Rp {Number(r.tarif).toLocaleString('id-ID')}</Text>
                    </View>
                    <View style={[styles.orderRow, { borderBottomWidth: 0, marginBottom: 0 }]}>
                      <Text style={styles.orderLabel}>📊 Status:</Text>
                      <Text style={[styles.orderValue, { color: '#FF9500', fontWeight: '700' }]}>{r.status}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.chatButton}
                      onPress={() =>
                        router.push({
                          pathname: '/screens/driverfix/ScootRideDriver/HalamanChat_Ride_Driver',
                          params: {
                            orderId: r.id_scoot_ride.toString(),
                            customerId: r.id_customer,
                            driverId: r.id_driver,
                            ...userParams
                          }
                        })
                      }
                      activeOpacity={0.8}
                    >
                      <Text style={styles.chatButtonIcon}></Text>
                      <Text style={styles.chatButtonText}>Chat dengan Customer</Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                 <View style={styles.emptyCard}>
                   <Text style={styles.emptyEmoji}>📦</Text>
                   <Text style={styles.emptyText}>null woi tabelnya</Text>
                   <Text style={styles.emptySubtext}>Tidak ada pesanan ScootRide aktif</Text>
                 </View>
              )}
            </View>

            {/* SPASI */}
            <View style={styles.spacer} />

            {/* 🍔 SCOOTFOOD SECTION */}
            <View style={styles.serviceSection}>
              <Text style={styles.serviceSectionTitle}>ScootFood - Pesanan Aktif</Text>
              {foodOrders && foodOrders.length > 0 ? (
                foodOrders.map((f) => (
                  <View style={styles.orderCard} key={f.id_scoot_food}>
                    <View style={styles.orderRow}>
                      <Text style={styles.orderLabel}>📍 Lokasi Resto:</Text>
                      <Text style={styles.orderValue}>{f.lokasi_resto}</Text>
                    </View>
                    <View style={styles.orderRow}>
                      <Text style={styles.orderLabel}>📍 Lokasi Tujuan:</Text>
                      <Text style={styles.orderValue}>{f.lokasi_tujuan}</Text>
                    </View>
                    <View style={styles.orderRow}>
                      <Text style={styles.orderLabel}>🍽️ Detail Pesanan:</Text>
                      <Text style={styles.orderValue}>{f.detail_pesanan}</Text>
                    </View>
                    <View style={styles.orderRow}>
                      <Text style={styles.orderLabel}>💰 Ongkir:</Text>
                      <Text style={styles.orderValue}>Rp {Number(f.ongkir).toLocaleString('id-ID')}</Text>
                    </View>
                    <View style={[styles.orderRow, { borderBottomWidth: 0, marginBottom: 0 }]}>
                      <Text style={styles.orderLabel}>📊 Status:</Text>
                      <Text style={[styles.orderValue, { color: '#FF9500', fontWeight: '700' }]}>{f.status}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.chatButton}
                      onPress={() =>
                        router.push({
                          pathname: '/screens/driverfix/ScootFoodDriver/HalamanChat_Food_Driver',
                          params: {
                            orderId: f.id_scoot_food.toString(),
                            customerId: f.id_customer,
                            driverId: f.id_driver,
                            ...userParams
                          }
                        })
                      }
                      activeOpacity={0.8}
                    >
                      <Text style={styles.chatButtonIcon}></Text>
                      <Text style={styles.chatButtonText}>Chat dengan Customer</Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                 <View style={styles.emptyCard}>
                   <Text style={styles.emptyEmoji}>📦</Text>
                   <Text style={styles.emptyText}>null woi tabelnya</Text>
                   <Text style={styles.emptySubtext}>Tidak ada pesanan ScootFood aktif</Text>
                 </View>
              )}
            </View>

            {/* SPASI */}
            <View style={styles.spacer} />

            {/* 📦 SCOOTSEND SECTION */}
            <View style={styles.serviceSection}>
              <Text style={styles.serviceSectionTitle}>📦 ScootSend - Pesanan Aktif</Text>
              {sendOrders && sendOrders.length > 0 ? (
                sendOrders.map((s) => (
                  <View style={styles.orderCard} key={s.id_scoot_send}>
                    <View style={styles.orderRow}>
                      <Text style={styles.orderLabel}>📍 Lokasi Jemput Barang:</Text>
                      <Text style={styles.orderValue}>{s.lokasi_jemput_barang}</Text>
                    </View>
                    <View style={styles.orderRow}>
                      <Text style={styles.orderLabel}>📍 Lokasi Tujuan:</Text>
                      <Text style={styles.orderValue}>{s.lokasi_tujuan}</Text>
                    </View>
                    <View style={styles.orderRow}>
                      <Text style={styles.orderLabel}>👤 Nama Penerima:</Text>
                      <Text style={styles.orderValue}>{s.nama_penerima}</Text>
                    </View>
                    <View style={styles.orderRow}>
                      <Text style={styles.orderLabel}>⚖️ Berat:</Text>
                      <Text style={styles.orderValue}>{Number(s.berat).toFixed(2)} kg</Text>
                    </View>
                    <View style={styles.orderRow}>
                      <Text style={styles.orderLabel}>📦 Kategori Barang:</Text>
                      <Text style={styles.orderValue}>{s.kategori_barang}</Text>
                    </View>
                    <View style={styles.orderRow}>
                      <Text style={styles.orderLabel}>💰 Tarif:</Text>
                      <Text style={styles.orderValue}>Rp {Number(s.tarif).toLocaleString('id-ID')}</Text>
                    </View>
                    <View style={[styles.orderRow, { borderBottomWidth: 0, marginBottom: 0 }]}>
                      <Text style={styles.orderLabel}>📊 Status:</Text>
                      <Text style={[styles.orderValue, { color: '#FF9500', fontWeight: '700' }]}>{s.status}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.chatButton}
                      onPress={() =>
                        router.push({
                          pathname: '/screens/driverfix/ScootSendDriver/HalamanChat_Send_Driver',
                          params: {
                            orderId: s.id_scoot_send.toString(),
                            customerId: s.id_customer,
                            driverId: s.id_driver,
                            ...userParams
                          }
                        })
                      }
                      activeOpacity={0.8}
                    >
                      <Text style={styles.chatButtonIcon}></Text>
                      <Text style={styles.chatButtonText}>Chat dengan Customer</Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                 <View style={styles.emptyCard}>
                   <Text style={styles.emptyEmoji}>📦</Text>
                   <Text style={styles.emptyText}>null woi tabelnya</Text>
                   <Text style={styles.emptySubtext}>Tidak ada pesanan ScootSend aktif</Text>
                 </View>
              )}
            </View>

          </View>
        ) : (
          // ==================== TAMPILKAN KONTEN DEFAULT ====================
          !isLoadingOrders && (
            <View style={styles.content}>
              <Text style={styles.question}>Mau ngapain hari ini?</Text>

              {/* ScootRide Card */}
              <TouchableOpacity style={styles.card} onPress={handleScootRide} activeOpacity={0.8}>
                <View style={styles.imageCircle}>
                  <Image
                    source={scootRideImage}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>ScootRide</Text>
                  <Text style={styles.cardDesc}>Nebeng cepat, aman, dan</Text>
                  <Text style={styles.cardDesc}>santai 😎</Text>
                </View>
                <View style={styles.arrowButton}>
                  <Text style={styles.arrowText}>→</Text>
                </View>
              </TouchableOpacity>

              {/* ScootFood Card */}
              <TouchableOpacity style={styles.card} onPress={handleScootFood} activeOpacity={0.8}>
                <View style={styles.imageCircle}>
                  <Image
                    source={scootFoodImage}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>ScootFood</Text>
                  <Text style={styles.cardDesc}>Antar makanan dengan</Text>
                  <Text style={styles.cardDesc}>mudah 😋</Text>
                </View>
                <View style={styles.arrowButton}>
                  <Text style={styles.arrowText}>→</Text>
                </View>
              </TouchableOpacity>

              {/* ScootSend Card */}
              <TouchableOpacity style={styles.card} onPress={handleScootSend} activeOpacity={0.8}>
                <View style={styles.imageCircle}>
                  <Image
                    source={scootSendImage}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>ScootSend</Text>
                  <Text style={styles.cardDesc}>Kirim paket cepat, aman dan</Text>
                  <Text style={styles.cardDesc}>terpercaya 📦</Text>
                </View>
                <View style={styles.arrowButton}>
                  <Text style={styles.arrowText}>→</Text>
                </View>
              </TouchableOpacity>
            </View>
          )
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <View style={[styles.navItem, styles.navItemActive]}>
          <View style={styles.navIconContainerActive}>
            <View style={styles.homeIcon}>
              <View style={styles.homeIconBase} />
              <View style={styles.homeIconRoof} />
            </View>
          </View>
          <Text style={styles.navTextActive}>Beranda</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={handleRiwayat}
          activeOpacity={0.7}
        >
          <View style={styles.navIconContainer}>
            <View style={styles.historyIcon}>
              <View style={styles.historyIconCircle} />
              <View style={styles.historyIconHand} />
            </View>
          </View>
          <Text style={styles.navText}>Riwayat</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={handleTerms}
          activeOpacity={0.7}
        >
          <View style={styles.navIconContainer}>
            <View style={styles.termsIcon}>
              <View style={styles.termsIconPaper} />
              <View style={styles.termsIconLines} />
            </View>
          </View>
          <Text style={styles.navText}>Terms n Cond</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL PREVIEW FOTO FULL SCREEN */}
      <Modal
        visible={showPreview}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowPreview(false)}
          >
            <View style={styles.modalContent}>
              {currentImageUrl ? (
                <Image 
                  source={{ uri: currentImageUrl }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              ) : (
                <Image 
                  source={require('../../../assets/images/driver.png')}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              )}
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowPreview(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  greetingContainer: {
    marginLeft: 15,
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#016837',
    fontFamily: 'Montserrat-Bold',
  },
  subGreeting: {
    fontSize: 12,
    color: '#016837',
    marginTop: 2,
    fontFamily: 'Montserrat-Regular',
  },
  editButton: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#016837',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  editText: {
    fontSize: 10,
    color: '#016837',
    fontFamily: 'Montserrat-Regular',
  },
  // 🔥 TOGGLE SECTION
  toggleSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#016837',
    fontFamily: 'Montserrat-Bold',
  },
  toggleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#016837',
    fontFamily: 'Montserrat-Bold',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat-Regular',
  },
  // 🔥 ORDERS CONTAINER
  ordersContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  serviceSection: {
    marginBottom: 0,
  },
  serviceSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#016837',
    marginBottom: 12,
    fontFamily: 'Montserrat-Bold',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#016837',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  orderLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
    fontFamily: 'Montserrat-Bold',
  },
  orderValue: {
    fontSize: 13,
    color: '#000',
    lineHeight: 20,
    fontFamily: 'Montserrat-Regular',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#016837',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 12,
    gap: 8,
  },
  chatButtonIcon: {
    fontSize: 18,
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Montserrat-Bold',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
    marginBottom: 4,
    fontFamily: 'Montserrat-Bold',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontFamily: 'Montserrat-Regular',
  },
  spacer: {
    height: 24,
  },
  // 🔥 DEFAULT CONTENT
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  question: {
    fontSize: 16,
    fontWeight: '700',
    color: '#016837',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Montserrat-Bold',
  },
  card: {
    backgroundColor: '#33cc66',
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  imageCircle: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImage: {
    width: 120,
    height: 120,
    transform: [{ scaleX: -1 }],
  },
  cardTextContainer: {
    flex: 1,
    paddingLeft: 16,
    paddingBottom: 8,
    justifyContent: 'flex-end',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    fontFamily: 'Montserrat-Bold',
  },
  cardDesc: {
    fontSize: 12,
    color: '#fff',
    lineHeight: 18,
    fontFamily: 'Montserrat-Regular',
  },
  arrowButton: {
    width: 80,
    height: 32,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginBottom: 8,
  },
  arrowText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // BOTTOM NAV
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
  },
  navItemActive: {
    backgroundColor: '#d2ffde',
    borderRadius: 18,
    paddingVertical: 8,
  },
  navIconContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navIconContainerActive: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeIcon: {
    width: 28,
    height: 28,
    position: 'relative',
  },
  homeIconBase: {
    width: 22,
    height: 18,
    borderWidth: 2.5,
    borderColor: '#016837',
    borderTopWidth: 0,
    position: 'absolute',
    bottom: 0,
    left: 3,
  },
  homeIconRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#016837',
    position: 'absolute',
    top: 0,
  },
  historyIcon: {
    width: 28,
    height: 28,
    position: 'relative',
  },
  historyIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2.5,
    borderColor: '#016837',
  },
  historyIconHand: {
    width: 2,
    height: 9,
    backgroundColor: '#016837',
    position: 'absolute',
    top: 7,
    left: 12,
  },
  termsIcon: {
    width: 24,
    height: 28,
    position: 'relative',
  },
  termsIconPaper: {
    width: 22,
    height: 28,
    borderWidth: 2.5,
    borderColor: '#016837',
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  termsIconLines: {
    position: 'absolute',
    top: 7,
    left: 4,
    width: 14,
    height: 12,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#016837',
  },
  navText: {
    fontSize: 10,
    color: '#016837',
    marginTop: 4,
    fontFamily: 'Montserrat-Regular',
  },
  navTextActive: {
    fontSize: 10,
    color: '#016837',
    marginTop: 4,
    fontFamily: 'Montserrat-Regular',
  },
  // MODAL
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: -60,
    right: 10,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
  },
});

export default HomeDriver;