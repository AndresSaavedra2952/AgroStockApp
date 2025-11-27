import api from './ApiService';

export const mensajesService = {
  /**
   * Obtener mensajes recibidos
   */
  async getMensajesRecibidos() {
    try {
      const response = await api.get('/mensajes/recibidos');
      // El API puede devolver { success: true, mensajes: [...] } o { success: true, data: [...] }
      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.mensajes || response.data.data || [],
          total: response.data.total || 0
        };
      }
      return response.data;
    } catch (error) {
      console.error('Error en getMensajesRecibidos:', error);
      throw error.response?.data || error.message;
    }
  },

  /**
   * Obtener mensajes enviados
   */
  async getMensajesEnviados() {
    try {
      const response = await api.get('/mensajes/enviados');
      // El API devuelve { success: true, mensajes: [...], total: number }
      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.mensajes || response.data.data || [],
          total: response.data.total || 0
        };
      }
      return response.data;
    } catch (error) {
      console.error('Error en getMensajesEnviados:', error);
      throw error.response?.data || error.message;
    }
  },

  /**
   * Enviar mensaje
   */
  async enviarMensaje(idDestinatario, asunto, mensaje, idProducto = null, tipoMensaje = 'consulta') {
    try {
      const response = await api.post('/mensajes/enviar', {
        id_destinatario: idDestinatario,
        asunto,
        mensaje,
        id_producto: idProducto,
        tipo_mensaje: tipoMensaje,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Contactar productor (público, sin autenticación)
   */
  async contactarProductor(idProductor, nombre, email, telefono, mensaje, idProducto = null) {
    try {
      const response = await api.post('/mensajes/contactar-productor', {
        id_productor: idProductor,
        nombre,
        email,
        telefono,
        mensaje,
        id_producto: idProducto,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Marcar mensaje como leído
   */
  async marcarComoLeido(idMensaje) {
    try {
      const response = await api.put(`/mensajes/${idMensaje}/leer`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Eliminar mensaje
   */
  async eliminarMensaje(idMensaje) {
    try {
      const response = await api.delete(`/mensajes/${idMensaje}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Obtener conversación con un usuario específico
   */
  async obtenerConversacion(idUsuario) {
    try {
      const response = await api.get(`/mensajes/conversacion/${idUsuario}`);
      // El API devuelve { success: true, conversacion: [...], total: number }
      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.conversacion || response.data.data || [],
          total: response.data.total || 0
        };
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default mensajesService;






