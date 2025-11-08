// Utilidades para debug de autenticación
import AsyncStorage from '@react-native-async-storage/async-storage';

export const debugAuth = {
  /**
   * Imprimir información de autenticación actual
   */
  async printAuthInfo() {
    try {
      const token = await AsyncStorage.getItem('token');
      const user = await AsyncStorage.getItem('user');
      
      console.log('=== DEBUG AUTH ===');
      console.log('Token:', token ? 'Presente' : 'No encontrado');
      console.log('User:', user ? JSON.parse(user) : 'No encontrado');
      console.log('==================');
    } catch (error) {
      console.error('Error en debug auth:', error);
    }
  },

  /**
   * Limpiar datos de autenticación
   */
  async clearAuth() {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('fcm_token');
      console.log('Datos de autenticación limpiados');
    } catch (error) {
      console.error('Error al limpiar auth:', error);
    }
  },
};

export default debugAuth;

