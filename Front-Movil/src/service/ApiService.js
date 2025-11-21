import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, inicializarConexion, actualizarURLBase } from './conexion';

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

// Función para actualizar la URL base de axios
export const actualizarBaseURL = (nuevaURL) => {
  api.defaults.baseURL = nuevaURL;
  console.log(`🔄 Base URL de axios actualizada a: ${nuevaURL}`);
};

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
        console.error('🔗 Intentando conectar a:', api.defaults.baseURL);
        console.error('💡 Intentando encontrar IP correcta automáticamente...');
        
        // Intentar encontrar la IP correcta automáticamente y actualizar axios
        inicializarConexion()
          .then((ip) => {
            const nuevaURL = actualizarURLBase(ip);
            actualizarBaseURL(nuevaURL);
            console.log(`✅ IP encontrada: ${ip}`);
            console.log(`🌐 Nueva URL: ${nuevaURL}`);
            console.log('💡 La próxima petición usará la nueva IP automáticamente');
            
            // Reintentar la petición original con la nueva URL
            if (error.config && !error.config._retry) {
              error.config._retry = true;
              error.config.baseURL = nuevaURL;
              return api.request(error.config);
            }
          })
          .catch(() => {
            console.error('💡 Pasos para solucionar:');
            console.error('   1. Verifica que el servidor Deno esté corriendo');
            console.error('   2. Abre una terminal en: api_agrostock/api_movil');
            console.error('   3. Ejecuta: deno run --allow-all app.ts');
            console.error('   4. Espera a ver: "✅ Servidor listo para recibir conexiones"');
            console.error('   5. Verifica tu IP con: ipconfig (Windows)');
            console.error('   6. Asegúrate de que la IP en conexion.js sea correcta');
            console.error('   7. Verifica que tu móvil y PC estén en la misma red WiFi');
          });
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



