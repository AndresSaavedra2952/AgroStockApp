import { useState, useEffect, useRef } from 'react';
import cartService from '../service/CartService';
import { useAuth } from '../context/AuthContext';
import cartRateLimitManager from '../service/CartRateLimitManager';

/**
 * Hook para obtener información del carrito
 * Retorna la cantidad de items y función para refrescar
 */
export function useCart() {
  const { user, isConsumidor } = useAuth();
  const [cantidadItems, setCantidadItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const lastCallRef = useRef(0);
  const isCallingRef = useRef(false);

  // Suscribirse al gestor global de rate limiting
  useEffect(() => {
    const unsubscribe = cartRateLimitManager.subscribe((isLimited, retryAfter) => {
      setRateLimited(isLimited);
    });
    return unsubscribe;
  }, []);

  const cargarCarrito = async (force = false) => {
    // Solo cargar si es consumidor
    if (!user || !isConsumidor()) {
      setCantidadItems(0);
      return;
    }

    // Verificar rate limiting global (más confiable que el estado local)
    if (cartRateLimitManager.isRateLimited()) {
      console.log('🚫 useCart: Rate limit global activo, bloqueando llamada');
      return;
    }

    // También verificar estado local (por si acaso)
    if (rateLimited) {
      console.log('🚫 useCart: Rate limit local activo, bloqueando llamada');
      return;
    }

    // Evitar llamadas duplicadas (debounce de 3 segundos)
    const now = Date.now();
    if (!force && (now - lastCallRef.current < 3000 || isCallingRef.current)) {
      return;
    }

    lastCallRef.current = now;
    isCallingRef.current = true;
    setLoading(true);

    try {
      const response = await cartService.getCarrito();
      
      // Detectar errores 429 (rate limiting)
      if (response && (response.error === 'Demasiadas solicitudes' || response.status === 429)) {
        const retryAfter = response.retryAfter || 900; // En segundos
        // Activar rate limiting global (afecta a todos los componentes)
        cartRateLimitManager.setRateLimited(retryAfter);
        return;
      }

      if (response.success && response.data?.items) {
        // El backend devuelve items con cantidad
        const items = Array.isArray(response.data.items) ? response.data.items : [];
        const totalItems = items.reduce((sum, item) => sum + (item.cantidad || 0), 0);
        setCantidadItems(totalItems);
      } else {
        setCantidadItems(0);
      }
    } catch (error) {
      // Detectar errores 429 en el catch
      if (error?.response?.data?.error === 'Demasiadas solicitudes' || 
          error?.status === 429 ||
          error?.error === 'Demasiadas solicitudes') {
        const retryAfter = error?.response?.data?.retryAfter || error?.retryAfter || 900; // En segundos
        // Activar rate limiting global (afecta a todos los componentes)
        cartRateLimitManager.setRateLimited(retryAfter);
        return;
      }
      console.error('Error al cargar carrito:', error);
      setCantidadItems(0);
    } finally {
      setLoading(false);
      isCallingRef.current = false;
    }
  };

  useEffect(() => {
    cargarCarrito(true); // Primera carga forzada
  }, [user]);

  // Recargar periódicamente cuando el usuario es consumidor (reducido a 60 segundos)
  useEffect(() => {
    if (!user || !isConsumidor()) {
      return;
    }

    // Solo actualizar automáticamente si no hay rate limiting
    if (rateLimited) {
      return;
    }

    const interval = setInterval(() => {
      if (!rateLimited) {
        cargarCarrito();
      }
    }, 60000); // Actualizar cada 60 segundos (antes era 5)

    return () => clearInterval(interval);
  }, [user, rateLimited]);

  return {
    cantidadItems,
    loading,
    rateLimited,
    refrescar: () => {
      // NO refrescar si hay rate limiting activo (verificar global primero)
      if (cartRateLimitManager.isRateLimited() || rateLimited) {
        console.log('🚫 useCart: Rate limit activo, bloqueando refrescar()');
        return;
      }
      cargarCarrito(true); // Forzar actualización cuando se llama manualmente
    },
  };
}

export default useCart;

