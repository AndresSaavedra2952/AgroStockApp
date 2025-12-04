import api from './ApiService';

export const listaDeseosService = {
  /**
   * Obtener lista de deseos del usuario
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
   * Agregar producto a la lista de deseos
   */
  async agregarAListaDeseos(idProducto) {
    try {
      const response = await api.post('/lista-deseos', {
        id_producto: idProducto
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Eliminar producto de la lista de deseos por ID de producto
   */
  async eliminarProductoDeListaDeseos(idProducto) {
    try {
      const response = await api.delete(`/lista-deseos/producto/${idProducto}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Eliminar producto de la lista de deseos por ID de lista
   */
  async eliminarDeListaDeseos(idLista) {
    try {
      const response = await api.delete(`/lista-deseos/${idLista}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Verificar si un producto está en la lista de deseos
   */
  async verificarProductoEnLista(idProducto) {
    try {
      const response = await api.get(`/lista-deseos/producto/${idProducto}/verificar`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Limpiar toda la lista de deseos
   */
  async limpiarListaDeseos() {
    try {
      const response = await api.delete('/lista-deseos/limpiar');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default listaDeseosService;


