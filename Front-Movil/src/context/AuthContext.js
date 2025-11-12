import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../service/AuthService';
import notificationService from '../service/NotificationService';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Cargar datos de sesión al iniciar
    cargarSesion();
    
    // Configurar notificaciones
    configurarNotificaciones();
  }, []);

  const cargarSesion = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // Verificar que el token sigue siendo válido
        try {
          await authService.verifyToken();
        } catch (error) {
          // Token inválido, limpiar sesión
          await logout();
        }
      }
    } catch (error) {
      console.error('Error al cargar sesión:', error);
    } finally {
      setLoading(false);
    }
  };

  const configurarNotificaciones = async () => {
    try {
      const tienePermiso = await notificationService.solicitarPermisos();
      if (tienePermiso) {
        await notificationService.registrarToken();
      }
    } catch (error) {
      console.error('Error al configurar notificaciones:', error);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      
      if (response.success && response.token) {
        const usuario = response.usuario;
        
        console.log('✅ Login exitoso, usuario:', usuario);
        console.log('📋 Rol del usuario:', usuario.rol);
        
        // Guardar token y usuario
        await AsyncStorage.setItem('token', response.token);
        await AsyncStorage.setItem('user', JSON.stringify(usuario));
        
        setToken(response.token);
        setUser(usuario);
        
        // Registrar token FCM si está disponible
        try {
          await notificationService.registrarToken();
        } catch (error) {
          console.warn('No se pudo registrar token FCM:', error);
        }
        
        // La navegación se manejará automáticamente en AppNavegacion.js
        // según el rol del usuario (consumidor o productor)
        return { success: true, usuario };
      } else {
        return { success: false, message: response.message || 'Error al iniciar sesión' };
      }
    } catch (error) {
      console.error('Error en login:', error);
      return { 
        success: false, 
        message: error.message || error.error || 'Error al iniciar sesión. Verifica tus credenciales.' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      
      if (response.success && response.usuario) {
        // El registro no inicia sesión automáticamente
        // El usuario debe iniciar sesión después
        return { success: true, message: response.message };
      } else {
        return { success: false, message: response.message || 'Error al registrar usuario' };
      }
    } catch (error) {
      console.error('Error en register:', error);
      return { 
        success: false, 
        message: error.message || 'Error al registrar usuario' 
      };
    }
  };

  const logout = async () => {
    try {
      // Llamar al endpoint de logout
      await authService.logout();
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      // Limpiar datos locales
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('fcm_token');
      
      setToken(null);
      setUser(null);
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await authService.changePassword(currentPassword, newPassword);
      return response;
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      throw error;
    }
  };

  const isAuthenticated = () => {
    return !!token && !!user;
  };

  const isProductor = () => {
    return user?.rol === 'productor';
  };

  const isConsumidor = () => {
    return user?.rol === 'consumidor';
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    changePassword,
    isAuthenticated,
    isProductor,
    isConsumidor,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;






