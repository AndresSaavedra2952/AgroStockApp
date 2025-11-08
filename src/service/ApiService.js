import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// URL base de la API - cambiar según tu configuración
const API_BASE_URL = 'http://127.0.0.1:5000';

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
    return response;
  },
  async (error) => {
    if (error.response) {
      // Token expirado o inválido
      if (error.response.status === 401) {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        // Redirigir a login si es necesario
        // navigationRef.current?.navigate('Login');
      }
    }
    return Promise.reject(error);
  }
);

export default api;

