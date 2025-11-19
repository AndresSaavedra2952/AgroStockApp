import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Image } from 'react-native';

export default function LoadingScreen() {
  // Intentar cargar la imagen de forma segura
  let imageSource = null;
  try {
    imageSource = require('../../assets/splash.png');
  } catch (error) {
    console.warn('No se pudo cargar la imagen splash:', error);
  }

  return (
    <View style={styles.container}>
      {imageSource && (
        <Image 
          source={imageSource} 
          style={styles.logo}
          resizeMode="contain"
          onError={(error) => {
            console.warn('Error al cargar imagen:', error);
          }}
        />
      )}
      <ActivityIndicator size="large" color="#2e7d32" style={styles.loader} />
      <Text style={styles.text}>Cargando AgroStock...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  loader: {
    marginTop: 20,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});






