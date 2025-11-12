import api from './ApiService';

export const mensajesService = {
  /**
   * Obtener mensajes recibidos
   */
  async getMensajesRecibidos() {
    try {
      const response = await api.get('/mensajes/recibidos');
      return response.data;
    } catch (error) {
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
};

export default mensajesService;






