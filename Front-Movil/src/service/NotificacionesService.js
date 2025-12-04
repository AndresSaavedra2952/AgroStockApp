import api from './ApiService';

export const notificacionesService = {
  /**
   * Obtener notificaciones del usuario
   */
  async getNotificaciones(limit = 50, soloNoLeidas = false) {
    try {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit);
      if (soloNoLeidas) params.append('soloNoLeidas', 'true');
      
      const response = await api.get(`/notificaciones?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Contar notificaciones no leídas
   */
  async contarNoLeidas() {
    try {
      const response = await api.get('/notificaciones/contar');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Marcar notificación como leída
   */
  async marcarComoLeida(idNotificacion) {
    try {
      const response = await api.put(`/notificaciones/${idNotificacion}/leer`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Marcar todas las notificaciones como leídas
   */
  async marcarTodasComoLeidas() {
    try {
      const response = await api.put('/notificaciones/marcar-todas');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Eliminar notificación
   */
  async eliminarNotificacion(idNotificacion) {
    try {
      const response = await api.delete(`/notificaciones/${idNotificacion}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default notificacionesService;


