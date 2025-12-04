import { useState, useEffect, useRef } from 'react';
import notificacionesService from '../service/NotificacionesService';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function useNotifications() {
  const { isAuthenticated, token, loading: authLoading } = useAuth();
  const [totalNoLeidas, setTotalNoLeidas] = useState(0);
  const [loading, setLoading] = useState(false);
  const lastCallRef = useRef(0);
  const isCallingRef = useRef(false);

  const cargarContador = async (force = false) => {
    // Esperar a que la autenticación termine de cargar
    if (authLoading) {
      return;
    }

    // Solo cargar si el usuario está autenticado y tiene token
    if (!isAuthenticated() || !token) {
      setTotalNoLeidas(0);
      return;
    }

    // Verificar que el token esté disponible en AsyncStorage
    try {
      const storedToken = await AsyncStorage.getItem('token');
      if (!storedToken) {
        setTotalNoLeidas(0);
        return;
      }
    } catch (error) {
      // Si hay error al leer AsyncStorage, no hacer la llamada
      setTotalNoLeidas(0);
      return;
    }

    const now = Date.now();
    
    // Debounce: evitar llamadas muy frecuentes (máximo cada 3 segundos)
    if (!force && now - lastCallRef.current < 3000) {
      return;
    }

    if (isCallingRef.current) {
      return;
    }

    lastCallRef.current = now;
    isCallingRef.current = true;
    setLoading(true);

    try {
      const response = await notificacionesService.contarNoLeidas();
      if (response.success) {
        setTotalNoLeidas(response.totalNoLeidas || 0);
      } else {
        // Si hay error de autenticación, no mostrar error en consola
        if (response.error !== 'UNAUTHORIZED' && response.error !== 'No autenticado') {
          console.error('Error al cargar contador de notificaciones:', response);
        }
        setTotalNoLeidas(0);
      }
    } catch (error) {
      // Solo mostrar error si no es de autenticación
      if (error?.error !== 'UNAUTHORIZED' && error?.error !== 'No autenticado' && 
          error?.message !== 'Token no proporcionado') {
        console.error('Error al cargar contador de notificaciones:', error);
      }
      setTotalNoLeidas(0);
    } finally {
      setLoading(false);
      isCallingRef.current = false;
    }
  };

  const refrescar = () => {
    cargarContador(true);
  };

  useEffect(() => {
    // Esperar a que la autenticación termine de cargar
    if (authLoading) {
      return;
    }

    // Solo cargar si el usuario está autenticado
    if (!isAuthenticated() || !token) {
      setTotalNoLeidas(0);
      return;
    }

    let intervalId = null;

    // Pequeño delay para asegurar que el token esté disponible
    const timeoutId = setTimeout(() => {
      // Cargar contador inicial
      cargarContador();

      // Actualizar cada 30 segundos
      intervalId = setInterval(() => {
        if (isAuthenticated() && token) {
          cargarContador();
        } else {
          setTotalNoLeidas(0);
        }
      }, 30000);
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAuthenticated, token, authLoading]);

  return {
    totalNoLeidas,
    loading,
    refrescar,
  };
}
