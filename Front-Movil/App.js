import React, { useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavegacion from './src/Navigation/AppNavegacion';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View } from 'react-native';
import { API_BASE_URL } from './src/service/conexion';
import * as SplashScreen from 'expo-splash-screen';

// Mantener el splash screen visible mientras la app carga
SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { loading } = useAuth();

  useEffect(() => {
    // Mostrar la URL de la API en consola para debug
    console.log('🌐 API Base URL:', API_BASE_URL);
  }, []);

  const onLayoutRootView = useCallback(async () => {
    // Esperar a que termine la carga antes de ocultar el splash screen
    if (!loading) {
      await SplashScreen.hideAsync();
    }
  }, [loading]);

  return (
    <View style={styles.container} onLayout={onLayoutRootView}>
      <NavigationContainer>
        <AppNavegacion />
        <StatusBar style="auto" />
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});



