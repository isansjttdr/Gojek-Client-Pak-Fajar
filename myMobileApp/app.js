import React, { useState } from 'react';
import { View } from 'react-native';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';

export default function App() {
  const [page, setPage] = useState('login');
  const [user, setUser] = useState(null);

  return (
    <View style={{ flex: 1 }}>
      {page === 'login' && <LoginScreen setPage={setPage} setUser={setUser} />}
      {page === 'register' && <RegisterScreen setPage={setPage} />}
      {page === 'home' && <HomeScreen setPage={setPage} user={user} />}
    </View>
  );
}
