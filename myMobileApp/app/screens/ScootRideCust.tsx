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

interface RideBooking {
  id: string;
  pickup_location: string;
  destination: string;
  vehicle_type: string;
  estimated_fare: number;
  final_fare?: number;
  distance?: number;
  status: string;
  driver_name?: string;
  driver_phone?: string;
  vehicle_number?: string;
  booking_time: string;
  pickup_time?: string;
  dropoff_time?: string;
}

const ScootRideCust: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [activeBookings, setActiveBookings] = useState<RideBooking[]>([]);
  
  // Form states
  const [pickupLocation, setPickupLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [vehicleType, setVehicleType] = useState("scoot_bike");
  const [showBookingForm, setShowBookingForm] = useState(false);

  useEffect(() => {
    fetchCustomerData();
    fetchActiveBookings();
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

  const fetchActiveBookings = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("ride_bookings")
          .select("*")
          .eq("customer_id", user.id)
          .in("status", ["pending", "driver_assigned", "picked_up", "in_progress"])
          .order("booking_time", { ascending: false });

        if (error) throw error;
        setActiveBookings(data || []);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      Alert.alert("Error", "Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  };

  const calculateEstimatedFare = (vehicle: string): number => {
    // Base fare berdasarkan tipe kendaraan
    const baseFares: { [key: string]: number } = {
      scoot_bike: 3000, // Motor
      scoot_car: 10000, // Mobil
      scoot_xl: 15000,  // Mobil besar
    };
    // Estimasi dengan asumsi jarak 5km
    const perKmRate: { [key: string]: number } = {
      scoot_bike: 2000,
      scoot_car: 3000,
      scoot_xl: 4000,
    };
    const estimatedDistance = 5; // km
    return (baseFares[vehicle] || 3000) + (perKmRate[vehicle] || 2000) * estimatedDistance;
  };

  const handleBookRide = async () => {
    if (!pickupLocation || !destination) {
      Alert.alert("Error", "Please fill in pickup and destination locations");
      return;
    }

    if (pickupLocation === destination) {
      Alert.alert("Error", "Pickup and destination cannot be the same");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const estimatedFare = calculateEstimatedFare(vehicleType);

      const { error } = await supabase.from("ride_bookings").insert({
        customer_id: user.id,
        pickup_location: pickupLocation,
        destination: destination,
        vehicle_type: vehicleType,
        estimated_fare: estimatedFare,
        status: "pending",
        booking_time: new Date().toISOString(),
      });

      if (error) throw error;

      Alert.alert(
        "Success", 
        "Ride booked successfully! We're finding a driver for you.",
        [{ text: "OK", onPress: () => {
          setPickupLocation("");
          setDestination("");
          setVehicleType("scoot_bike");
          setShowBookingForm(false);
          fetchActiveBookings();
        }}]
      );
    } catch (error) {
      console.error("Error booking ride:", error);
      Alert.alert("Error", "Failed to book ride. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRide = async (bookingId: string, status: string) => {
    if (status === "picked_up" || status === "in_progress") {
      Alert.alert("Cannot Cancel", "Ride is already in progress. Please contact driver.");
      return;
    }

    Alert.alert(
      "Cancel Ride",
      "Are you sure you want to cancel this ride?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("ride_bookings")
                .update({ status: "cancelled" })
                .eq("id", bookingId);

              if (error) throw error;
              Alert.alert("Success", "Ride cancelled successfully");
              fetchActiveBookings();
            } catch (error) {
              Alert.alert("Error", "Failed to cancel ride");
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "#FFA500";
      case "driver_assigned": return "#2196F3";
      case "picked_up": return "#9C27B0";
      case "in_progress": return "#00BCD4";
      case "completed": return "#4CAF50";
      case "cancelled": return "#F44336";
      default: return "#757575";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending": return "Finding Driver";
      case "driver_assigned": return "Driver Assigned";
      case "picked_up": return "Picked Up";
      case "in_progress": return "In Progress";
      case "completed": return "Completed";
      case "cancelled": return "Cancelled";
      default: return status;
    }
  };

  const getVehicleTypeName = (type: string) => {
    switch (type) {
      case "scoot_bike": return "ScootBike";
      case "scoot_car": return "ScootCar";
      case "scoot_xl": return "ScootXL";
      default: return type;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ScootRide</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {customer && (
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeText}>Hello, {customer.nama}! 👋</Text>
            <Text style={styles.subText}>Where would you like to go today?</Text>
          </View>
        )}

        {!showBookingForm ? (
          <TouchableOpacity
            style={styles.bookNewButton}
            onPress={() => setShowBookingForm(true)}
          >
            <Text style={styles.bookNewButtonText}>🚗 Book a Ride Now</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.bookingForm}>
            <Text style={styles.formTitle}>Book Your Ride</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>📍 Pickup Location</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter pickup location"
                value={pickupLocation}
                onChangeText={setPickupLocation}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>🎯 Destination</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter destination"
                value={destination}
                onChangeText={setDestination}
              />
            </View>
            
            <Text style={styles.label}>🚘 Choose Vehicle Type</Text>
            <View style={styles.vehicleOptions}>
              <TouchableOpacity
                style={[
                  styles.vehicleOption,
                  vehicleType === "scoot_bike" && styles.vehicleOptionSelected,
                ]}
                onPress={() => setVehicleType("scoot_bike")}
              >
                <Text style={styles.vehicleEmoji}>🏍️</Text>
                <Text
                  style={[
                    styles.vehicleOptionText,
                    vehicleType === "scoot_bike" && styles.vehicleOptionTextSelected,
                  ]}
                >
                  ScootBike
                </Text>
                <Text style={styles.vehicleSubText}>Fast & Affordable</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.vehicleOption,
                  vehicleType === "scoot_car" && styles.vehicleOptionSelected,
                ]}
                onPress={() => setVehicleType("scoot_car")}
              >
                <Text style={styles.vehicleEmoji}>🚗</Text>
                <Text
                  style={[
                    styles.vehicleOptionText,
                    vehicleType === "scoot_car" && styles.vehicleOptionTextSelected,
                  ]}
                >
                  ScootCar
                </Text>
                <Text style={styles.vehicleSubText}>Comfortable</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.vehicleOption,
                  vehicleType === "scoot_xl" && styles.vehicleOptionSelected,
                ]}
                onPress={() => setVehicleType("scoot_xl")}
              >
                <Text style={styles.vehicleEmoji}>🚙</Text>
                <Text
                  style={[
                    styles.vehicleOptionText,
                    vehicleType === "scoot_xl" && styles.vehicleOptionTextSelected,
                  ]}
                >
                  ScootXL
                </Text>
                <Text style={styles.vehicleSubText}>Extra Space</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.fareEstimate}>
              <Text style={styles.fareLabel}>Estimated Fare:</Text>
              <Text style={styles.fareText}>
                Rp {calculateEstimatedFare(vehicleType).toLocaleString()}
              </Text>
            </View>

            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowBookingForm(false);
                  setPickupLocation("");
                  setDestination("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleBookRide}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? "Booking..." : "Book Now"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>
          {activeBookings.length > 0 ? "Your Rides" : "No Active Rides"}
        </Text>
        
        {loading && activeBookings.length === 0 ? (
          <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />
        ) : activeBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🚗</Text>
            <Text style={styles.emptyText}>No active rides</Text>
            <Text style={styles.emptySubText}>Book a ride to get started!</Text>
          </View>
        ) : (
          activeBookings.map((booking) => (
            <View key={booking.id} style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <View>
                  <Text style={styles.bookingId}>Order #{booking.id.slice(0, 8).toUpperCase()}</Text>
                  <Text style={styles.bookingTime}>
                    {new Date(booking.booking_time).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(booking.status)}</Text>
                </View>
              </View>

              <View style={styles.locationContainer}>
                <View style={styles.locationDot} />
                <View style={styles.locationLine} />
                <View style={[styles.locationDot, styles.destinationDot]} />
                
                <View style={styles.locationDetails}>
                  <View style={styles.locationItem}>
                    <Text style={styles.locationLabel}>Pickup</Text>
                    <Text style={styles.locationValue}>{booking.pickup_location}</Text>
                  </View>
                  
                  <View style={[styles.locationItem, styles.destinationItem]}>
                    <Text style={styles.locationLabel}>Destination</Text>
                    <Text style={styles.locationValue}>{booking.destination}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />
              
              <View style={styles.bookingDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>🚘 Vehicle Type:</Text>
                  <Text style={styles.detailValue}>{getVehicleTypeName(booking.vehicle_type)}</Text>
                </View>

                {booking.driver_name && (
                  <>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>👤 Driver:</Text>
                      <Text style={styles.detailValue}>{booking.driver_name}</Text>
                    </View>
                    {booking.driver_phone && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>📞 Phone:</Text>
                        <Text style={styles.detailValue}>{booking.driver_phone}</Text>
                      </View>
                    )}
                    {booking.vehicle_number && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>🚗 Plate:</Text>
                        <Text style={styles.detailValue}>{booking.vehicle_number}</Text>
                      </View>
                    )}
                  </>
                )}

                {booking.distance && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>📏 Distance:</Text>
                    <Text style={styles.detailValue}>{booking.distance.toFixed(1)} km</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>💰 Fare:</Text>
                  <Text style={styles.fareValue}>
                    Rp {(booking.final_fare || booking.estimated_fare).toLocaleString()}
                  </Text>
                </View>
              </View>

              {(booking.status === "pending" || booking.status === "driver_assigned") && (
                <TouchableOpacity
                  style={styles.cancelRideButton}
                  onPress={() => handleCancelRide(booking.id, booking.status)}
                >
                  <Text style={styles.cancelRideButtonText}>Cancel Ride</Text>
                </TouchableOpacity>
              )}

              {booking.status === "driver_assigned" && (
                <View style={styles.driverInfoBanner}>
                  <Text style={styles.driverInfoText}>
                    Driver is on the way to pick you up! 🚗
                  </Text>
                </View>
              )}
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
    backgroundColor: "#4CAF50",
    paddingTop: 50,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
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
    fontSize: 22,
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
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  subText: {
    fontSize: 15,
    color: "#666",
  },
  bookNewButton: {
    backgroundColor: "#4CAF50",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  bookNewButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  bookingForm: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#FAFAFA",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    marginTop: 10,
    color: "#333",
  },
  vehicleOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  vehicleOption: {
    flex: 1,
    padding: 15,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    marginHorizontal: 5,
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  vehicleOptionSelected: {
    backgroundColor: "#E8F5E9",
    borderColor: "#4CAF50",
  },
  vehicleEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  vehicleOptionText: {
    color: "#333",
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 4,
  },
  vehicleOptionTextSelected: {
    color: "#4CAF50",
  },
  vehicleSubText: {
    fontSize: 11,
    color: "#999",
  },
  fareEstimate: {
    backgroundColor: "#E8F5E9",
    padding: 15,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  fareLabel: {
    fontSize: 15,
    color: "#333",
    fontWeight: "600",
  },
  fareText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  formButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "700",
    fontSize: 16,
  },
  submitButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    elevation: 2,
  },
  submitButtonDisabled: {
    backgroundColor: "#A5D6A7",
  },
  submitButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  loader: {
    marginTop: 30,
  },
  emptyState: {
    backgroundColor: "#FFF",
    padding: 50,
    borderRadius: 16,
    alignItems: "center",
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyText: {
    color: "#999",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 5,
  },
  emptySubText: {
    color: "#BBB",
    fontSize: 14,
  },
  bookingCard: {
    backgroundColor: "#FFF",
    padding: 18,
    borderRadius: 16,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  bookingId: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  bookingTime: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  locationContainer: {
    flexDirection: "row",
    marginBottom: 15,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4CAF50",
    marginTop: 4,
  },
  locationLine: {
    width: 2,
    backgroundColor: "#E0E0E0",
    marginLeft: 5,
    position: "absolute",
    top: 16,
    bottom: 20,
    left: 5,
  },
  destinationDot: {
    backgroundColor: "#F44336",
    marginTop: 12,
  },
  locationDetails: {
    flex: 1,
    marginLeft: 15,
  },
  locationItem: {
    marginBottom: 20,
  },
  destinationItem: {
    marginBottom: 0,
  },
  locationLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  locationValue: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 15,
  },
  bookingDetails: {
    gap: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
    textAlign: "right",
    flex: 1,
  },
  fareValue: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "bold",
    textAlign: "right",
    flex: 1,
  },
  cancelRideButton: {
    marginTop: 15,
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#F44336",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
  },
  cancelRideButtonText: {
    color: "#F44336",
    fontWeight: "700",
    fontSize: 15,
  },
  driverInfoBanner: {
    marginTop: 15,
    padding: 12,
    backgroundColor: "#E3F2FD",
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },
  driverInfoText: {
    color: "#1976D2",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default ScootRideCust;