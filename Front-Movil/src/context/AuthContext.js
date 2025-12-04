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
    let isMounted = true;
    let timeoutId = null;
    
    // Timeout de seguridad: asegurar que loading se establezca en false después de 5 segundos máximo
    timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn('⚠️ Timeout de carga de sesión, forzando loading a false');
        setLoading(false);
      }
    }, 5000);
    
    // Cargar datos de sesión al iniciar
    const init = async () => {
      try {
        await cargarSesion();
        
        // Limpiar timeout si la carga fue exitosa
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        // Configurar notificaciones solo si el componente sigue montado
        if (isMounted) {
          configurarNotificaciones();
        }
      } catch (error) {
        console.error('Error en inicialización:', error);
        if (isMounted) {
          setLoading(false);
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };
    
    init();
    
    // Cleanup
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const cargarSesion = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          
          // Verificar que el token sigue siendo válido ANTES de establecer el estado
          // Esto evita mostrar contenido protegido con un token inválido
          try {
            const verifyResponse = await authService.verifyToken();
            if (verifyResponse && verifyResponse.success) {
              // Token válido, establecer usuario y token
              setToken(storedToken);
              setUser(parsedUser);
            } else {
              // Token inválido según la respuesta
              console.warn('⚠️ Token inválido según verificación, limpiando sesión');
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('user');
              setToken(null);
              setUser(null);
            }
          } catch (verifyError) {
            // Error al verificar token (probablemente expirado o inválido)
            console.warn('⚠️ Error al verificar token, limpiando sesión:', verifyError?.error || verifyError?.message);
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            setToken(null);
            setUser(null);
          }
        } catch (parseError) {
          console.error('Error al parsear usuario almacenado:', parseError);
          // Limpiar datos corruptos
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');
        }
      } else {
        // No hay token o usuario almacenado
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Error al cargar sesión:', error);
      // Limpiar en caso de error
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setToken(null);
      setUser(null);
    } finally {
      // Siempre establecer loading en false después de cargar
      setLoading(false);
    }
  };

  const configurarNotificaciones = async () => {
    try {
      // No bloquear la inicialización si las notificaciones fallan
      const tienePermiso = await notificationService.solicitarPermisos();
      if (tienePermiso) {
        // Registrar token de forma asíncrona sin bloquear
        notificationService.registrarToken().catch((error) => {
          console.warn('No se pudo registrar token FCM (no crítico):', error);
        });
      }
    } catch (error) {
      // No es crítico si las notificaciones fallan
      console.warn('Error al configurar notificaciones (no crítico):', error);
    }
  };

  const login = async (email, password) => {
    try {
      // El AuthService ya normaliza el email, solo pasar password sin modificar
      const response = await authService.login(email, password);
      
      // Validar que la respuesta tenga el formato esperado
      if (!response) {
        console.error('❌ Respuesta vacía del servidor');
        return { 
          success: false, 
          message: 'Error al iniciar sesión. Respuesta inválida del servidor.' 
        };
      }
      
      if (response.success && response.token) {
        const usuario = response.usuario;
        
        // Validar que el usuario tenga los datos necesarios
        if (!usuario || !usuario.id_usuario) {
          console.error('❌ Usuario inválido en la respuesta:', usuario);
          return { 
            success: false, 
            message: 'Error al iniciar sesión. Datos de usuario inválidos.' 
          };
        }
        
        console.log('✅ Login exitoso, usuario:', usuario);
        console.log('📋 Rol del usuario:', usuario.rol);
        
        // Guardar token y usuario
        try {
          await AsyncStorage.setItem('token', response.token);
          await AsyncStorage.setItem('user', JSON.stringify(usuario));
          
          setToken(response.token);
          setUser(usuario);
          
          // Registrar token FCM si está disponible
          try {
            await notificationService.registrarToken();
          } catch (error) {
            console.warn('No se pudo registrar token FCM:', error);
            // No fallar el login si FCM falla
          }
          
          // La navegación se manejará automáticamente en AppNavegacion.js
          // según el rol del usuario (consumidor o productor)
          return { success: true, usuario };
        } catch (storageError) {
          console.error('❌ Error al guardar datos en AsyncStorage:', storageError);
          return { 
            success: false, 
            message: 'Error al guardar sesión. Intenta nuevamente.' 
          };
        }
      } else {
        const errorMessage = response.message || response.error || 'Error al iniciar sesión';
        console.error('❌ Login falló:', errorMessage);
        return { success: false, message: errorMessage };
      }
    } catch (error) {
      console.error('❌ Error en login (catch):', error);
      console.error('❌ Error details:', {
        message: error.message,
        error: error.error,
        status: error.status,
        data: error.data
      });
      
      // Extraer el mensaje de error de manera segura
      let errorMessage = 'Error al iniciar sesión. Verifica tus credenciales.';
      
      if (error && typeof error === 'object') {
        if (error.message) {
          errorMessage = error.message;
        } else if (error.error) {
          errorMessage = error.error;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      return { 
        success: false, 
        message: errorMessage
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

  const updateUser = async (userData) => {
    try {
      // Actualizar usuario en el estado
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      
      // Actualizar en AsyncStorage
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      
      return { success: true };
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      throw error;
    }
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
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;






