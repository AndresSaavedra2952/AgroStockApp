import api from './ApiService';

export const reseñasService = {
  /**
   * Obtener reseñas de un producto
   */
  async getReseñasPorProducto(idProducto) {
    try {
      const response = await api.get(`/Resena/producto/${idProducto}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Crear reseña
   */
  async crearReseña(idProducto, idPedido, comentario, calificacion) {
    try {
      const response = await api.post('/Resena', {
        id_producto: idProducto,
        id_pedido: idPedido,
        comentario,
        calificacion,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Actualizar reseña
   */
  async actualizarReseña(idReseña, comentario, calificacion) {
    try {
      const response = await api.put(`/Resena/${idReseña}`, {
        comentario,
        calificacion,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Eliminar reseña
   */
  async eliminarReseña(idReseña) {
    try {
      const response = await api.delete(`/Resena/${idReseña}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default reseñasService;






