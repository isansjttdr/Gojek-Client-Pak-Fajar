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

interface OrderDetailRide {
  id_scoot_ride: number;
  id_customer: string;
  id_driver: string;
  lokasi_jemput: string;
  lokasi_tujuan: string;
  tarif: number;
  status: string;
}

const ChatRide_Cust: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [messages, setMessages] = React.useState<Message[]>([]);
  const [inputText, setInputText] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSending, setIsSending] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<'customer' | 'driver'>('customer');

  const [orderId, setOrderId] = React.useState<number>(0);
  const [customerId, setCustomerId] = React.useState<string>('');
  const [driverId, setDriverId] = React.useState<string>('');
  const [orderDetail, setOrderDetail] = React.useState<OrderDetailRide | null>(null);

  const [counterpartInfo, setCounterpartInfo] = React.useState<{ nama: string; foto_url: string | null }>({ nama: 'Driver', foto_url: null });

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
          .from('scoot_ride')
          .select('id_scoot_ride, id_customer, id_driver, lokasi_jemput, lokasi_tujuan, tarif, status')
          .eq('id_scoot_ride', orderId)
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

  // Fetch driver info
  React.useEffect(() => {
    const fetchDriverInfo = async () => {
      try {
        if (!driverId) return;
        const resolvedDriverId = driverId.includes('-') ? driverId : await resolveToUuid(driverId, 'driver');
        const { data, error } = await supabase
          .from('driver')
          .select('nama')
          .eq('id', resolvedDriverId)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setCounterpartInfo({ nama: data.nama, foto_url: null });
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchDriverInfo();
  }, [driverId]);

  React.useEffect(() => {
    const loadMessages = async () => {
      if (!orderId) return;
      try {
        const { data, error } = await supabase
          .from('chat_ride')
          .select('id_chat, teks_customer, teks_driver, timestamp')
          .eq('id_scoot_ride', orderId)
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
      .channel(`chat_ride_${orderId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_ride', filter: `id_scoot_ride=eq.${orderId}` }, (payload) => {
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
      let resolvedCustomer = customerId || orderDetail?.id_customer;
      let resolvedDriver = driverId || orderDetail?.id_driver;
      if (resolvedCustomer && !resolvedCustomer.includes('-')) resolvedCustomer = await resolveToUuid(resolvedCustomer, 'customer');
      if (resolvedDriver && !resolvedDriver.includes('-')) resolvedDriver = await resolveToUuid(resolvedDriver, 'driver');
      if (!resolvedCustomer || !resolvedDriver) { Alert.alert('Error', 'Data customer/driver tidak lengkap'); setInputText(text); return; }

      const payload: any = { id_scoot_ride: orderId, timestamp: new Date().toISOString() };
      if (currentUser === 'driver') { payload.teks_driver = text; payload.teks_customer = null; } else { payload.teks_customer = text; payload.teks_driver = null; }

      const { error } = await supabase.from('chat_ride').insert([payload]);
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
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#016837" />
          <Text style={{ marginTop: 12, color: '#666' }}>Memuat chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}><Text style={styles.backArrow}>←</Text></TouchableOpacity>
            <Image style={styles.counterpartIcon} source={require('../../../../assets/images/Passenger.png')} resizeMode="cover" />
            <View style={styles.headerTextContainer}><Text style={styles.counterpartName}>{counterpartInfo.nama}</Text><Text style={styles.statusBadge}>Scoot Ride Order #{orderId}</Text></View>
          </View>

          {orderDetail && (
            <View style={styles.orderCard}>
              <View style={styles.orderRow}><Text style={styles.orderLabel}>📍 Jemput:</Text><Text style={styles.orderValue}>{orderDetail.lokasi_jemput}</Text></View>
              <View style={styles.orderRow}><Text style={styles.orderLabel}>📍 Tujuan:</Text><Text style={styles.orderValue}>{orderDetail.lokasi_tujuan}</Text></View>
              <View style={styles.orderRow}><Text style={styles.orderLabel}>💰 Tarif:</Text><Text style={styles.orderValue}>Rp {Number(orderDetail.tarif).toLocaleString('id-ID')}</Text></View>
              <View style={[styles.orderRow, { borderBottomWidth: 0 }]}><Text style={styles.orderLabel}>📊 Status:</Text><Text style={[styles.orderValue, { color: '#FF9500', fontWeight: '700' }]}>{orderDetail.status}</Text></View>
            </View>
          )}

          <ScrollView ref={scrollViewRef} style={styles.chatContainer} contentContainerStyle={{ paddingBottom: 20 }} onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })} showsVerticalScrollIndicator={false}>
            {messages.length === 0 ? (<View style={styles.emptyState}><Text style={styles.emptyText}></Text><Text style={styles.emptyText}>Belum ada pesan</Text></View>) : (messages.map((m) => { const isOwn = m.sender === currentUser; return (<View key={m.id} style={[styles.messageBox, isOwn ? styles.messageBoxOwn : styles.messageBoxOther]}><Text style={[styles.messageText, isOwn ? styles.messageTextOwn : styles.messageTextOther]}>{m.text}</Text><Text style={[styles.messageTime, isOwn ? styles.messageTimeOwn : styles.messageTimeOther]}>{m.timestamp}</Text></View>); }))}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput style={styles.textInput} value={inputText} onChangeText={setInputText} placeholder="Ketikkan pesan..." placeholderTextColor="rgba(0,0,0,0.4)" editable={!isSending} multiline maxLength={500} returnKeyType="send" onSubmitEditing={handleSendMessage} />
            <TouchableOpacity style={[styles.sendButton, (isSending || inputText.trim() === '') && styles.sendButtonDisabled]} onPress={handleSendMessage} disabled={isSending || inputText.trim() === ''} activeOpacity={0.7}><Text style={styles.sendButtonText}>{isSending ? '⏳' : '➤'}</Text></TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  backButton: { padding: 8, marginRight: 8 },
  backArrow: { fontSize: 24, color: '#016837', fontWeight: 'bold' },
  counterpartIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f0f0f0', borderWidth: 2, borderColor: '#016837' },
  headerTextContainer: { marginLeft: 12, flex: 1 },
  counterpartName: { fontSize: 16, fontWeight: '700', color: '#000' },
  statusBadge: { fontSize: 12, color: '#666', marginTop: 4 },
  orderCard: { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#016837' },
  orderRow: { marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  orderLabel: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 },
  orderValue: { fontSize: 13, color: '#000' },
  chatContainer: { flex: 1, marginBottom: 12 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  emptyText: { color: '#999', fontSize: 14, textAlign: 'center' },
  messageBox: { marginVertical: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, maxWidth: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  messageBoxOwn: { alignSelf: 'flex-end', backgroundColor: '#016837', borderBottomRightRadius: 4 },
  messageBoxOther: { alignSelf: 'flex-start', backgroundColor: '#e8e8e8', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 14, lineHeight: 20 },
  messageTextOwn: { color: '#fff' },
  messageTextOther: { color: '#000' },
  messageTime: { fontSize: 10, marginTop: 4 },
  messageTimeOwn: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  messageTimeOther: { color: 'rgba(0,0,0,0.5)', textAlign: 'left' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 16, paddingTop: 12, gap: 8, borderTopWidth: 1, borderTopColor: '#e0e0e0', backgroundColor: '#fff' },
  textInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, fontSize: 14, backgroundColor: '#f9f9f9' },
  sendButton: { backgroundColor: '#016837', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { opacity: 0.4 },
  sendButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' }
});

export default ChatRide_Cust;