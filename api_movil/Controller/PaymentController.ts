// 💳 CONTROLADOR DE PAGOS

import { Context } from "../Dependencies/dependencias.ts";
import { PaymentService, type PaymentData, type PaymentResponse } from "../Services/PaymentService.ts";
import { AuditoriaService } from "../Services/AuditoriaService.ts";

export class PaymentController {
  
  /**
   * Crear pago
   */
  static async crearPago(ctx: Context) {
    try {
      const user = ctx.state.user;
      if (!user) {
        ctx.response.status = 401;
        ctx.response.body = {
          success: false,
          error: "No autenticado",
          message: "Debes estar autenticado"
        };
        return;
      }

      const body = await ctx.request.body.json();
      const paymentData: PaymentData = {
        id_pedido: Number(body.id_pedido),
        id_usuario: user.id,
        monto: Number(body.monto),
        metodo_pago: (body.metodo_pago || 'efectivo') as PaymentData['metodo_pago'],
        pasarela: body.pasarela as PaymentData['pasarela'],
        datos_tarjeta: body.datos_tarjeta as PaymentData['datos_tarjeta'],
        datos_adicionales: body.datos_adicionales as PaymentData['datos_adicionales']
      };

      const result = await PaymentService.crearPago(paymentData, ctx);

      // Registrar en auditoría
      await AuditoriaService.registrarAccion({
        id_usuario: user.id,
        accion: 'crear_pago',
        tabla_afectada: 'pedidos',
        id_registro_afectado: result.id_pago,
        datos_despues: paymentData as unknown as Record<string, unknown>,
        resultado: result.success ? 'exitoso' : 'fallido',
        error_message: result.error
      }, ctx);

      ctx.response.status = result.success ? 201 : 400;
      ctx.response.body = result;
    } catch (error) {
      console.error("Error creando pago:", error);
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        error: "Error interno del servidor",
        message: "Error al crear pago"
      };
    }
  }


  static async crearStripePaymentIntent(ctx: Context) {
    try {
      const user = ctx.state.user;
      if (!user) {
        ctx.response.status = 401;
        ctx.response.body = {
          success: false,
          error: "No autenticado",
          message: "Debes estar autenticado"
        };
        return;
      }

      const body = await ctx.request.body.json();
      const { id_pedido, monto } = body;

      if (!id_pedido || !monto) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: "Datos incompletos",
          message: "Se requiere id_pedido y monto"
        };
        return;
      }

      const paymentData: PaymentData = {
        id_pedido: Number(id_pedido),
        id_usuario: user.id,
        monto: Number(monto),
        metodo_pago: 'tarjeta',
        pasarela: 'stripe'
      };

      const result = await PaymentService.crearPago(paymentData, ctx) as PaymentResponse;

      const resultTyped = result as PaymentResponse;
      if (resultTyped.success && resultTyped.datos_adicionales) {
        ctx.response.status = 201;
        ctx.response.body = {
          success: true,
          data: {
            client_secret: resultTyped.datos_adicionales.client_secret,
            payment_intent_id: resultTyped.datos_adicionales.payment_intent_id,
            id_pago: resultTyped.id_pago,
            referencia_pago: resultTyped.referencia_pago
          }
        };
      } else {
        ctx.response.status = 400;
        ctx.response.body = result;
      }
    } catch (error) {
      console.error("Error creando Payment Intent de Stripe:", error);
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        error: "Error interno del servidor",
        message: "Error al crear sesión de pago"
      };
    }
  }

  static async confirmarPagoStripe(ctx: Context) {
    try {
      const user = ctx.state.user;
      if (!user) {
        ctx.response.status = 401;
        ctx.response.body = {
          success: false,
          error: "No autenticado"
        };
        return;
      }

      const body = await ctx.request.body.json();
      const { payment_intent_id, estado, id_pedido } = body;

      if (!payment_intent_id || !estado) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: "Datos incompletos"
        };
        return;
      }

      const success = await (PaymentService as any).confirmarPagoStripe(
        payment_intent_id,
        estado as 'succeeded' | 'failed' | 'canceled',
        id_pedido ? Number(id_pedido) : undefined
      ) as boolean;

      if (success) {
        ctx.response.status = 200;
        ctx.response.body = {
          success: true,
          message: "Pago confirmado correctamente"
        };
      } else {
        ctx.response.status = 404;
        ctx.response.body = {
          success: false,
          error: "No se encontró el pago"
        };
      }
    } catch (error) {
      console.error("Error confirmando pago de Stripe:", error);
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        error: "Error interno del servidor"
      };
    }
  }

  static async stripeWebhook(ctx: Context) {
    try {
      const webhookSecret = await (PaymentService as any).getStripeWebhookSecret() as string;
      const signature = ctx.request.headers.get("stripe-signature");

      if (!signature) {
        ctx.response.status = 400;
        ctx.response.body = { success: false, error: "Falta firma de Stripe" };
        return;
      }

      const body = await ctx.request.body.text();
      
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(body) as Record<string, unknown>;
      } catch {
        ctx.response.status = 400;
        ctx.response.body = { success: false, error: "Body inválido" };
        return;
      }

      const success = await (PaymentService as any).stripeWebhook(event) as boolean;

      if (success) {
        ctx.response.status = 200;
        ctx.response.body = { success: true, received: true };
      } else {
        ctx.response.status = 500;
        ctx.response.body = { success: false, error: "Error procesando webhook" };
      }
    } catch (error) {
      console.error("Error procesando webhook de Stripe:", error);
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        error: "Error procesando webhook"
      };
    }
  }
}






