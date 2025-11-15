import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../../hooks/supabaseClient";

interface Message {
  id: string;
  text: string;
  sender: 'customer' | 'driver';
  timestamp: string;
}

interface OrderDetail {
  id_scoot_food: number;
  id_customer: string;
  id_driver: string;
  lokasi_resto: string;
  lokasi_tujuan: string;
  detail_pesanan: string;
  ongkir: number;
  status: string;
}

const HalamanChat_Food_Driver: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  // State untuk data
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [inputText, setInputText] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSending, setIsSending] = React.useState(false);

  // Auth & User Info
  const [authUserId, setAuthUserId] = React.useState<string>('');
  const [currentUser, setCurrentUser] = React.useState<'customer' | 'driver'>('driver');

  // Order Data
  const [orderId, setOrderId] = React.useState<number>(0);
  const [customerId, setCustomerId] = React.useState<string>('');
  const [driverId, setDriverId] = React.useState<string>('');
  const [orderDetail, setOrderDetail] = React.useState<OrderDetail | null>(null);

  // UI Data
  const [counterpartInfo, setCounterpartInfo] = React.useState<{
    nama: string;
    foto_url: string | null;
  }>({
    nama: 'Counterpart',
    foto_url: null
  });

  // State untuk tracking data readiness
  const [idsReady, setIdsReady] = React.useState(false);

  const scrollViewRef = React.useRef<ScrollView>(null);

  // 🔑 Fungsi untuk mengambil UUID driver dari tabel driver berdasarkan NIM
  const getDriverUuidFromNim = async (nim: string): Promise<string | null> => {
    try {
      console.log('🔍 Mencari UUID driver dengan NIM:', nim);
      
      const { data, error } = await supabase
        .from('driver')
        .select('id')
        .eq('nim', nim)
        .maybeSingle();

      if (error) {
        console.warn('⚠️ Error mengambil UUID driver dari tabel:', error);
        return null;
      }

      if (data && data.id) {
        const driverUuid = data.id;
        console.log('✅ UUID driver ditemukan:', driverUuid);
        
        await AsyncStorage.setItem('driver_id', driverUuid);
        await AsyncStorage.setItem('driver_uuid', driverUuid);
        console.log('💾 Driver UUID disimpan ke AsyncStorage');
        
        return driverUuid;
      }

      console.warn('⚠️ UUID driver tidak ditemukan untuk NIM:', nim);
      return null;
    } catch (error) {
      console.error('❌ Error dalam getDriverUuidFromNim:', error);
      return null;
    }
  };

  // 🔑 Fungsi untuk mengambil UUID customer dari tabel customer berdasarkan NIM
  const getCustomerUuidFromNim = async (nim: string): Promise<string | null> => {
    try {
      console.log('🔍 Mencari UUID customer dengan NIM:', nim);
      
      const { data, error } = await supabase
        .from('customer')
        .select('id')
        .eq('nim', nim)
        .maybeSingle();

      if (error) {
        console.warn('⚠️ Error mengambil UUID customer dari tabel:', error);
        return null;
      }

      if (data && data.id) {
        const customerUuid = data.id;
        console.log('✅ UUID customer ditemukan:', customerUuid);
        
        await AsyncStorage.setItem('customer_id', customerUuid);
        await AsyncStorage.setItem('customer_uuid', customerUuid);
        console.log('💾 Customer UUID disimpan ke AsyncStorage');
        
        return customerUuid;
      }

      console.warn('⚠️ UUID customer tidak ditemukan untuk NIM:', nim);
      return null;
    } catch (error) {
      console.error('❌ Error dalam getCustomerUuidFromNim:', error);
      return null;
    }
  };

  // 🔄 Fungsi untuk resolve ID (NIM ke UUID jika diperlukan)
  const resolveToUuid = async (id: string, role: 'customer' | 'driver'): Promise<string> => {
    if (id.includes('-')) {
      console.log(`✅ ${role} ID sudah dalam format UUID:`, id);
      return id;
    }

    console.log(`🔄 ${role} ID adalah NIM, converting ke UUID...`);
    const uuid = role === 'driver' 
      ? await getDriverUuidFromNim(id)
      : await getCustomerUuidFromNim(id);
    
    if (!uuid) {
      console.warn(`⚠️ Gagal konversi ${role} NIM ke UUID:`, id);
      return id;
    }

    return uuid;
  };

  // 🔑 Resolve driver UUID from multiple sources
  const resolveDriverUuid = async (): Promise<string | null> => {
    try {
      // 1. try supabase auth getUser
      try {
        const { data } = await supabase.auth.getUser();
        const uid = data?.user?.id;
        if (uid) return uid;
      } catch (_) {}

      // 2. try supabase session
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data?.session?.user?.id;
        if (uid) return uid;
      } catch (_) {}

      // 3. try AsyncStorage common keys
      const keys = ['driver_id','driver_uuid','userId','user_id','user_uuid','userNim','nim'];
      for (const k of keys) {
        const v = await AsyncStorage.getItem(k);
        if (v) {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(v)) return v;
          const found = await getDriverUuidFromNim(v);
          if (found) return found;
        }
      }

      return null;
    } catch (err) {
      console.error('❌ resolveDriverUuid error', err);
      return null;
    }
  };

  // 📱 Fungsi untuk mendapatkan Driver ID dari berbagai sumber
  const getDriverIdFromStorage = async (): Promise<string | null> => {
    try {
      console.log('🔍 Mencari Driver ID dari AsyncStorage...');
      
      const possibleKeys = [
        'driver_id',
        'driver_uuid', 
        'driverId',
        'id_driver',
        'userId',
        'user_id',
        'userNim',
        'nim'
      ];

      for (const key of possibleKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          console.log(`✅ Driver ID ditemukan di AsyncStorage (${key}):`, value);
          return value;
        }
      }

      console.log('⚠️ Driver ID tidak ditemukan di AsyncStorage');
      return null;
    } catch (error) {
      console.error('❌ Error reading from AsyncStorage:', error);
      return null;
    }
  };

  // 🔐 Step 1: Detect user role & resolve IDs
  React.useEffect(() => {
    const detectUserRole = async () => {
      try {
        let userId: string | undefined;

        // 1️⃣ Coba dari AsyncStorage dulu
        const storedDriverId = await getDriverIdFromStorage();
        if (storedDriverId) {
          userId = storedDriverId;
          console.log('📱 User ID dari AsyncStorage:', userId);
        }

        // 2️⃣ Jika tidak ada di AsyncStorage, coba dari Supabase Auth
        if (!userId) {
          try {
            const { data } = await supabase.auth.getUser();
            userId = data?.user?.id;
            if (userId) {
              console.log('🔐 User ID dari Supabase Auth (getUser):', userId);
              await AsyncStorage.setItem('driver_id', userId);
            }
          } catch (e) {
            const { data } = await supabase.auth.getSession();
            userId = data?.session?.user?.id;
            if (userId) {
              console.log('🔐 User ID dari Supabase Auth (getSession):', userId);
              await AsyncStorage.setItem('driver_id', userId);
            }
          }
        }

        if (!userId) {
          console.warn('⚠️ User ID tidak ditemukan');
          Alert.alert('Error', 'Tidak dapat mendeteksi user ID. Silakan login kembali.');
          setIsLoading(false);
          return;
        }

        // 3️⃣ Resolve ke UUID jika perlu
        let resolvedUserId = userId;
        if (!userId.includes('-')) {
          let uuid = await getDriverUuidFromNim(userId);
          if (uuid) {
            resolvedUserId = uuid;
            setCurrentUser('driver');
            console.log('✅ User is DRIVER (resolved from NIM)');
          } else {
            uuid = await getCustomerUuidFromNim(userId);
            if (uuid) {
              resolvedUserId = uuid;
              setCurrentUser('customer');
              console.log('✅ User is CUSTOMER (resolved from NIM)');
            }
          }
        } else {
          // Sudah UUID, cek di tabel mana
          const { data: custCheck } = await supabase
            .from('customer')
            .select('id')
            .eq('id', userId)
            .maybeSingle();

          if (custCheck) {
            setCurrentUser('customer');
            console.log('✅ User is CUSTOMER');
          } else {
            const { data: drvCheck } = await supabase
              .from('driver')
              .select('id')
              .eq('id', userId)
              .maybeSingle();

            if (drvCheck) {
              setCurrentUser('driver');
              console.log('✅ User is DRIVER');
            }
          }
        }

        setAuthUserId(resolvedUserId);
        console.log('✅ Auth User ID (resolved):', resolvedUserId);

        // 4️⃣ Simpan final resolved ID ke AsyncStorage
        await AsyncStorage.setItem('driver_id', resolvedUserId);
        await AsyncStorage.setItem('current_user_id', resolvedUserId);

      } catch (err) {
        console.error('❌ Error detecting user role:', err);
        Alert.alert('Error', 'Gagal mendeteksi user role: ' + (err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    detectUserRole();
  }, []);

  // 📦 Step 2: Resolve Order & User IDs from params
  React.useEffect(() => {
    const resolveParams = async () => {
      if (params?.orderId) {
        const parsedOrderId = parseInt(String(params.orderId), 10);
        setOrderId(parsedOrderId);
        console.log('📦 Order ID from params:', parsedOrderId);
      }
      
      if (params?.customerId) {
        const custId = String(params.customerId);
        const resolvedCustId = await resolveToUuid(custId, 'customer');
        setCustomerId(resolvedCustId);
        console.log('👤 Customer ID resolved:', resolvedCustId);
      }
      
      if (params?.driverId) {
        const drvId = String(params.driverId);
        const resolvedDrvId = await resolveToUuid(drvId, 'driver');
        setDriverId(resolvedDrvId);
        console.log('🚗 Driver ID resolved:', resolvedDrvId);
        
        await AsyncStorage.setItem('driver_id', resolvedDrvId);
      }
    };

    resolveParams();
  }, [params]);

  // 📋 Step 3: Fetch Order Detail
  React.useEffect(() => {
    const fetchOrderDetail = async () => {
      try {
        if (!orderId) return;

        console.log('📋 Fetching order detail for ID:', orderId);

        const { data, error } = await supabase
          .from('scoot_food')
          .select('id_scoot_food, id_customer, id_driver, lokasi_resto, lokasi_tujuan, detail_pesanan, ongkir, status')
          .eq('id_scoot_food', orderId)
          .maybeSingle();

        if (error) {
          console.error('❌ Error fetching order:', error);
          throw error;
        }

        if (data) {
          setOrderDetail(data);
          
          // Update IDs dan check readiness
          let newCustomerId = customerId;
          let newDriverId = driverId;
          
          if (!customerId && data.id_customer) {
            newCustomerId = data.id_customer;
            setCustomerId(data.id_customer);
            await AsyncStorage.setItem('customer_id', data.id_customer);
          }
          
          if (!driverId && data.id_driver) {
            newDriverId = data.id_driver;
            setDriverId(data.id_driver);
            await AsyncStorage.setItem('driver_id', data.id_driver);
          }
          
          // Check if both IDs are ready
          if (newCustomerId && newDriverId) {
            console.log('✅ Both IDs ready after order fetch:', { newCustomerId, newDriverId });
            setIdsReady(true);
          }
          
          console.log('✅ Order Detail loaded:', data);
        } else {
          console.warn('⚠️ Order not found');
          Alert.alert('Info', 'Order tidak ditemukan');
        }
      } catch (err) {
        console.error('❌ Error fetching order detail:', err);
        Alert.alert('Error', 'Gagal memuat detail order: ' + (err as Error).message);
      }
    };

    fetchOrderDetail();
  }, [orderId]);

  // 🔔 Auto-take order if requested
  React.useEffect(() => {
    const tryAutoTake = async () => {
      try {
        const shouldTake = String(params?.take || params?.ambil || params?.action || '').toLowerCase() === 'true' ||
          String(params?.from || '').toLowerCase() === 'ambil';
        if (!shouldTake) return;
        if (!orderId) {
          console.warn('⚠️ Auto-take requested but orderId not set yet');
          return;
        }

        const driverUuid = await resolveDriverUuid();
        if (!driverUuid) {
          Alert.alert('Gagal', 'Driver ID tidak ditemukan. Silakan login ulang.');
          console.warn('Driver UUID not resolved for auto-take');
          return;
        }

        console.log('🔧 Auto-taking order', orderId, 'with driver', driverUuid);

        const { data, error } = await supabase
          .from('scoot_food')
          .update({ id_driver: driverUuid, status: 'on progress' })
          .eq('id_scoot_food', orderId)
          .is('id_driver', null)
          .select();

        if (error) {
          console.warn('Gagal update scoot_food on take:', error);
          Alert.alert('Gagal mengambil pesanan', error.message || String(error));
        } else {
          if (Array.isArray(data) && data.length > 0) {
            const updated = data[0];
            setOrderDetail(prev => ({ ...(prev || {}), id_driver: updated.id_driver, status: updated.status } as OrderDetail));
            setDriverId(String(updated.id_driver));
            await AsyncStorage.setItem('driver_id', String(updated.id_driver));
            console.log('✅ Order updated and UI refreshed');
          } else {
            if (data && (data as any).id_scoot_food) {
              const updated = data as any;
              setOrderDetail(prev => ({ ...(prev || {}), id_driver: updated.id_driver, status: updated.status } as OrderDetail));
              setDriverId(String(updated.id_driver));
              await AsyncStorage.setItem('driver_id', String(updated.id_driver));
              console.log('✅ Order updated and UI refreshed (single)');
            } else {
              console.log('ℹ️ Update succeeded but no returned row; refreshing by fetching order detail');
              const { data: refetch, error: refError } = await supabase
                .from('scoot_food')
                .select('id_scoot_food, id_customer, id_driver, lokasi_resto, lokasi_tujuan, detail_pesanan, ongkir, status')
                .eq('id_scoot_food', orderId)
                .maybeSingle();
              if (!refError && refetch) {
                setOrderDetail(refetch);
                if (refetch.id_driver) {
                  setDriverId(refetch.id_driver);
                  await AsyncStorage.setItem('driver_id', refetch.id_driver);
                }
                console.log('✅ Refetched order detail after update');
              }
            }
          }
        }
      } catch (err) {
        console.error('❌ auto-take error', err);
      }
    };

    tryAutoTake();
  }, [params, orderId]);

  // 🔧 FIXED: Fetch counterpart info - HANYA query kolom 'nama'
  React.useEffect(() => {
    const fetchCounterpartInfo = async () => {
      // Wait until both customerId and driverId are available
      if (!customerId || !driverId) {
        console.log('⏳ Waiting for both IDs...', { customerId, driverId });
        return;
      }

      // Mark as ready
      if (!idsReady) {
        console.log('✅ Both IDs now available, marking ready');
        setIdsReady(true);
      }

      try {
        console.log('👤 Fetching counterpart info...', { 
          currentUser, 
          customerId, 
          driverId 
        });

        if (currentUser === 'driver' && customerId) {
          console.log('👤 Fetching customer info for ID:', customerId);
          
          // ✅ FIXED: Hanya query kolom 'nama', tidak query foto_url
          const { data, error } = await supabase
            .from('customer')
            .select('nama')
            .eq('id', customerId)
            .maybeSingle();

          if (error) {
            console.warn('⚠️ Error fetching customer info:', error);
            setCounterpartInfo({ nama: 'Customer', foto_url: null });
          } else if (data) {
            setCounterpartInfo({
              nama: data.nama || 'Customer',
              foto_url: null // Set null karena tidak ada kolom foto_url
            });
            console.log('✅ Customer Info loaded:', data.nama);
          } else {
            console.warn('⚠️ No customer data found');
            setCounterpartInfo({ nama: 'Customer', foto_url: null });
          }
        } else if (currentUser === 'customer' && driverId) {
          console.log('👤 Fetching driver info for ID:', driverId);
          
          // ✅ FIXED: Hanya query kolom 'nama', tidak query foto_url
          const { data, error } = await supabase
            .from('driver')
            .select('nama')
            .eq('id', driverId)
            .maybeSingle();

          if (error) {
            console.warn('⚠️ Error fetching driver info:', error);
            setCounterpartInfo({ nama: 'Driver', foto_url: null });
          } else if (data) {
            setCounterpartInfo({
              nama: data.nama || 'Driver',
              foto_url: null // Set null karena tidak ada kolom foto_url
            });
            console.log('✅ Driver Info loaded:', data.nama);
          } else {
            console.warn('⚠️ No driver data found');
            setCounterpartInfo({ nama: 'Driver', foto_url: null });
          }
        }
      } catch (err) {
        console.error('❌ Error fetching counterpart info:', err);
        setCounterpartInfo({
          nama: currentUser === 'driver' ? 'Customer' : 'Driver',
          foto_url: null
        });
      }
    };

    fetchCounterpartInfo();
  }, [currentUser, customerId, driverId]);

  // 💬 Step 5: Load Chat History
  const loadMessages = React.useCallback(async () => {
    if (!orderId) return;
    
    try {
      console.log('💬 Loading messages for order:', orderId);

      const { data, error } = await supabase
        .from('chat_food')
        .select('id_chat, teks_customer, teks_driver, timestamp')
        .eq('id_scoot_food', orderId)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      const formatted: Message[] = [];
      (data || []).forEach((row: any) => {
        if (row.teks_customer) {
          formatted.push({
            id: `${row.id_chat}-cust`,
            text: row.teks_customer,
            sender: 'customer',
            timestamp: formatTime(row.timestamp)
          });
        }
        if (row.teks_driver) {
          formatted.push({
            id: `${row.id_chat}-drv`,
            text: row.teks_driver,
            sender: 'driver',
            timestamp: formatTime(row.timestamp)
          });
        }
      });

      setMessages(formatted);
      console.log('✅ Messages loaded:', formatted.length);
    } catch (err) {
      console.error('❌ Error loading messages:', err);
    }
  }, [orderId]);

  React.useEffect(() => {
    loadMessages();
  }, [orderId, loadMessages]);

  // 🔄 Step 6: Setup Realtime Subscription
  React.useEffect(() => {
    if (!orderId) return;

    console.log('🔔 Setting up realtime subscription for order:', orderId);

    const channel = supabase
      .channel(`chat_food_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_food',
          filter: `id_scoot_food=eq.${orderId}`
        },
        (payload) => {
          console.log('📡 Realtime message received:', payload);
          
          const newRow = payload.new as any;
          const newMessages: Message[] = [];

          if (newRow.teks_customer) {
            newMessages.push({
              id: `${newRow.id_chat}-cust`,
              text: newRow.teks_customer,
              sender: 'customer',
              timestamp: formatTime(newRow.timestamp)
            });
          }

          if (newRow.teks_driver) {
            newMessages.push({
              id: `${newRow.id_chat}-drv`,
              text: newRow.teks_driver,
              sender: 'driver',
              timestamp: formatTime(newRow.timestamp)
            });
          }

          if (newMessages.length > 0) {
            setMessages((prev) => [...prev, ...newMessages]);
            console.log('✅ New messages added to state');
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔕 Unsubscribing from realtime channel');
      channel.unsubscribe();
    };
  }, [orderId]);

  // 📨 Step 7: Send Message
  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text) return;
    if (!orderId) {
      Alert.alert('Error', 'Order ID tidak ditemukan');
      return;
    }

    setIsSending(true);
    setInputText('');

    try {
      const payload: any = {
        id_scoot_food: orderId,
        timestamp: new Date().toISOString()
      };

      if (currentUser === 'driver') {
        payload.teks_driver = text;
        payload.teks_customer = null;
      } else {
        payload.teks_customer = text;
        payload.teks_driver = null;
      }

      console.log('📤 Sending message:', payload);

      const { error } = await supabase
        .from('chat_food')
        .insert([payload]);

      if (error) throw error;

      console.log('✅ Message sent successfully');

    } catch (err) {
      console.error('❌ Error sending message:', err);
      Alert.alert('Error', 'Gagal mengirim pesan');
      setInputText(text);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } catch (e) {
      return '';
    }
  };

  // 🎨 Loading State
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#016837" />
          <Text style={{ marginTop: 12, color: '#666', fontFamily: 'Montserrat-Regular' }}>
            Memuat chat...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>

          {/* 🎯 Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>

            <Image 
              style={styles.counterpartIcon} 
              source={require('../../../../assets/images/Passenger.png')}
              resizeMode="cover" 
            />
            
            <View style={styles.headerTextContainer}>
              <Text style={styles.counterpartName}>{counterpartInfo.nama}</Text>
              <Text style={styles.statusBadge}>Food Order #{orderId}</Text>
            </View>
          </View>

          {/* 📋 Order Info Card */}
          {orderDetail && (
            <View style={styles.orderCard}>
              <View style={styles.orderRow}>
                <Text style={styles.orderLabel}>📍 Dari Resto:</Text>
                <Text style={styles.orderValue}>{orderDetail.lokasi_resto}</Text>
              </View>
              <View style={styles.orderRow}>
                <Text style={styles.orderLabel}>📍 Tujuan:</Text>
                <Text style={styles.orderValue}>{orderDetail.lokasi_tujuan}</Text>
              </View>
              <View style={styles.orderRow}>
                <Text style={styles.orderLabel}>🍽️ Pesanan:</Text>
                <Text style={styles.orderValue}>{orderDetail.detail_pesanan}</Text>
              </View>
              <View style={styles.orderRow}>
                <Text style={styles.orderLabel}>💰 Ongkir:</Text>
                <Text style={styles.orderValue}>Rp {Number(orderDetail.ongkir).toLocaleString('id-ID')}</Text>
              </View>
              <View style={[styles.orderRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.orderLabel}>📊 Status:</Text>
                <Text style={[styles.orderValue, { color: getStatusColor(orderDetail.status), fontWeight: '700' }]}>
                  {orderDetail.status}
                </Text>
              </View>
            </View>
          )}

          {/* 💬 Chat Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatContainer}
            contentContainerStyle={{ paddingBottom: 20 }}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}></Text>
                <Text style={styles.emptyText}>Belum ada pesan</Text>
                <Text style={[styles.emptyText, { fontSize: 12, marginTop: 8 }]}>
                  Mulai percakapan dengan {currentUser === 'driver' ? 'customer' : 'driver'}
                </Text>
              </View>
            ) : (
              messages.map((message) => {
                const isOwnMessage = message.sender === currentUser;
                
                return (
                  <View
                    key={message.id}
                    style={[
                      styles.messageBox,
                      isOwnMessage 
                        ? styles.messageBoxOwn 
                        : styles.messageBoxOther
                    ]}
                  >
                    <Text style={[
                      styles.messageText,
                      isOwnMessage ? styles.messageTextOwn : styles.messageTextOther
                    ]}>
                      {message.text}
                    </Text>
                    <Text style={[
                      styles.messageTime,
                      isOwnMessage ? styles.messageTimeOwn : styles.messageTimeOther
                    ]}>
                      {message.timestamp}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* ⌨️ Input Section */}
          <View style={styles.inputContainer}>
            <TextInput 
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ketikkan pesan..."
              placeholderTextColor="rgba(0,0,0,0.4)"
              editable={!isSending}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleSendMessage}
            />
            <TouchableOpacity 
              style={[
                styles.sendButton,
                (isSending || inputText.trim() === '') && styles.sendButtonDisabled
              ]}
              onPress={handleSendMessage}
              disabled={isSending || inputText.trim() === ''}
              activeOpacity={0.7}
            >
              <Text style={styles.sendButtonText}>
                {isSending ? '⏳' : '➤'}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </SafeAreaView>
    </>
  );
};

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'menunggu driver':
      return '#FFA500';
    case 'diterima driver':
    case 'sedang dijalankan':
    case 'on progress':
      return '#FF9500';
    case 'selesai':
      return '#34C759';
    case 'dibatalkan':
      return '#FF3B30';
    default:
      return '#666';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  backButton: {
    padding: 8,
    marginRight: 8
  },
  backArrow: {
    fontSize: 24,
    color: '#016837',
    fontWeight: 'bold'
  },
  counterpartIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#016837'
  },
  headerTextContainer: {
    marginLeft: 12,
    flex: 1
  },
  counterpartName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'Montserrat-Bold'
  },
  statusBadge: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontFamily: 'Montserrat-Regular'
  },
  orderCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#016837'
  },
  orderRow: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  orderLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
    fontFamily: 'Montserrat-Bold'
  },
  orderValue: {
    fontSize: 13,
    color: '#000',
    fontFamily: 'Montserrat-Regular'
  },
  chatContainer: {
    flex: 1,
    marginBottom: 12
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    fontFamily: 'Montserrat-Regular',
    textAlign: 'center'
  },
  messageBox: {
    marginVertical: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  messageBoxOwn: {
    alignSelf: 'flex-end',
    backgroundColor: '#016837',
    borderBottomRightRadius: 4
  },
  messageBoxOther: {
    alignSelf: 'flex-start',
    backgroundColor: '#e8e8e8',
    borderBottomLeftRadius: 4
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'Montserrat-Regular',
    lineHeight: 20
  },
  messageTextOwn: {
    color: '#fff'
  },
  messageTextOther: {
    color: '#000'
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    fontFamily: 'Montserrat-Regular'
  },
  messageTimeOwn: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right'
  },
  messageTimeOther: {
    color: 'rgba(0,0,0,0.5)',
    textAlign: 'left'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 16,
    paddingTop: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff'
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 14,
    fontFamily: 'Montserrat-Regular',
    backgroundColor: '#f9f9f9'
  },
  sendButton: {
    backgroundColor: '#016837',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#016837',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4
  },
  sendButtonDisabled: {
    opacity: 0.4,
    shadowOpacity: 0
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold'
  }
});

export default HalamanChat_Food_Driver;