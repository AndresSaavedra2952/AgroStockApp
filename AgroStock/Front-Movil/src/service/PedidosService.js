import api from './ApiService';

export const pedidosService = {
  /**
   * Obtener todos los pedidos del usuario
   */
  async getPedidos() {
    try {
      const response = await api.get('/pedidos');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Obtener pedido por ID
   */
  async getPedidoPorId(id) {
    try {
      const response = await api.get(`/pedidos/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Obtener pedidos recibidos (para productores)
   */
  async getPedidosRecibidos() {
    try {
      const response = await api.get('/pedidos/recibidos');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Obtener pedidos realizados (para consumidores)
   */
  async getPedidosRealizados() {
    try {
      const response = await api.get('/pedidos/realizados');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Actualizar estado del pedido (productor)
   */
  async actualizarEstadoPedido(id, pedidoData) {
    try {
      const response = await api.put(`/pedidos/${id}`, pedidoData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Confirmar pedido (productor) - DEPRECATED: usar actualizarEstadoPedido
   */
  async confirmarPedido(id) {
    try {
      // Obtener el pedido actual primero
      const pedido = await this.getPedidoPorId(id);
      if (pedido.success && pedido.data) {
        const pedidoData = pedido.data;
        // Actualizar solo el estado
        return await this.actualizarEstadoPedido(id, {
          ...pedidoData,
          estado: 'confirmado',
        });
      }
      throw new Error('No se pudo obtener el pedido');
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Marcar pedido como completado (productor) - DEPRECATED: usar actualizarEstadoPedido
   */
  async completarPedido(id) {
    try {
      // Obtener el pedido actual primero
      const pedido = await this.getPedidoPorId(id);
      if (pedido.success && pedido.data) {
        const pedidoData = pedido.data;
        // Actualizar solo el estado
        return await this.actualizarEstadoPedido(id, {
          ...pedidoData,
          estado: 'entregado',
        });
      }
      throw new Error('No se pudo obtener el pedido');
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Cancelar pedido
   */
  async cancelarPedido(id) {
    try {
      const response = await api.put(`/pedidos/${id}/cancel`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Crear pedido manualmente
   */
  async crearPedido(pedidoData) {
    try {
      const response = await api.post('/pedidos', pedidoData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Eliminar pedido (solo consumidores pueden eliminar sus pedidos pendientes)
   */
  async eliminarPedido(id) {
    try {
      const response = await api.delete(`/pedidos/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Obtener mis pedidos (para productores y consumidores)
   */
  async getMisPedidos() {
    try {
      const response = await api.get('/pedidos/mis-pedidos');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default pedidosService;






