import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../hooks/supabaseClient";

interface ChatMessage {
  id_chat: number;
  id_scoot_food: number;
  id_customer: string;
  id_driver: string;
  teks_customer: string | null;
  teks_driver: string | null;
  timestamp: string;
}

interface FoodOrder {
  id: string;
  restaurant_name: string;
  status: string;
}

const Chat_Food: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderId = params.orderId as string;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [driverId, setDriverId] = useState<string>("");
  const [orderInfo, setOrderInfo] = useState<FoodOrder | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!orderId) {
      Alert.alert("Error", "Order ID not found");
      router.back();
      return;
    }

    initializeChat();

    return () => {
      // Cleanup subscription
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [orderId]);

  const initializeChat = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Error", "User not found");
        router.back();
        return;
      }
      setCurrentUserId(user.id);

      // Get order info and driver - UBAH DARI food_orders KE scoot_food
      const { data: orderData, error: orderError } = await supabase
        .from("scoot_food")
        .select("id, restaurant_name, status, driver_id")
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;
      
      setOrderInfo({
        id: orderData.id,
        restaurant_name: orderData.restaurant_name,
        status: orderData.status,
      });

      if (orderData.driver_id) {
        setDriverId(orderData.driver_id);
      }

      // Load existing messages
      await loadMessages();

      // Subscribe to real-time updates for messages
      subscribeToMessages();

      // Subscribe to order updates (to detect when driver is assigned)
      subscribeToOrderUpdates();

      setLoading(false);
    } catch (error) {
      console.error("Error initializing chat:", error);
      Alert.alert("Error", "Failed to initialize chat");
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("chat_food")
        .select("*")
        .eq("id_scoot_food", orderId)
        .order("timestamp", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      
      // Scroll to bottom after loading
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const subscribeToMessages = () => {
    // Create a channel for this specific order
    const channel = supabase
      .channel(`chat_food_${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_food",
          filter: `id_scoot_food=eq.${orderId}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => [...prev, newMessage]);
          
          // Scroll to bottom when new message arrives
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const subscribeToOrderUpdates = () => {
    // Subscribe to order updates to detect when driver is assigned
    const orderChannel = supabase
      .channel(`order_updates_${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "scoot_food",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const updatedOrder = payload.new as any;
          if (updatedOrder.driver_id && !driverId) {
            setDriverId(updatedOrder.driver_id);
            Alert.alert("Info", "Driver telah ditugaskan! Anda sekarang bisa mulai chat.");
          }
          if (updatedOrder.status) {
            setOrderInfo((prev) => prev ? { ...prev, status: updatedOrder.status } : null);
          }
        }
      )
      .subscribe();
  };

  const sendMessage = async () => {
    if (!messageText.trim()) return;
    if (!driverId) {
      Alert.alert("Info", "Driver belum ditugaskan untuk order ini");
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from("chat_food").insert({
        id_scoot_food: orderId,
        id_customer: currentUserId,
        id_driver: driverId,
        teks_customer: messageText.trim(),
        teks_driver: null,
      });

      if (error) throw error;

      setMessageText("");
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
  };

  const renderMessage = (msg: ChatMessage, index: number) => {
    const isCustomer = msg.teks_customer !== null;
    const messageText = isCustomer ? msg.teks_customer : msg.teks_driver;
    const isCurrentUser = isCustomer && msg.id_customer === currentUserId;

    // Check if we need to show date separator
    const showDateSeparator =
      index === 0 ||
      formatDate(msg.timestamp) !== formatDate(messages[index - 1].timestamp);

    return (
      <View key={msg.id_chat}>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>{formatDate(msg.timestamp)}</Text>
          </View>
        )}
        
        <View
          style={[
            styles.messageContainer,
            isCurrentUser ? styles.myMessage : styles.theirMessage,
          ]}
        >
          <View
            style={[
              styles.messageBubble,
              isCurrentUser ? styles.myBubble : styles.theirBubble,
            ]}
          >
            {!isCurrentUser && (
              <Text style={styles.senderName}>Driver</Text>
            )}
            <Text
              style={[
                styles.messageText,
                isCurrentUser ? styles.myMessageText : styles.theirMessageText,
              ]}
            >
              {messageText}
            </Text>
            <Text
              style={[
                styles.timeText,
                isCurrentUser ? styles.myTimeText : styles.theirTimeText,
              ]}
            >
              {formatTime(msg.timestamp)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9800" />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Chat with Driver</Text>
          {orderInfo && (
            <Text style={styles.headerSubtitle}>
              {orderInfo.restaurant_name} • {orderInfo.status}
            </Text>
          )}
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }
      >
        {!driverId && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Driver belum ditugaskan untuk order ini. Chat akan tersedia setelah driver mengambil order Anda.
            </Text>
          </View>
        )}
        
        {messages.length === 0 && driverId ? (
          <View style={styles.emptyChat}>
            <Text style={styles.emptyText}>
              Belum ada pesan. Mulai chat dengan driver Anda!
            </Text>
          </View>
        ) : (
          messages.map((msg, index) => renderMessage(msg, index))
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={driverId ? "Type a message..." : "Waiting for driver..."}
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={500}
          editable={!sending && !!driverId}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!messageText.trim() || sending || !driverId) && styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={!messageText.trim() || sending || !driverId}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.sendButtonText}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: "#FF9800",
    paddingTop: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  backButton: {
    padding: 5,
    width: 40,
  },
  backText: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "300",
  },
  headerInfo: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#FFF",
    opacity: 0.9,
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 15,
    paddingBottom: 20,
  },
  infoBox: {
    backgroundColor: "#FFF3CD",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#FFC107",
  },
  infoText: {
    color: "#856404",
    fontSize: 14,
    lineHeight: 20,
  },
  emptyChat: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: "#999",
    fontSize: 15,
    textAlign: "center",
  },
  dateSeparator: {
    alignItems: "center",
    marginVertical: 15,
  },
  dateText: {
    backgroundColor: "#E0E0E0",
    color: "#666",
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    marginVertical: 4,
  },
  myMessage: {
    alignItems: "flex-end",
  },
  theirMessage: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "75%",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  myBubble: {
    backgroundColor: "#FF9800",
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: "#FFF",
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: "#FFF",
  },
  theirMessageText: {
    color: "#333",
  },
  timeText: {
    fontSize: 11,
    marginTop: 4,
  },
  myTimeText: {
    color: "#FFF",
    opacity: 0.8,
    textAlign: "right",
  },
  theirTimeText: {
    color: "#999",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  input: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    paddingTop: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: "#FF9800",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: "#CCC",
    opacity: 0.5,
  },
  sendButtonText: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
  },
});

export default Chat_Food;