import api from './ApiService';

export const cartService = {
  /**
   * Obtener carrito del usuario
   */
  async getCarrito() {
    try {
      const response = await api.get('/cart');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Agregar producto al carrito
   */
  async agregarProducto(idProducto, cantidad, precioUnitario) {
    try {
      const response = await api.post('/cart/add', {
        id_producto: idProducto,
        cantidad,
        precio_unitario: precioUnitario,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Actualizar cantidad de un item en el carrito
   * Nota: El backend usa id_producto, no id_item
   */
  async actualizarItem(idProducto, cantidad) {
    try {
      const response = await api.put(`/cart/item/${idProducto}`, {
        cantidad,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Eliminar item del carrito
   * Nota: El backend usa id_producto, no id_item
   */
  async eliminarItem(idProducto) {
    try {
      const response = await api.delete(`/cart/item/${idProducto}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Limpiar carrito completo
   */
  async limpiarCarrito() {
    try {
      const response = await api.delete('/cart/clear');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Validar carrito antes de checkout
   */
  async validarCarrito() {
    try {
      const response = await api.get('/cart/validate');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  async checkout(direccionEntrega, notas, fechaEntregaEstimada, metodoPago) {
    try {
      const response = await api.post('/cart/checkout', {
        direccionEntrega,
        notas,
        metodo_pago: metodoPago,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Obtener estadísticas del carrito
   */
  async getEstadisticas() {
    try {
      const response = await api.get('/cart/stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default cartService;






