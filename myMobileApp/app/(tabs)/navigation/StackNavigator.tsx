import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// 💡 PERBAIKAN PATH: Mundur dua tingkat (../../) untuk mencapai folder 'screens'
import LoginScreen from '../../screens/Login';
import RegisterScreen from '../../screens/Register';
import HomeScreen from '../../screens/Home';

const Stack = createNativeStackNavigator();

export default function StackNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen 
        name="Login" 
        component={LoginScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
