import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const TestNavigationToChat = () => {
  const navigation = useNavigation<any>();

  // HARDCODED ID dari database Anda
  const CUSTOMER_ID = 'ce2430fc-ff3f-4328-ae41-a4d548a9b563';
  const DRIVER_ID = 'fcf660ec-0a09-49aa-b69c-459cf67e6cf6';
  const ORDER_ID = '1';  // Sesuaikan dengan data dummy yang sudah dibuat

  const openChatAsCustomer = () => {
    navigation.navigate('AmbilPesanan', {
      orderId: ORDER_ID,
      serviceType: 'ride',
      customerId: CUSTOMER_ID,
      driverId: DRIVER_ID,
      tujuan: 'Solo Grand Mall',
      asal: 'UNS Kentingan',
      tarif: 'Rp 15.000',
      waktu: '5 menit yang lalu'
    });
  };

  const openChatAsDriver = () => {
    navigation.navigate('AmbilPesanan', {
      orderId: ORDER_ID,
      serviceType: 'ride',
      customerId: CUSTOMER_ID,
      driverId: DRIVER_ID,
      tujuan: 'Solo Grand Mall',
      asal: 'UNS Kentingan',
      tarif: 'Rp 15.000',
      waktu: '5 menit yang lalu'
    });
  };

  const openChatFood = () => {
    navigation.navigate('AmbilPesanan', {
      orderId: '1',
      serviceType: 'food',
      customerId: CUSTOMER_ID,
      driverId: DRIVER_ID,
      tujuan: 'Asrama UNS Kentingan',
      asal: 'Warung Makan Sederhana',
      tarif: 'Rp 5.000',
      waktu: '10 menit yang lalu'
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Test Chat Realtime</Text>
      
      <TouchableOpacity style={styles.button} onPress={openChatAsCustomer}>
        <Text style={styles.buttonText}>Buka Chat ScootRide (as Customer)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={openChatAsDriver}>
        <Text style={styles.buttonText}>Buka Chat ScootRide (as Driver)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={openChatFood}>
        <Text style={styles.buttonText}>Buka Chat ScootFood</Text>
      </TouchableOpacity>

      <View style={styles.info}>
        <Text style={styles.infoTitle}>📋 Info Testing:</Text>
        <Text style={styles.infoText}>Customer ID: {CUSTOMER_ID}</Text>
        <Text style={styles.infoText}>Driver ID: {DRIVER_ID}</Text>
        <Text style={styles.infoText}>Order ID: {ORDER_ID}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F6FA',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#4F46E5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  info: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  infoTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 5,
  },
});

export default TestNavigationToChat;