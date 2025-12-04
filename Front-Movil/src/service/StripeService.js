import api from './ApiService';

export const stripeService = {
  /**
   * Crear Payment Intent de Stripe
   */
  async crearPaymentIntent(idPedido, monto) {
    try {
      const response = await api.post('/pagos/stripe/create-intent', {
        id_pedido: idPedido,
        monto: monto,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Confirmar pago de Stripe
   */
  async confirmarPago(paymentIntentId, estado, idPedido) {
    try {
      const response = await api.post('/pagos/stripe/confirmar', {
        payment_intent_id: paymentIntentId,
        estado: estado,
        id_pedido: idPedido,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default stripeService;

