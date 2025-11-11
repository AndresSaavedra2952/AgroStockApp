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

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFunction();
      setData(result);
    } catch (err) {
      setError(err);
      console.error('Error en useAutoRefresh:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Cargar datos iniciales
    fetchData();

    // Configurar intervalo si está habilitado
    if (enabled && interval > 0) {
      intervalRef.current = setInterval(() => {
        fetchData();
      }, interval);
    }

    // Limpiar intervalo al desmontar o cambiar dependencias
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
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






