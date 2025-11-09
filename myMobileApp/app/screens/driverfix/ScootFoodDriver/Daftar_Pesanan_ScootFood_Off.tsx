import { Stack, useRouter } from "expo-router";
import * as React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Daftar_Pesanan_ScootFood_Off = () => {
  const offImage = require('../../../../assets/images/Off.png');
  const router = useRouter();

  const handleToggle = () => {
    router.push('/screens/driverfix/ScootFoodDriver/Daftar_Pesanan_ScootFood_On');
  };

  return (
	<>
	  <Stack.Screen options={{ headerShown: false }} />
	  <SafeAreaView style={styles.container}>
		<View style={styles.content}>
		  {/* Header */}
		  <Text style={styles.title}>DAFTAR PESANAN</Text>
		
		<TouchableOpacity 
		  style={styles.toggleContainer}
		  onPress={handleToggle}
		  activeOpacity={0.8}
		>
		  <View style={styles.toggleCircle} />
		  <Text style={styles.toggleText}>Off</Text>
		</TouchableOpacity>

		{/* Message */}
		<Text style={styles.message}>
		  Hidupin dulu biar bisa{'\n'}menerima pesanan
		</Text>

		{/* Image */}
		<View style={styles.imageContainer}>
		  <Image
			source={offImage}
			style={styles.offImage}
			resizeMode="contain"
		  />
		</View>
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
  content: {
	flex: 1,
	paddingHorizontal: 20,
	paddingTop: 20,
  },
  title: {
	fontSize: 22,
	fontWeight: "700",
	fontFamily: "Montserrat-Bold",
	color: "#016837",
	lineHeight: 28,
	textAlign: "center",
	marginBottom: 15,
  },
  toggleContainer: {
	flexDirection: "row",
	alignItems: "center",
	alignSelf: "flex-end",
	backgroundColor: "#e8e8e8",
	borderRadius: 50,
	paddingVertical: 5,
	paddingRight: 15,
	paddingLeft: 5,
	gap: 8,
	marginBottom: 20,
  },
  toggleCircle: {
	width: 30,
	height: 30,
	borderRadius: 15,
	backgroundColor: "#016837",
  },
  toggleText: {
	fontSize: 14,
	fontWeight: "700",
	fontFamily: "Montserrat-Bold",
	color: "#016837",
  },
  message: {
	fontSize: 16,
	fontFamily: "Montserrat-Regular",
	color: "#c4bfbf",
	textAlign: "center",
	lineHeight: 24,
	marginTop: 80,
  },
  imageContainer: {
	flex: 1,
	justifyContent: "flex-end",
	alignItems: "center",
	paddingBottom: 40,
  },
  offImage: {
	width: 280,
	height: 280,
  },
});

export default Daftar_Pesanan_ScootFood_Off;