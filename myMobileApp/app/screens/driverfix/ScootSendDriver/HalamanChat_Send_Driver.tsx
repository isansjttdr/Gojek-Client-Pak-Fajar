import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const HalamanChat_Send_Driver = () => {
  const router = useRouter();
  const { customerName, customerPhoto } = useLocalSearchParams();
  	
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
                    source={customerPhoto ? { uri: customerPhoto } : require('../../../../assets/images/Passenger.png')}
                    resizeMode="cover" 
                  />
                  <Text style={styles.customerName}>{customerName || "Customer"}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>Antar</Text>
                  </View>
                </View>

                {/* Chat Messages Container */}
                <View style={styles.chatContainer}>
                  
                  {/* Message 1 - User Request */}
                  <View style={styles.messageBoxUser}>
                    <Text style={styles.messageTitle}>Hallo, tolong antar barang saya :</Text>
                    <Text style={styles.messageDetails}>{`Dari        : Kos kembang indah jaya
Ke           : UPT TIK Fatisda
Barang  : Komputer Gaming
Berat      : 5 Kg`}</Text>
                    <Text style={styles.messageFooter}>Terimakasih, saya tunggu ya 😊</Text>
                    <Text style={styles.timeStamp}>09.00</Text>
                  </View>

                  {/* Message 2 - Driver Response */}
                  <View style={styles.messageBoxDriver}>
                    <Text style={styles.messageTextDriver}>Siap, otw ke lokasi mu</Text>
                    <Text style={styles.timeStampDriver}>09.05</Text>
                  </View>

                  {/* Message 3 - User Reply */}
                  <View style={styles.messageBoxUserReply}>
                    <Text style={styles.messageTextUser}>Hati-hati, kak</Text>
                    <Text style={styles.timeStampUserReply}>09.20</Text>
                  </View>

                  {/* Message 4 - Driver Arrival */}
                  <View style={styles.messageBoxDriverLast}>
                    <Text style={styles.messageTextDriver}>Siap, saya sudah sampai.</Text>
                    <Text style={styles.timeStampDriverLast}>09.24</Text>
                  </View>

                </View>

                {/* Input Section */}
                <View style={styles.inputContainer}>
                  <TextInput 
                    style={styles.textInput}
                    placeholder="Ketikkan pesan..."
                    placeholderTextColor="rgba(0,0,0,0.5)"
                  />
                  <TouchableOpacity style={styles.sendButton}>
                    <Text style={styles.sendButtonText}>Send</Text>
                  </TouchableOpacity>
                </View>

            </View>
        </SafeAreaView>
      </>);
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
        position: "relative"
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
        borderRadius: 35
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
    messageDetails: {
        fontSize: 12,
        color: "#000",
        fontFamily: "Montserrat-Regular",
        lineHeight: 22,
        marginBottom: 8
    },
    messageFooter: {
        fontSize: 12,
        color: "#000",
        fontFamily: "Montserrat-Regular",
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
    messageBoxUserReply: {
        backgroundColor: "#fff",
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
        maxWidth: 210,
        alignSelf: "flex-start"
    },
    messageTextUser: {
        fontSize: 12,
        color: "#000",
        fontFamily: "Montserrat-Regular",
        lineHeight: 22
    },
    timeStampUserReply: {
        fontSize: 11,
        color: "#000",
        fontFamily: "Montserrat-Regular",
        alignSelf: "flex-end",
        marginTop: 5
    },
    messageBoxDriverLast: {
        backgroundColor: "#33cc66",
        borderRadius: 53,
        borderWidth: 1,
        borderColor: "rgba(1, 104, 55, 0.4)",
        paddingHorizontal: 25,
        paddingVertical: 12,
        shadowColor: "#c4bfbf",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 8,
        maxWidth: 234,
        alignSelf: "flex-end"
    },
    timeStampDriverLast: {
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
        backgroundColor: "transparent"
    },
    textInput: {
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: 21,
        borderWidth: 1,
        borderColor: "rgba(1, 104, 55, 0.4)",
        height: 48,
        paddingHorizontal: 20,
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
        width: 26,
        height: 26,
        marginLeft: 8,
        justifyContent: "center",
        alignItems: "center"
    },
    sendButtonText: {
        fontSize: 16
    }
});

export default HalamanChat_Send_Driver;