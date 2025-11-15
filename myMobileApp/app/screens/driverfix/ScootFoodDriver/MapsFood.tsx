import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MapsFood = () => {
  const router = useRouter();
  const { orderId, restaurant, item, price } = useLocalSearchParams();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.viewBg}>
        <View style={[styles.view, styles.viewBg]}>
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          {/* Maps Container */}
          <View style={styles.mapsContainer}>
            <Image 
              style={styles.mapsImage} 
              source={require('../../../../assets/images/maps.png')}
              resizeMode="cover"
            />
          </View>

          {/* Optional: Tombol Hubungi */}
          <TouchableOpacity 
            style={[styles.button, styles.hubungiButton]}
            activeOpacity={0.8}
            onPress={() =>
              router.push({
                pathname: '/screens/driverfix/ScootFoodDriver/HalamanChat_Food_Driver',
                params: { orderId } // langsung arahkan ke halaman chat berdasarkan orderId
              })
            }
          >
            <Text style={styles.buttonText}>Hubungi</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  viewBg: { backgroundColor: "#fff", flex: 1 },
  view: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  backButton: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  backArrow: { fontSize: 32, color: '#016837', fontWeight: 'bold' },
  mapsContainer: { backgroundColor: 'rgba(91, 211, 131, 0.5)', borderRadius: 15, padding: 10, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 40, elevation: 40, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.1)' },
  mapsImage: { width: '100%', height: 300, borderRadius: 10 },
  button: { backgroundColor: '#33cc66', borderRadius: 34, paddingVertical: 12, alignItems: 'center', marginBottom: 12, shadowColor: "rgba(0, 0, 0, 0.25)", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 20, elevation: 20 },
  hubungiButton: { backgroundColor: '#fe95a3' },
  buttonText: { color: '#fff', fontFamily: 'Montserrat-Bold', fontWeight: '700', fontSize: 16, textAlign: 'center' },
});

export default MapsFood;