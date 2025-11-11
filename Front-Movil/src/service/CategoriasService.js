import api from './ApiService';

export const categoriasService = {
  /**
   * Obtener todas las categorías activas
   */
  async getCategorias() {
    try {
      const response = await api.get('/categorias');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Obtener categoría por ID
   */
  async getCategoriaPorId(id) {
    try {
      const response = await api.get(`/categorias/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Obtener productos por categoría
   */
  async getProductosPorCategoria(idCategoria) {
    try {
      const response = await api.get(`/categorias/${idCategoria}/productos`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default categoriasService;






