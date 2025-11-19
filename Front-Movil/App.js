import React, { useEffect, useCallback, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavegacion from './src/Navigation/AppNavegacion';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { API_BASE_URL } from './src/service/conexion';
import * as SplashScreen from 'expo-splash-screen';

// Mantener el splash screen visible mientras la app carga
SplashScreen.preventAutoHideAsync().catch(() => {});

function AppContent() {
  const [appReady, setAppReady] = useState(false);
  const [initError, setInitError] = useState(null);
  
  let loading = true;
  let user = null;
  
  try {
    const auth = useAuth();
    loading = auth.loading;
    user = auth.user;
  } catch (error) {
    console.error('❌ Error al usar useAuth:', error);
    setInitError(error);
  }

  useEffect(() => {
    // Mostrar la URL de la API en consola para debug
    console.log('🌐 API Base URL:', API_BASE_URL);
    console.log('📱 AppContent montado');
    
    // Timeout de seguridad
    const timeout = setTimeout(() => {
      console.warn('⚠️ Timeout de inicialización, forzando appReady');
      setAppReady(true);
    }, 3000);
    
    // Marcar como listo después de un breve delay
    const readyTimer = setTimeout(() => {
      console.log('✅ AppContent listo');
      setAppReady(true);
      clearTimeout(timeout);
    }, 500);
    
    return () => {
      clearTimeout(timeout);
      clearTimeout(readyTimer);
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    // Esperar a que termine la carga antes de ocultar el splash screen
    if (!loading && appReady) {
      try {
        await SplashScreen.hideAsync();
        console.log('✅ Splash screen ocultado');
      } catch (error) {
        console.error('Error al ocultar splash screen:', error);
      }
    }
  }, [loading, appReady]);

  // Si hay error de inicialización, mostrar error
  if (initError) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#ffffff' }]}>
        <Text style={{ color: 'red', fontSize: 16, textAlign: 'center', marginBottom: 10 }}>
          Error al inicializar
        </Text>
        <Text style={{ color: '#666', fontSize: 12, textAlign: 'center' }}>
          {initError.message || 'Error desconocido'}
        </Text>
      </View>
    );
  }

  // Mostrar loading mientras no esté listo
  if (!appReady || loading) {
    console.log('⏳ Mostrando pantalla de carga...');
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }]}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>Cargando AgroStock...</Text>
      </View>
    );
  }

  console.log('🚀 Renderizando NavigationContainer...');
  
  try {
    return (
      <View style={styles.container} onLayout={onLayoutRootView}>
        <NavigationContainer
          onReady={() => {
            console.log('✅ NavigationContainer listo');
          }}
          onStateChange={() => {
            console.log('🔄 Estado de navegación cambió');
          }}
        >
          <AppNavegacion />
          <StatusBar style="auto" />
        </NavigationContainer>
      </View>
    );
  } catch (error) {
    console.error('❌ Error crítico en AppContent:', error);
    // Retornar una vista de error simple
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#ffffff' }]}>
        <Text style={{ color: 'red', fontSize: 16, textAlign: 'center', marginBottom: 10 }}>
          Error al cargar la aplicación
        </Text>
        <Text style={{ color: '#666', fontSize: 12, textAlign: 'center' }}>
          {error.message || 'Error desconocido'}
        </Text>
        <Text style={{ color: '#999', fontSize: 10, textAlign: 'center', marginTop: 20 }}>
          Por favor, reinicia la app
        </Text>
      </View>
    );
  }
}

export default function App() {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Error boundary simple
  if (hasError) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#ffffff' }]}>
        <Text style={{ color: 'red', fontSize: 16, textAlign: 'center', marginBottom: 10 }}>
          Error al iniciar la aplicación
        </Text>
        <Text style={{ color: '#666', fontSize: 12, textAlign: 'center' }}>
          {errorMessage || 'Error desconocido'}
        </Text>
        <Text style={{ color: '#999', fontSize: 10, textAlign: 'center', marginTop: 20 }}>
          Por favor, reinicia la app
        </Text>
      </View>
    );
  }

  try {
    return (
      <GestureHandlerRootView style={styles.container}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </GestureHandlerRootView>
    );
  } catch (error) {
    console.error('❌ Error crítico en App:', error);
    setHasError(true);
    setErrorMessage(error.message || 'Error desconocido');
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#ffffff' }]}>
        <Text style={{ color: 'red', fontSize: 16, textAlign: 'center' }}>
          Error al iniciar la aplicación.{'\n'}
          Por favor, reinicia la app.
        </Text>
        <Text style={{ color: '#666', fontSize: 12, marginTop: 10, textAlign: 'center' }}>
          {error.message || 'Error desconocido'}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});



