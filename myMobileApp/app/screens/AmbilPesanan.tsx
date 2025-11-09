import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../hooks/supabaseClient';

interface Message {
  id: number;
  sender: 'customer' | 'driver';
  text: string;
  timestamp: string;
}

interface ChatMessage {
  id_chat: number;
  id_scoot_ride: number;
  id_customer: string;
  id_driver: string;
  teks_customer: string | null;
  teks_driver: string | null;
  timestamp: string;
}

const AmbilPesanan: React.FC = () => {
  const params = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);
  
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

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentUser, setCurrentUser] = useState<'customer' | 'driver'>('customer');
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedIds, setResolvedIds] = useState({
     customerId: orderData.customerId,
     driverId: orderData.driverId,
   });
   const [authUserId, setAuthUserId] = useState<string>('');
   const [resolving, setResolving] = useState(false);

  // helper: try resolve user id from stored NIM (used on web if auth session missing)
  const resolveFromStoredNim = async () => {
    try {
      setResolving(true);
      const storedNim = await AsyncStorage.getItem('nim');
      if (!storedNim) return;
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
        return;
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
        return;
      }
    } catch (e) {
      console.error('resolveFromStoredNim error', e);
    } finally {
      setResolving(false);
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

  // Tentukan tabel chat berdasarkan jenis layanan
  const getChatTable = () => {
    switch (orderData.serviceType) {
      case 'ride':
        return 'chat_ride';
      case 'food':
        return 'chat_food';
      case 'send':
        return 'chat_send';
      default:
        return 'chat_ride';
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

  // Setup real-time subscription
  useEffect(() => {
    const detectUserRole = async () => {
      try {
        // try getUser -> fallback to getSession -> fallback to stored nim lookup
        let userId: string | undefined;
        try {
          const { data: authResp } = await supabase.auth.getUser();
          userId = authResp?.user?.id;
        } catch (e) {
          // ignore
        }
        if (!userId) {
          try {
            const { data: sessionResp } = await supabase.auth.getSession();
            userId = sessionResp?.session?.user?.id;
          } catch (e) {
            // ignore
          }
        }
        // if still not found, try AsyncStorage NIM-based lookup
        if (!userId) {
          await resolveFromStoredNim();
          const u = authUserId; // may have been set
          if (!u) {
            console.warn('User ID not found from auth or NIM');
            return;
          }
          userId = u;
        }

        console.log('🔍 Resolved Auth User ID:', userId);
        setAuthUserId(userId);

        if (!userId) {
          console.error('❌ User ID tidak ditemukan');
          return;
        }

        // Cek apakah user adalah customer atau driver
        const { data: custCheck } = await supabase
          .from('customer')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
        
        const { data: drvCheck } = await supabase
          .from('driver')
          .select('id')
          .eq('id', userId)
          .maybeSingle();

        if (custCheck) {
          setCurrentUser('customer');
          console.log('✅ Logged in as CUSTOMER');
          // Set customerId ke auth user, driverId dari params atau query order
          setResolvedIds(prev => ({ 
            customerId: userId,
            driverId: prev.driverId || orderData.driverId
          }));
        } else if (drvCheck) {
          setCurrentUser('driver');
          console.log('✅ Logged in as DRIVER');
          // Set driverId ke auth user, customerId dari params atau query order
          setResolvedIds(prev => ({ 
            customerId: prev.customerId || orderData.customerId,
            driverId: userId
          }));
        }
      } catch (error) {
        console.error('Error detecting user role:', error);
      }
    };

    detectUserRole();
    loadMessages(); // Load initial messages

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
          // Handle new message
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
  }, [orderData.id]);

  // Perbaikan send message untuk realtime
  const handleSendMessage = async () => {
    if (inputText.trim() === '') return;
    setIsLoading(true);

    try {
      const { table, idColumn } = getChatMeta(orderData.serviceType);
      const orderId = parseInt(orderData.id, 10);
      
      // ensure we have authUserId; attempt resolveFromStoredNim if missing
      if (!authUserId && !resolving) {
        await resolveFromStoredNim();
      }
      if (!authUserId) {
        // still missing -> proceed but attempt to use resolvedIds; warn user
        console.warn('authUserId missing, will attempt to send using resolvedIds');
      }

      // Gunakan resolvedIds yang sudah diset saat detectUserRole
      let finalCustomerId = resolvedIds.customerId || orderData.customerId;
      let finalDriverId = resolvedIds.driverId || orderData.driverId;

      // If authUserId corresponds to one role, ensure both IDs set using authUserId
      if (authUserId) {
        if (currentUser === 'customer') finalCustomerId = authUserId;
        if (currentUser === 'driver') finalDriverId = authUserId;
      }

       // Validasi akhir: pastikan tidak NULL
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
        // set timestamp to current time (ISO) at send time
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
      
      // Tidak perlu reload karena realtime subscription akan otomatis update
      // Tapi untuk fallback, reload setelah delay
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

  const handleConfirmPickup = () => {
    Alert.alert(
      'Konfirmasi Pengambilan',
      'Apakah Anda yakin pesanan sudah diambil?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Konfirmasi',
          onPress: () => {
            Alert.alert('Berhasil', 'Pengambilan pesanan telah dikonfirmasi');
          }
        }
      ]
    );
  };

  const handleReportProblem = () => {
    Alert.alert(
      'Laporkan Masalah',
      'Silakan hubungi customer service kami',
      [{ text: 'OK' }]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>📦</Text>
            </View>
            <View>
              <Text style={styles.title}>Ambil Pesanan</Text>
              <Text style={styles.orderId}>ID Pesanan: #{orderData.id}</Text>
            </View>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Dalam Perjalanan</Text>
          </View>
        </View>

        {/* Order Info */}
        <View style={styles.orderInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>👤</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>CUSTOMER</Text>
              <Text style={styles.infoValue}>Budi Santoso</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🚗</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>DRIVER</Text>
              <Text style={styles.infoValue}>Ahmad Ridwan</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📍</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>ASAL</Text>
              <Text style={styles.infoValue}>{orderData.asal}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🎯</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>TUJUAN</Text>
              <Text style={styles.infoValue}>{orderData.tujuan}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📞</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>KONTAK</Text>
              <Text style={styles.infoValue}>+62 812-3456-7890</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>💰</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>TARIF</Text>
              <Text style={styles.infoValue}>{orderData.tarif}</Text>
            </View>
          </View>
        </View>

        {/* Chat Container */}
        <View style={styles.chatContainer}>
          <Text style={styles.chatTitle}>Chat dengan Customer</Text>
          <ScrollView 
            ref={scrollViewRef}
            style={styles.messagesContainer}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatText}>Belum ada pesan</Text>
              </View>
            ) : (
              messages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageBubble,
                    message.sender === currentUser ? styles.myMessage : styles.theirMessage
                  ]}
                >
                  <Text style={styles.senderLabel}>
                    {message.sender === 'customer' ? 'Customer' : 'Driver'}
                  </Text>
                  <Text style={[
                    styles.messageText,
                    message.sender === currentUser ? styles.myMessageText : styles.theirMessageText
                  ]}>
                    {message.text}
                  </Text>
                  <Text style={[
                    styles.timestamp,
                    message.sender === currentUser ? styles.myTimestamp : styles.theirTimestamp
                  ]}>
                    {message.timestamp}
                  </Text>
                </View>
              ))
            )
            }

          </ScrollView>
        </View>
      </ScrollView>

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ketik pesan..."
          multiline
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={isLoading || inputText.trim() === ''}
        >
          <Text style={styles.sendButtonText}>
            {isLoading ? '...' : '➤'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.confirmButton}
          onPress={handleConfirmPickup}
        >
          <Text style={styles.buttonText}>Konfirmasi Pengambilan</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.reportButton}
          onPress={handleReportProblem}
        >
          <Text style={styles.buttonText}>Laporkan Masalah</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default AmbilPesanan;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  iconContainer: {
    backgroundColor: '#4F46E5',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  orderId: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '600',
  },
  orderInfo: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
    gap: 12,
  },
  infoIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  chatContainer: {
    backgroundColor: '#fff',
    padding: 20,
    minHeight: 300,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 15,
  },
  messagesContainer: {
    maxHeight: 300,
  },
  emptyChat: {
    padding: 20,
    alignItems: 'center',
  },
  emptyChatText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#4F46E5',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E7EB',
    borderBottomLeftRadius: 4,
  },
  senderLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
    opacity: 0.8,
  },
  messageText: {
    fontSize: 14,
  },
  myMessageText: {
    color: '#fff',
  },
  theirMessageText: {
    color: '#1F2937',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
  },
  myTimestamp: {
    color: '#C7D2FE',
  },
  theirTimestamp: {
    color: '#6B7280',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#4F46E5',
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    gap: 10,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#10B981',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  reportButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});