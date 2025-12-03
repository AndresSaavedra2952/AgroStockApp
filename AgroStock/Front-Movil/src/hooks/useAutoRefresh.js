import { useState, useEffect, useRef } from 'react';

/**
 * Hook para refrescar datos automáticamente
 * @param {Function} fetchFunction - Función que obtiene los datos
 * @param {number} interval - Intervalo en milisegundos (default: 30000 = 30 segundos)
 * @param {boolean} enabled - Si está habilitado el auto-refresh (default: true)
 */
export const useAutoRefresh = (fetchFunction, interval = 30000, enabled = true) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const MIN_FETCH_INTERVAL = 2000; // Mínimo 2 segundos entre peticiones

  const fetchData = async () => {
    // Protección contra llamadas simultáneas
    if (isFetchingRef.current) {
      console.log('⏸️ Petición en curso, ignorando...');
      return;
    }

    // Protección contra peticiones muy frecuentes
    const now = Date.now();
    if (now - lastFetchTimeRef.current < MIN_FETCH_INTERVAL) {
      console.log('⏸️ Petición muy frecuente, ignorando...');
      return;
    }

    // Si no está habilitado, no hacer nada
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      isFetchingRef.current = true;
      lastFetchTimeRef.current = now;
      setLoading(true);
      setError(null);
      const result = await fetchFunction();
      setData(result);
    } catch (err) {
      setError(err);
      console.error('Error en useAutoRefresh:', err);
      
      // Si es error 429, deshabilitar temporalmente
      if (err.status === 429 || (err.error && err.error === 'Demasiadas solicitudes')) {
        console.warn('⚠️ Rate limit detectado, deteniendo auto-refresh');
        // El componente padre debe manejar esto deshabilitando el hook
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    // Limpiar intervalo anterior si existe
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Solo cargar datos iniciales si está habilitado
    if (enabled) {
      fetchData();
    } else {
      setLoading(false);
    }

    // Configurar intervalo si está habilitado y el intervalo es válido
    if (enabled && interval > 0 && interval >= MIN_FETCH_INTERVAL) {
      intervalRef.current = setInterval(() => {
        if (enabled) {
          fetchData();
        }
      }, interval);
    }

    // Limpiar intervalo al desmontar o cambiar dependencias
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      isFetchingRef.current = false;
    };
  }, [enabled, interval]);

  // Función para refrescar manualmente
  const refresh = () => {
    fetchData();
  };

  return {
    data,
    loading,
    error,
    refresh,
  };
};

export default useAutoRefresh;






