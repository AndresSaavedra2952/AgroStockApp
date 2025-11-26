import api from './ApiService';

export const listaDeseosService = {
  /**
   * Obtener lista de deseos del usuario autenticado
   */
  async getListaDeseos() {
    try {
      const response = await api.get('/lista-deseos');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Agregar producto a lista de deseos
   * @param {number} idProducto - ID del producto a agregar
   */
  async agregarProducto(idProducto) {
    try {
      const response = await api.post('/lista-deseos', {
        id_producto: idProducto,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Eliminar producto de lista de deseos por ID de lista
   * @param {number} idLista - ID del registro en la lista de deseos
   */
  async eliminarPorIdLista(idLista) {
    try {
      const response = await api.delete(`/lista-deseos/${idLista}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Eliminar producto de lista de deseos por ID de producto
   * @param {number} idProducto - ID del producto a eliminar
   */
  async eliminarPorIdProducto(idProducto) {
    try {
      const response = await api.delete(`/lista-deseos/producto/${idProducto}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Limpiar toda la lista de deseos del usuario
   */
  async limpiarLista() {
    try {
      const response = await api.delete('/lista-deseos/limpiar');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Verificar si un producto está en la lista de deseos
   * @param {number} idProducto - ID del producto a verificar
   * @returns {Promise<boolean>} - true si está en la lista, false si no
   */
  async verificarProducto(idProducto) {
    try {
      const response = await api.get(`/lista-deseos/producto/${idProducto}/verificar`);
      return response.data?.estaEnLista || false;
    } catch (error) {
      // Si hay error, asumir que no está en la lista
      if (error.response?.status === 404) {
        return false;
      }
      throw error.response?.data || error.message;
    }
  },
};

export default listaDeseosService;

