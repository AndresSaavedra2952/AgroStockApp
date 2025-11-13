import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Image } from 'react-native';

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <Image 
        source={require('../../assets/splash.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
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






