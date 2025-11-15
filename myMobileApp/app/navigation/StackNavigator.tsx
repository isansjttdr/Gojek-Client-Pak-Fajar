import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

// 💡 PERBAIKAN PATH: Mundur satu tingkat (../)
// 💡 PERBAIKAN NAMA: Menggunakan nama file yang sesuai (Login, Register, HomeScreen)
import AmbilPesanan from '../screens/AmbilPesanan';
import ChatFood from '../screens/ChatFood';
import History from '../screens/customerfix/HistoryCust';
import PageCustomer from '../screens/customerfix/PageCustomer';
import Profile from '../screens/customerfix/ProfileCust';
import Term from '../screens/customerfix/TermCust';
import Home from '../screens/Home';
import Login from '../screens/Login';
import Logout from '../screens/Logout';
import PageDriver from '../screens/PageDriver';
import Register from '../screens/Register';
import ScootFoodCust from '../screens/ScootFoodCust';
import ScootRideCust from '../screens/ScootRideCust';
import ScootSendCust from '../screens/ScootSendCust';
import TestNavigationToChat from '../screens/TestNavigationToChat';
import MapsFood from '../screens/driverfix/ScootFoodDriver/MapsFood';
import MapsSend from '../screens/driverfix/ScootSendDriver/MapsSend';
import MapsRide from '../screens/driverfix/ScootRideDriver/MapsRide';
import PembayaranFood from '../screens/driverfix/ScootFoodDriver/PembayaranFood';
import PembayaranRide from '../screens/driverfix/ScootRideDriver/PembayaranRide'; 
import PembayaranSend from '../screens/driverfix/ScootSendDriver/PembayaranSend';

const Stack = createNativeStackNavigator();

export default function StackNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen 
        name="Login" 
        // Menggunakan nama import yang benar: Login
        component={Login} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Register" 
        // Menggunakan nama import yang benar: Register
        component={Register} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Home" 
        // Menggunakan nama import yang benar: HomeScreen
        component={Home} 
        options={{ headerShown: false }}
      />

      <Stack.Screen 
        name="PageCustomer" 
        component={PageCustomer}
        options={{ headerShown: false }}
      />
      
      <Stack.Screen 
        name="History"
        component={History}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Term"
        component={Term}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AmbilPesanan"
        component={AmbilPesanan}  
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Profile"
        component={Profile}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Logout"
        component={Logout}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PageDriver"
        component={PageDriver}
        options={{ headerShown: false }}
      />


      <Stack.Screen 
        name="ScootSendCust"
        component={ScootSendCust}
        options={{ headerShown: false }}
      />

      <Stack.Screen 
        name="ScootFoodCust"
        component={ScootFoodCust}
        options={{ headerShown: false }}
      />

      <Stack.Screen 
        name="ScootRideCust"
        component={ScootRideCust}
        options={{ headerShown: false }}
      />

      <Stack.Screen 
        name="ChatFood"
        component={ChatFood}
        options={{ headerShown: false }}
      />

      <Stack.Screen 
        name="TestNavigationToChat"
        component={TestNavigationToChat}
        options={{ headerShown: false }}
      />

      <Stack.Screen 
        name="MapsFood" 
        component={MapsFood} 
        options={{ headerShown: false }}
      />

      <Stack.Screen 
        name="MapsSend" 
        component={MapsSend} 
        options={{ headerShown: false }}
      />

      <Stack.Screen 
        name="MapsRide" 
        component={MapsRide} 
        options={{ headerShown: false }}
      />

      <Stack.Screen 
        name="PembayaranFood" 
        component={PembayaranFood} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PembayaranRide" 
        component={PembayaranRide}  
        options={{ headerShown: false }}
      />

      <Stack.Screen 
        name="PembayaranSend" 
        component={PembayaranSend}  
        options={{ headerShown: false }}
      />
      
      <Stack.Screen 
        name="types" 
        component={AmbilPesanan} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}