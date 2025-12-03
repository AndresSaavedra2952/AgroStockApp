import api from './ApiService';

export const estadisticasService = {
  /**
   * Obtener estadísticas del usuario actual
   */
  async getEstadisticasUsuario() {
    try {
      const response = await api.get('/estadisticas/usuario');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Obtener estadísticas de ventas (para productores)
   */
  async getEstadisticasVentas() {
    try {
      const response = await api.get('/estadisticas/mis-ventas');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default estadisticasService;






