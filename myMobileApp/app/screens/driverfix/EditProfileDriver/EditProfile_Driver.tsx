import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../../hooks/supabaseClient";


const EditProfile_Driver = () => {
  const router = useRouter();
  const { nama, nim, email, jenisMotor, plat, userId, profileImageUrl } = useLocalSearchParams();

  const [currentImageUrl, setCurrentImageUrl] = React.useState<string | null>(
    typeof profileImageUrl === 'string' ? profileImageUrl : null
  );

  // Reload foto SETIAP KALI screen muncul (termasuk balik dari ubah gambar)
  // Reload foto SETIAP KALI screen muncul (termasuk balik dari ubah gambar)
  useFocusEffect(
    React.useCallback(() => {
      loadProfileImage();
    }, [userId])
  );

  const loadProfileImage = async () => {
    if (userId && typeof userId === 'string') {
      try {
        // Fetch profile image URL from Supabase storage
        const { data } = await supabase
          .storage
          .from('profile-images')
          .getPublicUrl(`driver/${userId}`);
        
        if (data) {
          setCurrentImageUrl(data.publicUrl);
        }
      } catch (error) {
        console.error('Error loading profile image:', error);
      }
    }
  };
  // Buat object params untuk pass ke semua screen
  const userParams = {
    nama: nama || '',
    nim: nim || '',
    email: email || '',
    jenisMotor: jenisMotor || '',
    plat: plat || '',
    userId: userId || '',
    profileImageUrl: currentImageUrl || ''
  };

  const handleBack = () => {
    router.back();
  };

  const handleUbahPassword = () => {
    router.push({
      pathname: '/screens/driverfix/EditProfileDriver/UbahPassword_Driver',
      params: userParams
    });
  };

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Apakah Anda yakin ingin keluar?",
      [
        {
          text: "Batal",
          style: "cancel"
        },
        {
          text: "Ya, Keluar",
          onPress: async () => {
            try {
              // sign out supabase
              await supabase.auth.signOut();
              // remove local session keys
              await AsyncStorage.removeItem('userSession');
              await AsyncStorage.removeItem('nim');
              await AsyncStorage.removeItem('role');
              // navigate to login
              router.replace('/screens/Login');
            } catch (error) {
              console.error("Sign out failed:", error);
              Alert.alert("Error", "Gagal sign out. Coba lagi.");
            }
          }
        }
      ]
    );
  };

  const handleBeranda = () => {
    router.replace({
      pathname: '/screens/driverfix/HomeDriver',
      params: userParams
    });
  };

  const handleRiwayat = () => {
    router.replace({
      pathname: '/screens/driverfix/Riwayat_Driver',
      params: userParams
    });
  };

  const handleTerms = () => {
    router.replace({
      pathname: '/screens/driverfix/TermsAndConditionDriver',
      params: userParams
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.viewBg}>
        <View style={[styles.view, styles.viewBg]}>
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.unionWrapper}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <View style={styles.backButton}>
              <Text style={styles.backIcon}>←</Text>
            </View>
          </TouchableOpacity>

          {/* Profile Account Box */}
          <View style={styles.item}>
            {currentImageUrl ? (
              <Image 
                style={styles.driver2Icon} 
                source={{ uri: currentImageUrl }}
                resizeMode="cover" 
              />
            ) : (
              <Image 
                style={styles.driver2Icon} 
                source={require('../../../../assets/images/driver.png')}
                resizeMode="cover" 
              />
            )}
            <Text style={styles.profileAccount}>Profile Account</Text>
            <TouchableOpacity 
              onPress={() => router.push({
                pathname: '/screens/driverfix/EditProfileDriver/UbahGambar_Driver',
                params: userParams
              })}
              activeOpacity={0.7}
              style={styles.editIconButtonProfile}
            >
              <Text style={styles.editIconText}>✏️</Text>
            </TouchableOpacity>
          </View>

          {/* NIM Field */}
          <View style={styles.inner}>
            <Text style={styles.nim}>{nim || 'NIM'}</Text>
          </View>

          {/* Nama Field */}
          <View style={styles.rectangleView}>
            <Text style={styles.nama}>{nama || 'Nama'}</Text>
          </View>

          {/* Password Field */}
          <View style={styles.editProfileDriverChild}>
            <Text style={styles.password}>Password</Text>
            <TouchableOpacity 
              onPress={handleUbahPassword}
              activeOpacity={0.7}
              style={styles.editIconButton}
            >
              <Text style={styles.editIconText}>✏️</Text>
            </TouchableOpacity>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity 
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

          {/* Bottom Navigation */}
          <View style={styles.child2} />
          
          <TouchableOpacity 
            style={styles.berandaButton}
            onPress={handleBeranda}
            activeOpacity={0.7}
          >
            <Text style={styles.berandaIcon}>🏠</Text>
            <Text style={styles.beranda}>Beranda</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.riwayatButton}
            onPress={handleRiwayat}
            activeOpacity={0.7}
          >
            <Text style={styles.riwayatIcon}>🕐</Text>
            <Text style={styles.riwayat}>Riwayat</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.termsButton}
            onPress={handleTerms}
            activeOpacity={0.7}
          >
            <Text style={styles.termsIcon}>📋</Text>
            <Text style={styles.termsNCond}>Terms n Cond</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  viewBg: {
    backgroundColor: "#fff",
    flex: 1
  },
  view: {
    width: "100%",
    height: 852,
    overflow: "hidden"
  },
  unionWrapper: {
    top: 63,
    left: 27,
    position: "absolute"
  },
  backButton: {
    width: 49,
    height: 47,
    borderRadius: 25,
    backgroundColor: "#33cc66",
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.8
  },
  backIcon: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "bold"
  },
  item: {
    marginLeft: -159.5,
    top: 233,
    height: 65,
    width: 325,
    borderColor: "#016837",
    borderRadius: 26,
    borderWidth: 1,
    borderStyle: "solid",
    left: "50%",
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20
  },
  driver2Icon: {
    width: 48,
    height: 48,
    marginRight: 15
  },
  profileAccount: {
    fontSize: 25,
    color: "#5a2736",
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    lineHeight: 22
  },
  inner: {
    marginLeft: -164.5,
    top: 340,
    height: 65,
    width: 325,
    borderColor: "#016837",
    borderRadius: 26,
    borderWidth: 1,
    borderStyle: "solid",
    left: "50%",
    position: "absolute",
    justifyContent: "center",
    alignItems: "center"
  },
  nim: {
    textAlign: "center",
    fontSize: 20,
    color: "#5a2736",
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    lineHeight: 22
  },
  rectangleView: {
    marginLeft: -164.5,
    top: 447,
    height: 65,
    width: 325,
    borderColor: "#016837",
    borderRadius: 26,
    borderWidth: 1,
    borderStyle: "solid",
    left: "50%",
    position: "absolute",
    justifyContent: "center",
    alignItems: "center"
  },
  nama: {
    textAlign: "center",
    fontSize: 20,
    color: "#5a2736",
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    lineHeight: 22
  },
  editProfileDriverChild: {
    marginLeft: -164.5,
    top: 554,
    height: 65,
    width: 325,
    borderColor: "#016837",
    borderRadius: 26,
    borderWidth: 1,
    borderStyle: "solid",
    left: "50%",
    position: "absolute",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center"
  },
  password: {
    textAlign: "center",
    fontSize: 20,
    color: "#5a2736",
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    lineHeight: 22
  },
  editIconButton: {
    position: "absolute",
    right: 20
  },
  signOutButton: {
    marginLeft: -162.5,
    top: 640,
    height: 50,
    width: 325,
    backgroundColor: "#ff4444",
    borderRadius: 25,
    left: "50%",
    position: "absolute",
    justifyContent: "center",
    alignItems: "center"
  },
  signOutText: {
    textAlign: "center",
    fontSize: 18,
    color: "#fff",
    fontFamily: "Montserrat-Bold",
    fontWeight: "700"
  },
  editIconButtonProfile: {
    position: "absolute",
    right: 20
  },
  editIcon: {
    height: 27,
    width: 27
  },
  editIconText: {
    fontSize: 24
  },
  child2: {
    top: 751,
    left: 29,
    borderRadius: 18,
    backgroundColor: "#d2ffde",
    width: 108,
    height: 71,
    position: "absolute"
  },
  berandaButton: {
    position: "absolute",
    top: 758,
    left: 63,
    alignItems: "center"
  },
  berandaIcon: {
    fontSize: 32,
    marginBottom: 5
  },
  beranda: {
    color: "#016837",
    fontFamily: "Montserrat-Regular",
    fontSize: 10,
    textAlign: "center",
    lineHeight: 22
  },
  riwayatButton: {
    position: "absolute",
    top: 759,
    left: 185,
    alignItems: "center"
  },
  riwayatIcon: {
    fontSize: 32,
    marginBottom: 5
  },
  riwayat: {
    top: 795,
    color: "#016837",
    fontFamily: "Montserrat-Regular",
    fontSize: 10,
    textAlign: "center",
    lineHeight: 22,
    position: "absolute"
  },
  termsButton: {
    position: "absolute",
    top: 761,
    left: 307,
    alignItems: "center"
  },
  termsIcon: {
    fontSize: 30,
    marginBottom: 5
  },
  termsNCond: {
    top: 795,
    color: "#016837",
    fontFamily: "Montserrat-Regular",
    fontSize: 10,
    textAlign: "center",
    lineHeight: 22,
    position: "absolute"
  }
});

export default EditProfile_Driver;