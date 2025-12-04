import api from './ApiService';

export const productosService = {
  /**
   * Obtener lista de productos con filtros
   */
  async getProductos(filtros = {}) {
    try {
      const params = new URLSearchParams();
      Object.keys(filtros).forEach(key => {
        if (filtros[key] !== undefined && filtros[key] !== null) {
          params.append(key, filtros[key]);
        }
      });
      
      const response = await api.get(`/productos?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Buscar productos por nombre
   */
  async buscarProductos(nombre, filtros = {}) {
    try {
      const params = new URLSearchParams({ nombre, ...filtros });
      const response = await api.get(`/productos/search?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Obtener producto por ID
   */
  async getProductoPorId(id) {
    try {
      const response = await api.get(`/productos/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Obtener producto detallado
   */
  async getProductoDetallado(id) {
    try {
      const response = await api.get(`/productos/${id}/detalle`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Obtener productos de un usuario/productor
   */
  async getProductosPorUsuario(idUsuario) {
    try {
      const response = await api.get(`/productos/usuario/${idUsuario}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Obtener productos de un productor
   */
  async getProductosPorProductor(idProductor) {
    try {
      const response = await api.get(`/productos/productor/${idProductor}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Crear nuevo producto
   */
  async crearProducto(productoData) {
    try {
      const response = await api.post('/productos', productoData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Actualizar producto
   */
  async actualizarProducto(id, productoData) {
    try {
      const response = await api.put(`/productos/${id}`, productoData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Eliminar producto
   */
  async eliminarProducto(id) {
    try {
      const response = await api.delete(`/productos/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Subir imagen adicional a un producto
   */
  async subirImagenAdicional(idProducto, imagenData) {
    try {
      const response = await api.post(`/images/producto/${idProducto}/adicional`, imagenData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default productosService;






