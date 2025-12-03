import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './conexion';

// Exportar API_BASE_URL para uso en logs de error
export { API_BASE_URL };

// Crear instancia de axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a las peticiones
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Log de peticiones en desarrollo
      if (__DEV__) {
        console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
        
        // Si es POST/PUT y tiene data, loguear información del body
        if ((config.method === 'post' || config.method === 'put') && config.data) {
          const dataStr = JSON.stringify(config.data);
          const dataSize = dataStr.length;
          console.log(`📦 Body size: ${dataSize} caracteres`);
          
          // Verificar si tiene imagenData
          if (config.data.imagenData) {
            const imagenDataSize = config.data.imagenData.length;
            console.log(`🖼️ imagenData presente: ${imagenDataSize} caracteres`);
            console.log(`🖼️ imagenData prefijo: ${config.data.imagenData.substring(0, 50)}...`);
            console.log(`🖼️ imagenData tiene prefijo data:image/: ${config.data.imagenData.startsWith('data:image/')}`);
          } else {
            console.log(`⚠️ imagenData NO presente en el body`);
            console.log(`📋 Claves en body:`, Object.keys(config.data).join(', '));
          }
        }
      }
    } catch (error) {
      console.error('Error al obtener token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => {
    // Log de respuestas exitosas en desarrollo
    if (__DEV__) {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  async (error) => {
    if (error.response) {
      // Log de errores en desarrollo
      if (__DEV__) {
        console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response.status}:`, error.response.data);
      }
      
      // Token expirado o inválido
      if (error.response.status === 401) {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        // Redirigir a login si es necesario
        // navigationRef.current?.navigate('Login');
      }
    } else if (error.request) {
      // Error de red (sin respuesta del servidor)
      if (__DEV__) {
        console.error('❌ Error de red - No se pudo conectar al servidor:', error.message);
        console.error('🔗 Verifica que el backend esté corriendo en:', API_BASE_URL);
      }
    } else {
      // Error al configurar la petición
      if (__DEV__) {
        console.error('❌ Error al configurar la petición:', error.message);
      }
    }
    return Promise.reject(error);
  }
);

export default api;



