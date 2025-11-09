import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../hooks/supabaseClient";
import { Customer } from "../../src/types";

const { width } = Dimensions.get("window");

interface FoodOrder {
  id: string;
  restaurant_name: string;
  delivery_address: string;
  items: string;
  total_price: number;
  delivery_fee: number;
  status: string;
  created_at: string;
  notes?: string;
  driver_id?: string;
}

const ScootFoodCust: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [activeOrders, setActiveOrders] = useState<FoodOrder[]>([]);
  
  // Form states
  const [restaurantName, setRestaurantName] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [items, setItems] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [showOrderForm, setShowOrderForm] = useState(false);

  const DELIVERY_FEE = 5000;

  useEffect(() => {
    fetchCustomerData();
    fetchActiveOrders();
  }, []);

  const fetchCustomerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (error) throw error;
        setCustomer(data);
      }
    } catch (error) {
      console.error("Error fetching customer:", error);
    }
  };

  const fetchActiveOrders = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("scoot_food")
          .select("*")
          .eq("customer_id", user.id)
          .in("status", ["pending", "preparing", "on_delivery"])
          .order("created_at", { ascending: false });

        if (error) throw error;
        setActiveOrders(data || []);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      Alert.alert("Error", "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!restaurantName || !deliveryAddress || !items || !totalPrice) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    const price = parseFloat(totalPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert("Error", "Please enter a valid price");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const { data: newOrder, error } = await supabase
        .from("scoot_food")
        .insert({
          customer_id: user.id,
          restaurant_name: restaurantName,
          delivery_address: deliveryAddress,
          items: items,
          total_price: price,
          delivery_fee: DELIVERY_FEE,
          status: "pending",
          notes: notes || null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Clear form
      setRestaurantName("");
      setDeliveryAddress("");
      setItems("");
      setTotalPrice("");
      setNotes("");
      setShowOrderForm(false);
      
      // Langsung redirect ke ChatFood dengan order ID
      router.push({
        pathname: "../screens/ChatFood",
        params: { orderId: newOrder.id },
      });

    } catch (error) {
      console.error("Error placing order:", error);
      Alert.alert("Error", "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("scoot_food")
                .update({ status: "cancelled" })
                .eq("id", orderId);

              if (error) throw error;
              Alert.alert("Success", "Order cancelled");
              fetchActiveOrders();
            } catch (error) {
              Alert.alert("Error", "Failed to cancel order");
            }
          },
        },
      ]
    );
  };

  const handleChatWithDriver = (orderId: string, hasDriver: boolean) => {
    if (!hasDriver) {
      Alert.alert(
        "Driver Not Assigned",
        "Driver belum ditugaskan untuk order ini. Chat akan tersedia setelah driver mengambil order Anda."
      );
      return;
    }
    
    router.push({
      pathname: "../screens/ChatFood",
      params: { orderId },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "#FFA500";
      case "preparing": return "#2196F3";
      case "on_delivery": return "#9C27B0";
      case "delivered": return "#4CAF50";
      default: return "#757575";
    }
  };

  const getGrandTotal = (totalPrice: number, deliveryFee: number) => {
    return totalPrice + deliveryFee;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ScootFood</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {customer && (
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeText}>Hello, {customer.nama}!</Text>
            <Text style={styles.subText}>Order food from your favorite restaurants</Text>
          </View>
        )}

        {!showOrderForm ? (
          <TouchableOpacity
            style={styles.orderNewButton}
            onPress={() => setShowOrderForm(true)}
          >
            <Text style={styles.orderNewButtonText}>+ Order Food Now</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.orderForm}>
            <Text style={styles.formTitle}>Place Your Order</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Restaurant Name *"
              value={restaurantName}
              onChangeText={setRestaurantName}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Delivery Address *"
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Items (e.g., 2x Nasi Goreng, 1x Es Teh) *"
              value={items}
              onChangeText={setItems}
              multiline
              numberOfLines={3}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Food Price (Rp) *"
              value={totalPrice}
              onChangeText={setTotalPrice}
              keyboardType="numeric"
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Special Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
            />

            <View style={styles.priceBreakdown}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Food Price:</Text>
                <Text style={styles.priceValue}>
                  Rp {totalPrice ? parseFloat(totalPrice).toLocaleString() : "0"}
                </Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Delivery Fee:</Text>
                <Text style={styles.priceValue}>Rp {DELIVERY_FEE.toLocaleString()}</Text>
              </View>
              <View style={[styles.priceRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalValue}>
                  Rp {totalPrice ? getGrandTotal(parseFloat(totalPrice), DELIVERY_FEE).toLocaleString() : DELIVERY_FEE.toLocaleString()}
                </Text>
              </View>
            </View>

            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowOrderForm(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handlePlaceOrder}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? "Placing..." : "Place Order"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Active Orders</Text>
        
        {loading && activeOrders.length === 0 ? (
          <ActivityIndicator size="large" color="#FF9800" style={styles.loader} />
        ) : activeOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No active orders</Text>
          </View>
        ) : (
          activeOrders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={styles.statusText}>{order.status.toUpperCase().replace("_", " ")}</Text>
                </View>
              </View>
              
              <View style={styles.orderDetail}>
                <Text style={styles.detailLabel}>Restaurant:</Text>
                <Text style={styles.detailValue}>{order.restaurant_name}</Text>
              </View>
              
              <View style={styles.orderDetail}>
                <Text style={styles.detailLabel}>Deliver to:</Text>
                <Text style={styles.detailValue}>{order.delivery_address}</Text>
              </View>
              
              <View style={styles.orderDetail}>
                <Text style={styles.detailLabel}>Items:</Text>
                <Text style={styles.detailValue}>{order.items}</Text>
              </View>

              {order.notes && (
                <View style={styles.orderDetail}>
                  <Text style={styles.detailLabel}>Notes:</Text>
                  <Text style={styles.detailValue}>{order.notes}</Text>
                </View>
              )}

              <View style={styles.divider} />
              
              <View style={styles.orderDetail}>
                <Text style={styles.detailLabel}>Food Price:</Text>
                <Text style={styles.detailValue}>Rp {order.total_price.toLocaleString()}</Text>
              </View>
              
              <View style={styles.orderDetail}>
                <Text style={styles.detailLabel}>Delivery Fee:</Text>
                <Text style={styles.detailValue}>Rp {order.delivery_fee.toLocaleString()}</Text>
              </View>
              
              <View style={styles.orderDetail}>
                <Text style={styles.totalLabel}>Grand Total:</Text>
                <Text style={styles.grandTotalValue}>
                  Rp {getGrandTotal(order.total_price, order.delivery_fee).toLocaleString()}
                </Text>
              </View>

              <View style={styles.actionButtons}>
                {/* Chat Button - Available for preparing and on_delivery status */}
                {(order.status === "preparing" || order.status === "on_delivery") && (
                  <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() => handleChatWithDriver(order.id, !!order.driver_id)}
                  >
                    <Text style={styles.chatButtonText}>💬 Chat with Driver</Text>
                  </TouchableOpacity>
                )}

                {/* Cancel Button - Only for pending status */}
                {order.status === "pending" && (
                  <TouchableOpacity
                    style={styles.cancelOrderButton}
                    onPress={() => handleCancelOrder(order.id)}
                  >
                    <Text style={styles.cancelOrderButtonText}>Cancel Order</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FF9800",
    paddingTop: 50,
  },
  backButton: {
    padding: 5,
  },
  backText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFF",
  },
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeCard: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  subText: {
    fontSize: 14,
    color: "#666",
  },
  orderNewButton: {
    backgroundColor: "#FF9800",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  orderNewButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  orderForm: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: {
    height: 70,
    textAlignVertical: "top",
  },
  priceBreakdown: {
    backgroundColor: "#F9F9F9",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: "#666",
  },
  priceValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#DDD",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF9800",
  },
  formButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDD",
    marginRight: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "600",
  },
  submitButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#FF9800",
    alignItems: "center",
  },
  submitButtonText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  loader: {
    marginTop: 20,
  },
  emptyState: {
    backgroundColor: "#FFF",
    padding: 40,
    borderRadius: 12,
    alignItems: "center",
  },
  emptyText: {
    color: "#999",
    fontSize: 16,
  },
  orderCard: {
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  orderId: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#666",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  orderDetail: {
    flexDirection: "row",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: "#333",
    flex: 1,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#EEE",
    marginVertical: 10,
  },
  grandTotalValue: {
    fontSize: 16,
    color: "#FF9800",
    flex: 1,
    fontWeight: "bold",
  },
  actionButtons: {
    marginTop: 10,
  },
  chatButton: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  chatButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 15,
  },
  cancelOrderButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F44336",
    alignItems: "center",
  },
  cancelOrderButtonText: {
    color: "#F44336",
    fontWeight: "600",
  },
});

export default ScootFoodCust;