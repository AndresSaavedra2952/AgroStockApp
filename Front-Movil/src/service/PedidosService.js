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
   * Confirmar pedido (productor)
   */
  async confirmarPedido(id) {
    try {
      const response = await api.put(`/pedidos/${id}/confirm`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Marcar pedido como completado (productor)
   */
  async completarPedido(id) {
    try {
      const response = await api.put(`/pedidos/${id}/complete`);
      return response.data;
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
};

export default pedidosService;






