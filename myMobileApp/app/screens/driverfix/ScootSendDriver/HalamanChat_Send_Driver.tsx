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

interface OrderDetailSend {
  id_scoot_send: number;
  id_customer: string;
  id_driver: string;
  lokasi_jemput_barang: string;
  lokasi_tujuan: string;
  nama_penerima: string;
  berat: number;
  nama_barang: string;
  tarif: number;
  status: string;
}

const HalamanChat_Send_Driver: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [messages, setMessages] = React.useState<Message[]>([]);
  const [inputText, setInputText] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSending, setIsSending] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<'customer' | 'driver'>('driver');

  const [orderId, setOrderId] = React.useState<number>(0);
  const [customerId, setCustomerId] = React.useState<string>('');
  const [driverId, setDriverId] = React.useState<string>('');
  const [orderDetail, setOrderDetail] = React.useState<OrderDetailSend | null>(null);

  const [counterpartInfo, setCounterpartInfo] = React.useState<{ nama: string; foto_url: string | null }>({ nama: 'Customer', foto_url: null });

  const scrollViewRef = React.useRef<ScrollView>(null);

  const resolveToUuid = async (id: string, role: 'customer' | 'driver'): Promise<string> => {
    if (id.includes('-')) return id;
    try {
      if (role === 'driver') {
        const { data } = await supabase.from('driver').select('id').eq('nim', id).maybeSingle();
        if (data?.id) return data.id;
      } else {
        const { data } = await supabase.from('customer').select('id').eq('nim', id).maybeSingle();
        if (data?.id) return data.id;
      }
    } catch (e) {
      console.warn(e);
    }
    return id;
  };

  React.useEffect(() => {
    if (params?.orderId) setOrderId(parseInt(String(params.orderId), 10));
    if (params?.customerId) setCustomerId(String(params.customerId));
    if (params?.driverId) setDriverId(String(params.driverId));
  }, [params]);

  React.useEffect(() => {
    const fetchOrder = async () => {
      try {
        if (!orderId) return;
        setIsLoading(true);
        const { data, error } = await supabase
          .from('scoot_send')
          .select('id_scoot_send, id_customer, id_driver, lokasi_jemput_barang, lokasi_tujuan, nama_penerima, berat, nama_barang, tarif, status')
          .eq('id_scoot_send', orderId)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setOrderDetail(data);
          if (!customerId && data.id_customer) setCustomerId(data.id_customer);
          if (!driverId && data.id_driver) setDriverId(data.id_driver);
        } else {
          Alert.alert('Info', 'Order tidak ditemukan');
        }
      } catch (err) {
        console.error(err);
        Alert.alert('Error', 'Gagal memuat detail order');
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  // Fetch customer info
  React.useEffect(() => {
    const fetchCustomerInfo = async () => {
      try {
        if (!customerId) return;
        const resolvedCustomerId = customerId.includes('-') ? customerId : await resolveToUuid(customerId, 'customer');
        const { data, error } = await supabase
          .from('customer')
          .select('nama')
          .eq('id', resolvedCustomerId)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setCounterpartInfo({ nama: data.nama, foto_url: null });
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCustomerInfo();
  }, [customerId]);

  React.useEffect(() => {
    const loadMessages = async () => {
      if (!orderId) return;
      try {
        const { data, error } = await supabase
          .from('chat_send')
          .select('id_chat, teks_customer, teks_driver, timestamp')
          .eq('id_scoot_send', orderId)
          .order('timestamp', { ascending: true });
        if (error) throw error;
        const formatted: Message[] = [];
        (data || []).forEach((row: any) => {
          if (row.teks_customer) formatted.push({ id: `${row.id_chat}-cust`, text: row.teks_customer, sender: 'customer', timestamp: new Date(row.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }) });
          if (row.teks_driver) formatted.push({ id: `${row.id_chat}-drv`, text: row.teks_driver, sender: 'driver', timestamp: new Date(row.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }) });
        });
        setMessages(formatted);
      } catch (err) {
        console.error(err);
      }
    };
    loadMessages();
  }, [orderId]);

  React.useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`chat_send_${orderId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_send', filter: `id_scoot_send=eq.${orderId}` }, (payload) => {
        const newRow = payload.new as any;
        const newMsgs: Message[] = [];
        if (newRow.teks_customer) newMsgs.push({ id: `${newRow.id_chat}-cust`, text: newRow.teks_customer, sender: 'customer', timestamp: new Date(newRow.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }) });
        if (newRow.teks_driver) newMsgs.push({ id: `${newRow.id_chat}-drv`, text: newRow.teks_driver, sender: 'driver', timestamp: new Date(newRow.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }) });
        if (newMsgs.length) setMessages(prev => [...prev, ...newMsgs]);
      })
      .subscribe();
    return () => { void channel.unsubscribe(); };
  }, [orderId]);

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text) return;
    if (!orderId) { Alert.alert('Error', 'Order ID tidak ditemukan'); return; }
    setIsSending(true);
    setInputText('');
    try {
      // Chat table schema only references id_scoot_send.
      // Do NOT include id_customer/id_driver here if chat_send doesn't have those columns.
      const payload: any = {
        id_scoot_send: orderId,
        timestamp: new Date().toISOString()
      };
      if (currentUser === 'driver') {
        payload.teks_driver = text;
        payload.teks_customer = null;
      } else {
        payload.teks_customer = text;
        payload.teks_driver = null;
      }

      const { error } = await supabase.from('chat_send').insert([payload]);
      if (error) throw error;
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Gagal mengirim pesan');
      setInputText(text);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.halamanChat}>
        <View style={[styles.view, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#016837" />
          <Text style={{ marginTop: 12, color: '#666', fontFamily: 'Montserrat-Regular' }}>Memuat chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
              source={require('../../../../assets/images/Passenger.png')}
              resizeMode="cover" 
            />
            <View style={styles.headerTextContainer}>
              <Text style={styles.customerName}>{counterpartInfo.nama}</Text>
              <Text style={styles.statusBadge}>Scoot Send Order #{orderId}</Text>
            </View>
          </View>

          {/* Order Detail Card */}
          {orderDetail && (
            <View style={styles.orderCard}>
              <View style={styles.orderRow}><Text style={styles.orderLabel}>📍 Jemput:</Text><Text style={styles.orderValue}>{orderDetail.lokasi_jemput_barang}</Text></View>
              <View style={styles.orderRow}><Text style={styles.orderLabel}>📍 Tujuan:</Text><Text style={styles.orderValue}>{orderDetail.lokasi_tujuan}</Text></View>
              <View style={styles.orderRow}><Text style={styles.orderLabel}>📦 Barang:</Text><Text style={styles.orderValue}>{orderDetail.nama_barang}</Text></View>
              <View style={styles.orderRow}><Text style={styles.orderLabel}>👤 Penerima:</Text><Text style={styles.orderValue}>{orderDetail.nama_penerima}</Text></View>
              <View style={styles.orderRow}><Text style={styles.orderLabel}>⚖️ Berat:</Text><Text style={styles.orderValue}>{Number(orderDetail.berat).toFixed(2)} kg</Text></View>
              <View style={styles.orderRow}><Text style={styles.orderLabel}>💰 Tarif:</Text><Text style={styles.orderValue}>Rp {Number(orderDetail.tarif).toLocaleString('id-ID')}</Text></View>
              <View style={[styles.orderRow, { borderBottomWidth: 0 }]}><Text style={styles.orderLabel}>📊 Status:</Text><Text style={[styles.orderValue, { color: '#FF9500', fontWeight: '700' }]}>{orderDetail.status}</Text></View>
            </View>
          )}

          {/* Chat Messages Container */}
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
              </View>
            ) : (
              messages.map((m) => {
                const isOwn = m.sender === currentUser;
                return (
                  <View 
                    key={m.id} 
                    style={[
                      isOwn ? styles.messageBoxDriver : styles.messageBoxUser,
                      { marginBottom: 15 }
                    ]}
                  >
                    <Text style={isOwn ? styles.messageTextDriver : styles.messageTextUser}>
                      {m.text}
                    </Text>
                    <Text style={isOwn ? styles.timeStampDriver : styles.timeStamp}>
                      {m.timestamp}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Input Section */}
          <View style={styles.inputContainer}>
            <TextInput 
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ketikkan pesan..."
              placeholderTextColor="rgba(0,0,0,0.5)"
              editable={!isSending}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleSendMessage}
            />
            <TouchableOpacity 
              style={[styles.sendButton, (isSending || inputText.trim() === '') && { opacity: 0.4 }]}
              onPress={handleSendMessage}
              disabled={isSending || inputText.trim() === ''}
              activeOpacity={0.7}
            >
              <Text style={styles.sendButtonText}>{isSending ? '⏳' : '➤'}</Text>
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
    paddingTop: 20,
    paddingBottom: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
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
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#016837'
  },
  headerTextContainer: {
    marginLeft: 12,
    flex: 1
  },
  customerName: {
    fontSize: 16,
    color: "#000",
    fontFamily: "Montserrat-Bold",
    fontWeight: "700"
  },
  statusBadge: {
    fontSize: 12,
    color: '#666',
    fontFamily: "Montserrat-Regular",
    marginTop: 4
  },
  orderCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
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
    fontFamily: "Montserrat-Bold"
  },
  orderValue: {
    fontSize: 13,
    color: '#000',
    fontFamily: "Montserrat-Regular"
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: 19,
    paddingTop: 12
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    paddingVertical: 40
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: "Montserrat-Regular"
  },
  messageBoxUser: {
    backgroundColor: "#fff",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(1, 104, 55, 0.4)",
    padding: 20,
    shadowColor: "#c4bfbf",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: '80%',
    alignSelf: "flex-start"
  },
  messageTextUser: {
    fontSize: 12,
    color: "#000",
    fontFamily: "Montserrat-Regular",
    lineHeight: 20
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
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(1, 104, 55, 0.4)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: "#c4bfbf",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: '80%',
    alignSelf: "flex-end"
  },
  messageTextDriver: {
    fontSize: 12,
    color: "#fff",
    fontFamily: "Montserrat-Regular",
    lineHeight: 20
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
    paddingTop: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
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
    width: 44,
    height: 44,
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#016837',
    borderRadius: 22
  },
  sendButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold'
  }
});

export default HalamanChat_Send_Driver;