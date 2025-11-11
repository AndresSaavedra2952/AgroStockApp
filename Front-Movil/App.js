import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import AppNavegacion from './src/Navigation/AppNavegacion';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { API_BASE_URL } from './src/service/conexion';

export default function App() {
  useEffect(() => {
    // Mostrar la URL de la API en consola para debug
    console.log('🌐 API Base URL:', API_BASE_URL);
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <AuthProvider>
        <NavigationContainer>
          <AppNavegacion />
          <StatusBar style="auto" />
        </NavigationContainer>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});



