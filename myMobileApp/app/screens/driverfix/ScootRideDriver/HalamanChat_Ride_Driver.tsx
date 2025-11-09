import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import type { ScrollView as ScrollViewType } from "react-native";
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../../hooks/supabaseClient";

interface Message {
  id: number;
  sender: 'customer' | 'driver';
  text: string;
  timestamp: string;
}

interface ChatMessage {
  id_chat: number;
  id_scoot_ride?: number;
  id_scoot_food?: number;
  id_scoot_send?: number;
  id_customer: string;
  id_driver: string;
  teks_customer: string | null;
  teks_driver: string | null;
  timestamp: string;
}

const HalamanChat_Ride_Driver: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollViewRef = React.useRef<ScrollViewType | null>(null);

  // Ambil data order dari params
  const orderData = {
    id: params.orderId as string || '12345',
    tujuan: params.tujuan as string || 'Jl. Merdeka No. 123, Pati',
    asal: params.asal as string || 'UNS Kentingan',
    waktu: params.waktu as string || '5 menit yang lalu',
    tarif: params.tarif as string || 'Rp 15.000',
    serviceType: params.serviceType as string || 'ride',
    customerId: params.customerId as string || '',
    driverId: params.driverId as string || '',
  };

  const [messages, setMessages] = React.useState<Message[]>([]);
  const [inputText, setInputText] = React.useState('');
  const [currentUser, setCurrentUser] = React.useState<'customer' | 'driver'>('customer');
  const [isLoading, setIsLoading] = React.useState(false);
  const [resolvedIds, setResolvedIds] = React.useState({
    customerId: orderData.customerId,
    driverId: orderData.driverId,
  });
  const [authUserId, setAuthUserId] = React.useState<string>('');
  const [initialMessagesInserted, setInitialMessagesInserted] = React.useState(false);
  const [otherUserName, setOtherUserName] = React.useState<string | null>(null);
  const [otherUserPhoto, setOtherUserPhoto] = React.useState<string | null>(null);

  // Helper: try resolve user id from stored NIM
  const resolveFromStoredNim = async (): Promise<string | null> => {
    try {
      const storedNim = await AsyncStorage.getItem('nim');
      if (!storedNim) return null;
      
      // try driver first
      const { data: drv, error: drvErr } = await supabase
        .from('driver')
        .select('id,nama,nim')
        .eq('nim', storedNim)
        .maybeSingle();
      
      if (!drvErr && drv) {
        setAuthUserId(drv.id);
        setCurrentUser('driver');
        setResolvedIds(prev => ({ ...prev, driverId: drv.id }));
        return drv.id;
      }
      
      // try customer
      const { data: cust, error: custErr } = await supabase
        .from('customer')
        .select('id,nama,nim')
        .eq('nim', storedNim)
        .maybeSingle();
      
      if (!custErr && cust) {
        setAuthUserId(cust.id);
        setCurrentUser('customer');
        setResolvedIds(prev => ({ ...prev, customerId: cust.id }));
        return cust.id;
      }
      
      return null;
    } catch (e) {
      console.error('resolveFromStoredNim error', e);
      return null;
    }
  };

  // Add helper to map service -> chat table and id column
  const getChatMeta = (serviceType: string) => {
    switch (serviceType) {
      case "food":
        return { table: "chat_food", idColumn: "id_scoot_food" };
      case "send":
        return { table: "chat_send", idColumn: "id_scoot_send" };
      default:
        return { table: "chat_ride", idColumn: "id_scoot_ride" };
    }
  };

  // Konversi data chat ke format message
  const convertToMessages = (data: ChatMessage[]): Message[] => {
    const formattedMessages: Message[] = [];
    
    data.forEach((msg: ChatMessage) => {
      // Jika ada pesan dari customer
      if (msg.teks_customer && msg.teks_customer.trim() !== '') {
        formattedMessages.push({
          id: msg.id_chat * 2,
          sender: 'customer',
          text: msg.teks_customer,
          timestamp: new Date(msg.timestamp).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
          })
        });
      }
      
      // Jika ada pesan dari driver
      if (msg.teks_driver && msg.teks_driver.trim() !== '') {
        formattedMessages.push({
          id: msg.id_chat * 2 + 1,
          sender: 'driver',
          text: msg.teks_driver,
          timestamp: new Date(msg.timestamp).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
          })
        });
      }
    });
    
    return formattedMessages;
  };

  // Load chat messages dari database
  const loadMessages = async () => {
    try {
      const { table, idColumn } = getChatMeta(orderData.serviceType);
      const orderId = parseInt(orderData.id, 10);

      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq(idColumn, orderId)
        .order("timestamp", { ascending: true });

      if (error) {
        console.error("Error loading messages:", error);
        return;
      }

      if (data) {
        const formatted = convertToMessages(data as any);
        setMessages(formatted);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  };

  // Detect user role and setup initial data
  const detectUserRole = React.useCallback(async () => {
    try {
      let userId: string | undefined;
      
      // Try getUser first
      try {
        const { data: authResp } = await supabase.auth.getUser();
        userId = authResp?.user?.id;
      } catch (e) {
        console.log('getUser failed, trying getSession');
      }
      
      // Fallback to getSession
      if (!userId) {
        try {
          const { data: sessionResp } = await supabase.auth.getSession();
          userId = sessionResp?.session?.user?.id;
        } catch (e) {
          console.log('getSession failed, trying NIM lookup');
        }
      }
      
      // Fallback to AsyncStorage NIM-based lookup
      if (!userId) {
        userId = await resolveFromStoredNim() || undefined;
      }

      if (!userId) {
        console.warn('User ID not found from auth or NIM');
        return;
      }

      console.log('🔍 Resolved Auth User ID:', userId);
      setAuthUserId(userId);

      // Cek apakah user adalah customer atau driver
      const { data: custCheck } = await supabase
        .from('customer')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      
      if (custCheck) {
        setCurrentUser('customer');
        console.log('✅ Logged in as CUSTOMER');
        setResolvedIds(prev => ({ 
          customerId: userId!,
          driverId: prev.driverId || orderData.driverId
        }));
        return;
      }

      const { data: drvCheck } = await supabase
        .from('driver')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      
      if (drvCheck) {
        setCurrentUser('driver');
        console.log('✅ Logged in as DRIVER');
        setResolvedIds(prev => ({ 
          customerId: prev.customerId || orderData.customerId,
          driverId: userId!
        }));
      }
    } catch (error) {
      console.error('Error detecting user role:', error);
    }
  }, [orderData.customerId, orderData.driverId]);

  // Setup initial data
  React.useEffect(() => {
    detectUserRole();
    loadMessages();
  }, []);

  // Setup real-time subscription
  React.useEffect(() => {
    const { table, idColumn } = getChatMeta(orderData.serviceType);
    const orderId = parseInt(orderData.id, 10);
    
    console.log('📡 Setting up realtime subscription:', {
      table,
      idColumn,
      orderId
    });

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`chat-${table}-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table,
          filter: `${idColumn}=eq.${orderId}`
        },
        (payload: any) => {
          console.log('📨 New message received:', payload.new);
          const newMessage = payload.new as ChatMessage;
          const formattedMessage = convertToMessages([newMessage]);
          
          // Hindari duplikasi pesan
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMessages = formattedMessage.filter(m => !existingIds.has(m.id));
            return [...prev, ...newMessages];
          });
          
          // Scroll to bottom for new message
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Berhasil subscribe ke realtime');
        } else if (status === 'CLOSED') {
          console.log('❌ Subscription closed');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Subscription error');
        }
      });

    // Cleanup subscription
    return () => {
      console.log('🔌 Unsubscribing from realtime');
      supabase.removeChannel(channel);
    };
  }, [orderData.id, orderData.serviceType]);

  // Send message untuk realtime
  const handleSendMessage = async () => {
    if (inputText.trim() === '') return;
    setIsLoading(true);

    try {
      const { table, idColumn } = getChatMeta(orderData.serviceType);
      const orderId = parseInt(orderData.id, 10);
      
      // Ensure we have authUserId
      let userId = authUserId;
      if (!userId) {
        userId = await resolveFromStoredNim() || '';
      }

      if (!userId) {
        Alert.alert('Error', 'User ID tidak ditemukan. Silakan login ulang.');
        setIsLoading(false);
        return;
      }

      // Gunakan resolvedIds yang sudah diset
      let finalCustomerId = resolvedIds.customerId || orderData.customerId;
      let finalDriverId = resolvedIds.driverId || orderData.driverId;

      // Update IDs based on current user
      if (currentUser === 'customer') {
        finalCustomerId = userId;
      } else {
        finalDriverId = userId;
      }

      // Validasi akhir
      if (!finalCustomerId || !finalDriverId) {
        console.error('❌ Missing IDs:', {
          finalCustomerId,
          finalDriverId,
          resolvedIds,
          currentUser
        });
        Alert.alert('Error', 'ID Customer atau Driver tidak ditemukan. Coba refresh halaman.');
        setIsLoading(false);
        return;
      }

      const chatData: Record<string, any> = {
        id_customer: finalCustomerId,
        id_driver: finalDriverId,
        timestamp: new Date().toISOString(),
        teks_customer: currentUser === 'customer' ? inputText.trim() : null,
        teks_driver: currentUser === 'driver' ? inputText.trim() : null,
      };
      chatData[idColumn] = orderId;

      console.log('💬 Sending chat data:', chatData);

      const { error } = await supabase
        .from(table)
        .insert([chatData]);

      if (error) {
        console.error('Error sending message:', error);
        Alert.alert('Error', 'Gagal mengirim pesan. Silakan coba lagi.');
        return;
      }

      console.log('✅ Message sent successfully');
      setInputText('');
      
      // Fallback reload setelah delay
      setTimeout(() => {
        loadMessages();
      }, 500);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  // Otomatis insert pesan awal jika belum ada
  React.useEffect(() => {
    const insertInitialMessages = async () => {
      if (initialMessagesInserted) return;
      if (!resolvedIds.customerId || !resolvedIds.driverId) return;

      try {
        const { table, idColumn } = getChatMeta(orderData.serviceType);
        const orderId = parseInt(orderData.id, 10);

        // Cek apakah sudah ada pesan
        const { data: existing } = await supabase
          .from(table)
          .select('id_chat')
          .eq(idColumn, orderId)
          .limit(1);

        if (existing && existing.length > 0) {
          setInitialMessagesInserted(true);
          return;
        }

        // Insert pesan customer otomatis
        const customerMessage = `Hallo, tolong jemput saya :\nDari  : ${orderData.asal}\nKe     : ${orderData.tujuan}\nTerimakasih, saya tunggu ya 😊`;
        await supabase.from(table).insert([{
          id_customer: resolvedIds.customerId,
          id_driver: resolvedIds.driverId,
          timestamp: new Date().toISOString(),
          teks_customer: customerMessage,
          teks_driver: null,
          [idColumn]: orderId
        }]);

        // Insert pesan driver otomatis
        const driverMessage = 'Siap, otw ke lokasi Anda';
        await supabase.from(table).insert([{
          id_customer: resolvedIds.customerId,
          id_driver: resolvedIds.driverId,
          timestamp: new Date(Date.now() + 5000).toISOString(),
          teks_customer: null,
          teks_driver: driverMessage,
          [idColumn]: orderId
        }]);

        setInitialMessagesInserted(true);
        loadMessages();
      } catch (err) {
        console.error('Error inserting initial messages:', err);
      }
    };

    insertInitialMessages();
  }, [resolvedIds, orderData, initialMessagesInserted]);

  // Ensure customerId/driverId resolved and fetch counterpart name/photo
  React.useEffect(() => {
    const fetchCounterpartInfo = async () => {
      try {
        // prefer resolvedIds set earlier, fallback to params
        const custId = resolvedIds.customerId || (params?.customerId as string) || '';
        const drvId = resolvedIds.driverId || (params?.driverId as string) || '';

        if (currentUser === 'driver' && custId) {
          const { data } = await supabase
            .from('customer')
            .select('nama, foto_url')
            .eq('id', custId)
            .maybeSingle();
          if (data) {
            setOtherUserName(data.nama ?? 'Customer');
            setOtherUserPhoto(data.foto_url ?? null);
            return;
          }
        }

        if (currentUser === 'customer' && drvId) {
          const { data } = await supabase
            .from('driver')
            .select('nama, foto_url')
            .eq('id', drvId)
            .maybeSingle();
          if (data) {
            setOtherUserName(data.nama ?? 'Driver');
            setOtherUserPhoto(data.foto_url ?? null);
            return;
          }
        }

        // fallback: if params include customerName, use it
        if (params?.customerName) {
          setOtherUserName(String(params.customerName));
        } else {
          setOtherUserName(currentUser === 'driver' ? 'Customer' : 'Driver');
        }
      } catch (err) {
        console.error('fetchCounterpartInfo error', err);
      }
    };

    fetchCounterpartInfo();
  }, [resolvedIds.customerId, resolvedIds.driverId, currentUser, params]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.halamanChat}>
        <View style={styles.view}>
          {/* Header Section */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>

            <Image 
              style={styles.customerIcon} 
              source={
                otherUserPhoto
                  ? { uri: otherUserPhoto }
                  : (params.customerPhoto ? { uri: String(params.customerPhoto) } : require('../../../../assets/images/Passenger.png'))
              }
               resizeMode="cover" 
            />
            <Text style={styles.customerName}>{otherUserName ?? (params.customerName || "Customer")}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {orderData.serviceType === 'ride' ? 'Ride' : orderData.serviceType === 'food' ? 'Food' : 'Send'}
              </Text>
            </View>
          </View>

          {/* Chat Messages Container */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatContainer}
            contentContainerStyle={{ paddingBottom: 20 }}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageBox,
                  message.sender === 'driver' ? styles.messageBoxDriver : styles.messageBoxUser
                ]}
              >
                <Text style={message.sender === 'driver' ? styles.messageTextDriver : styles.messageTitle}>
                  {message.text}
                </Text>
                <Text style={message.sender === 'driver' ? styles.timeStampDriver : styles.timeStamp}>
                  {message.timestamp}
                </Text>
              </View>
            ))}
          </ScrollView>

          {/* Input Section */}
          <View style={styles.inputContainer}>
            <TextInput 
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ketikkan pesan..."
              placeholderTextColor="rgba(0,0,0,0.5)"
              editable={!isLoading}
              multiline
            />
            <TouchableOpacity 
              style={[
                styles.sendButton,
                (isLoading || inputText.trim() === '') && styles.sendButtonDisabled
              ]}
              onPress={handleSendMessage}
              disabled={isLoading || inputText.trim() === ''}
            >
              <Text style={styles.sendButtonText}>➤</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  halamanChat: {
    backgroundColor: "#fff",
    flex: 1
  },
  view: {
    width: "100%",
    height: "100%",
    backgroundColor: "#fff",
    flex: 1,
    position: "relative"
  },
  header: {
    backgroundColor: "#fff",
    width: "100%",
    height: 161,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 18,
    paddingTop: 50,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  backArrow: {
    fontSize: 28,
    color: '#016837',
    fontWeight: 'bold',
  },
  customerIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#016837'
  },
  customerName: {
    fontSize: 16,
    color: "#000",
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    marginLeft: 20,
    flex: 1
  },
  statusBadge: {
    backgroundColor: "#fe95a3",
    borderRadius: 33,
    paddingHorizontal: 20,
    paddingVertical: 8,
    position: "absolute",
    right: 20,
    top: 80
  },
  statusText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    textAlign: "center"
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: 19,
    paddingTop: 20,
    paddingBottom: 20
  },
  messageBox: {
    marginBottom: 15
  },
  messageBoxUser: {
    backgroundColor: "#fff",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(1, 104, 55, 0.4)",
    padding: 20,
    marginBottom: 15,
    shadowColor: "#c4bfbf",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: 312,
    alignSelf: "flex-start"
  },
  messageTitle: {
    fontSize: 12,
    color: "#000",
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 8
  },
  timeStamp: {
    fontSize: 11,
    color: "#000",
    fontFamily: "Montserrat-Regular",
    alignSelf: "flex-end",
    marginTop: 5
  },
  messageBoxDriver: {
    backgroundColor: "#33cc66",
    borderRadius: 53,
    borderWidth: 1,
    borderColor: "rgba(1, 104, 55, 0.4)",
    paddingHorizontal: 25,
    paddingVertical: 12,
    marginBottom: 15,
    shadowColor: "#c4bfbf",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: 213,
    alignSelf: "flex-end"
  },
  messageTextDriver: {
    fontSize: 12,
    color: "#fff",
    fontFamily: "Montserrat-Regular",
    lineHeight: 22,
    textAlign: "center"
  },
  timeStampDriver: {
    fontSize: 11,
    color: "#fff",
    fontFamily: "Montserrat-Regular",
    alignSelf: "flex-end",
    marginTop: 5
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)"
  },
  textInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "rgba(1, 104, 55, 0.4)",
    minHeight: 48,
    maxHeight: 100,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Montserrat-Regular",
    color: "#000",
    shadowColor: "#c4bfbf",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8
  },
  sendButton: {
    width: 48,
    height: 48,
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#016837",
    borderRadius: 24
  },
  sendButtonDisabled: {
    backgroundColor: "#ccc"
  },
  sendButtonText: {
    fontSize: 20,
    color: "#fff"
  }
});

export default HalamanChat_Ride_Driver;