import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Riwayat_Customer = () => {
  const router = useRouter();
  const { nama, nim, email, jenisMotor, plat, userId } = useLocalSearchParams();

  // Buat object params untuk pass ke semua screen
  const userParams = {
    nama: nama || '',
    nim: nim || '',
    email: email || '',
    jenisMotor: jenisMotor || '',
    plat: plat || '',
    userId: userId || ''
  };

  const historyData = [
    {
      id: 1,
      type: "ScootRide",
      image: require('../../../assets/images/ScootRide.png'),
      pickup: "Universitas Sebelas Maret",
      destination: "Solo Grand Mall",
      date: "17 September 2025",
      price: "Rp18.000",
      status: "Selesai"
    },
    {
      id: 2,
      type: "ScootFood",
      image: require('../../../assets/images/ScootFood.png'),
      pickup: "Warung Makan Bu Las",
      destination: "Surya Tenggelam",
      date: "19 September 2025",
      price: "Rp12.000",
      status: "Selesai"
    },
    {
      id: 3,
      type: "ScootRide",
      image: require('../../../assets/images/ScootRide.png'),
      pickup: "Universitas Sebelas Maret",
      destination: "RS Moewardi",
      date: "19 September 2025",
      price: "Rp10.000",
      status: "Selesai"
    },
    {
      id: 4,
      type: "ScootSend",
      image: require('../../../assets/images/ScootSend.png'),
      pickup: "Kartika",
      destination: "Kemahasiswaan UNS",
      date: "28 September 2025",
      price: "Rp6.000",
      status: "Selesai"
    },
  ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Filter Button */}
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterText}>All</Text>
            <Text style={styles.filterIcon}>▼</Text>
          </TouchableOpacity>

          {/* History List */}
          <View style={styles.historyList}>
            {historyData.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                {/* Left Section - Image */}
                <View style={styles.imageContainer}>
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.imagePlaceholderText}>🛵</Text>
                  </View>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{item.type}</Text>
                  </View>
                </View>

                {/* Middle Section - Details */}
                <View style={styles.detailsContainer}>
                  <View style={styles.locationRow}>
                    <View style={styles.dot} />
                    <Text style={styles.locationText}>{item.pickup}</Text>
                  </View>
                  
                  <View style={styles.dividerLine} />
                  
                  <View style={styles.locationRow}>
                    <View style={styles.dot} />
                    <Text style={styles.locationText}>{item.destination}</Text>
                  </View>
                  
                  <Text style={styles.dateText}>{item.date}</Text>
                </View>

                {/* Right Section - Price & Status */}
                <View style={styles.rightSection}>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{item.status}</Text>
                  </View>
                  <Text style={styles.priceText}>{item.price}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity 
            style={styles.navItem}
            onPress={() => router.replace({
              pathname: '/screens/customerfix/PageCustomer',
              params: userParams
            })}
            activeOpacity={0.7}
          >
            <View style={styles.navIconContainer}>
              <View style={styles.homeIcon}>
                <View style={styles.homeIconBase} />
                <View style={styles.homeIconRoof} />
              </View>
            </View>
            <Text style={styles.navText}>Beranda</Text>
          </TouchableOpacity>
          
          <View style={[styles.navItem, styles.navItemActive]}>
            <View style={styles.navIconContainerActive}>
              <View style={styles.historyIcon}>
                <View style={styles.historyIconCircle} />
                <View style={styles.historyIconHand} />
              </View>
            </View>
            <Text style={styles.navTextActive}>Riwayat</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.navItem}
            onPress={() => router.replace({
              pathname: '/screens/customerfix/TermsAndConditionCustomer',
              params: userParams
            })}
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
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#33cc66",
    borderRadius: 21,
    paddingVertical: 12,
    paddingHorizontal: 25,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 15,
    alignSelf: "flex-start",
    gap: 8,
    shadowColor: "#c4bfbf",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  filterText: {
    fontSize: 17,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
  },
  filterIcon: {
    fontSize: 12,
    color: "#fff",
  },
  historyList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  historyCard: {
    backgroundColor: "#33cc66",
    borderRadius: 21,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    shadowColor: "#c4bfbf",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(1, 104, 55, 0.4)",
  },
  imageContainer: {
    alignItems: "center",
    gap: 6,
  },
  imagePlaceholder: {
    width: 92,
    height: 92,
    backgroundColor: "#fff",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholderText: {
    fontSize: 40,
  },
  typeBadge: {
    backgroundColor: "#fff",
    borderRadius: 33,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typeBadgeText: {
    fontSize: 9,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fe95a3",
    textAlign: "center",
  },
  detailsContainer: {
    flex: 1,
    justifyContent: "center",
    gap: 6,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#fff",
  },
  locationText: {
    fontSize: 11,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    flexShrink: 1,
  },
  dividerLine: {
    height: 1,
    backgroundColor: "#fff",
    marginLeft: 15,
    width: "85%",
  },
  dateText: {
    fontSize: 11,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    marginTop: 4,
  },
  rightSection: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  statusBadge: {
    backgroundColor: "#fe95a3",
    borderRadius: 33,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  priceText: {
    fontSize: 11,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#fff",
    textAlign: "right",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  navItem: {
    alignItems: "center",
    flex: 1,
  },
  navItemActive: {
    backgroundColor: "#d2ffde",
    borderRadius: 18,
    paddingVertical: 8,
  },
  navIconContainer: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  navIconContainerActive: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  homeIcon: {
    width: 28,
    height: 28,
    position: "relative",
  },
  homeIconBase: {
    width: 22,
    height: 18,
    borderWidth: 2.5,
    borderColor: "#016837",
    borderTopWidth: 0,
    position: "absolute",
    bottom: 0,
    left: 3,
  },
  homeIconRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#016837",
    position: "absolute",
    top: 0,
  },
  historyIcon: {
    width: 28,
    height: 28,
    position: "relative",
  },
  historyIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2.5,
    borderColor: "#016837",
  },
  historyIconHand: {
    width: 2,
    height: 9,
    backgroundColor: "#016837",
    position: "absolute",
    top: 7,
    left: 12,
  },
  termsIcon: {
    width: 24,
    height: 28,
    position: "relative",
  },
  termsIconPaper: {
    width: 22,
    height: 28,
    borderWidth: 2.5,
    borderColor: "#016837",
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  termsIconLines: {
    position: "absolute",
    top: 7,
    left: 4,
    width: 14,
    height: 12,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: "#016837",
  },
  navText: {
    fontSize: 10,
    color: "#016837",
    marginTop: 4,
    fontFamily: "Montserrat-Regular",
  },
  navTextActive: {
    fontSize: 10,
    color: "#016837",
    marginTop: 4,
    fontFamily: "Montserrat-Regular",
  },
});

export default Riwayat_Customer;