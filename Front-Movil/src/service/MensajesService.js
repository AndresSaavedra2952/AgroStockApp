import api from './ApiService';

export const mensajesService = {
  /**
   * Obtener mensajes recibidos
   */
  async getMensajesRecibidos() {
    try {
      console.log('📥 [MensajesService] Obteniendo mensajes recibidos...');
      const response = await api.get('/mensajes/recibidos');
      console.log('📥 [MensajesService] Respuesta raw:', JSON.stringify(response.data, null, 2));
      
      // El backend devuelve { success: true, mensajes: [...] } o { success: true, data: [...] }
      // Normalizar para que siempre tenga 'data'
      if (response.data.success) {
        const mensajes = response.data.mensajes || response.data.data || [];
        console.log(`📥 [MensajesService] Normalizando ${mensajes.length} mensajes`);
        
        return {
          ...response.data,
          data: mensajes,
          mensajes: mensajes, // Mantener también 'mensajes' para compatibilidad
        };
      }
      
      console.warn('⚠️ [MensajesService] Respuesta sin success:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [MensajesService] Error al obtener mensajes:', error);
      throw error.response?.data || error.message;
    }
  },

  /**
   * Obtener mensajes enviados
   */
  async getMensajesEnviados() {
    try {
      const response = await api.get('/mensajes/enviados');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Enviar mensaje
   */
  async enviarMensaje(idDestinatario, asunto, mensaje, idProducto = null, tipoMensaje = 'consulta') {
    try {
      console.log('📤 [MensajesService] Enviando mensaje:', {
        id_destinatario: idDestinatario,
        asunto,
        mensaje_length: mensaje.length,
        id_producto: idProducto,
        tipo_mensaje: tipoMensaje,
      });

      const response = await api.post('/mensajes/enviar', {
        id_destinatario: idDestinatario,
        asunto,
        mensaje,
        id_producto: idProducto,
        tipo_mensaje: tipoMensaje,
      });

      console.log('✅ [MensajesService] Respuesta recibida:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [MensajesService] Error al enviar mensaje:', {
        error: error.response?.data || error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
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
   * Obtener conversación con un usuario
   */
  async getConversacion(idUsuario) {
    try {
      const response = await api.get(`/mensajes/conversacion/${idUsuario}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Obtener mensajes no leídos
   */
  async getMensajesNoLeidos() {
    try {
      const response = await api.get('/mensajes/no-leidos');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Endpoint de prueba para debug
   */
  async probarMensajes() {
    try {
      const response = await api.get('/mensajes/probar');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default mensajesService;






