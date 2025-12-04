// 💳 SERVICIO DE PAGOS - INTEGRACIÓN CON STRIPE

import { conexion } from "../Models/Conexion.ts";
import type { Context } from "../Dependencies/dependencias.ts";
import { load } from "../Dependencies/dependencias.ts";

let envLoaded = false;
let envCache: Record<string, string> = {};

async function loadEnvIfNeeded(): Promise<void> {
  if (!envLoaded) {
    try {
      envCache = await load();
      envLoaded = true;
    } catch (error) {
      console.warn("⚠️ No se pudo cargar el archivo .env, usando variables de entorno del sistema");
      envLoaded = true;
    }
  }
}

export interface PaymentData {
  id_pedido: number;
  id_usuario: number;
  monto: number;
  metodo_pago: 'tarjeta' | 'efectivo' | 'transferencia';
  pasarela?: 'stripe';
  datos_adicionales?: Record<string, unknown>;
}

export interface PaymentResponse {
  success: boolean;
  id_pago?: number;
  referencia_pago?: string;
  estado_pago?: string;
  url_pago?: string;
  mensaje?: string;
  error?: string;
  datos_adicionales?: {
    client_secret?: string;
    payment_intent_id?: string;
  };
}

export class PaymentService {
  private static async getStripeSecretKey(): Promise<string> {
    await loadEnvIfNeeded();
    return envCache["STRIPE_SECRET_KEY"] || Deno.env.get("STRIPE_SECRET_KEY") || "";
  }

  private static async getStripePublishableKey(): Promise<string> {
    await loadEnvIfNeeded();
    return envCache["STRIPE_PUBLISHABLE_KEY"] || Deno.env.get("STRIPE_PUBLISHABLE_KEY") || "";
  }

  static async getStripeWebhookSecret(): Promise<string> {
    await loadEnvIfNeeded();
    return envCache["STRIPE_WEBHOOK_SECRET"] || Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
  }

  /**
   * Crear pago - Solo Stripe o efectivo
   */
  static async crearPago(
    data: PaymentData,
    _ctx?: Context
  ): Promise<PaymentResponse> {
    try {
      // Validar monto
      if (data.monto <= 0) {
        return {
          success: false,
          error: "El monto debe ser mayor a 0"
        };
      }

      // Procesar según método de pago - trabajar directamente con la tabla pedidos
      if (data.metodo_pago === 'efectivo') {
        // Pago en efectivo - actualizar estado_pago en pedidos
        await conexion.execute(
          `UPDATE pedidos SET estado_pago = 'pendiente' WHERE id_pedido = ?`,
          [data.id_pedido]
        );
        
        return {
          success: true,
          id_pago: data.id_pedido,
          estado_pago: 'pendiente',
          mensaje: "Pago en efectivo registrado. Se confirmará cuando se reciba el pago."
        };
      }

      // Procesar con Stripe
      if (data.pasarela === 'stripe' || data.metodo_pago === 'tarjeta') {
        return await this.procesarConStripe(data.id_pedido, data);
      } else {
        return {
          success: false,
          error: "Método de pago no soportado. Solo se acepta efectivo o tarjeta (Stripe)."
        };
      }
    } catch (error) {
      console.error("Error creando pago:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error al crear pago"
      };
    }
  }

  /**
   * Procesar pago con Stripe
   */
  private static async procesarConStripe(
    id_pedido: number,
    data: PaymentData
  ): Promise<PaymentResponse> {
    try {
      await conexion.execute(
        `UPDATE pedidos SET estado_pago = 'pendiente' WHERE id_pedido = ?`,
        [id_pedido]
      );

      const referencia_pago = `STRIPE_${Date.now()}_${id_pedido}`;

      const stripeApiUrl = "https://api.stripe.com/v1/payment_intents";
      const montoEnCentavos = Math.round(Number(data.monto) * 100);
      
      const [pedidoInfo] = await conexion.query(
        `SELECT p.*, u.email, u.nombre, u.telefono
         FROM pedidos p
         INNER JOIN usuarios u ON p.id_consumidor = u.id_usuario
         WHERE p.id_pedido = ?`,
        [id_pedido]
      ) as Array<Record<string, unknown>>;

      if (!pedidoInfo) {
        throw new Error("No se encontró información del pedido");
      }

      const formData = new URLSearchParams();
      formData.append('amount', String(montoEnCentavos));
      formData.append('currency', 'usd');
      formData.append('metadata[pedido_id]', String(id_pedido));
      formData.append('metadata[referencia]', referencia_pago);
      formData.append('description', `Pago AgroStock - Pedido #${id_pedido}`);
      formData.append('receipt_email', String(pedidoInfo.email || 'test@test.com'));

      const stripeKey = await this.getStripeSecretKey();
      if (!stripeKey || stripeKey === '' || stripeKey.includes('example') || stripeKey.includes('tu_clave')) {
        throw new Error("Clave secreta de Stripe no configurada. Configura STRIPE_SECRET_KEY en tu archivo .env");
      }

      const stripeResponse = await fetch(stripeApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });

      if (!stripeResponse.ok) {
        const errorData = await stripeResponse.text();
        throw new Error(`Error de Stripe: ${errorData}`);
      }

      const paymentIntent = await stripeResponse.json() as {
        id: string;
        client_secret: string;
        status: string;
      };

      return {
        success: true,
        id_pago: id_pedido,
        referencia_pago,
        estado_pago: 'pendiente',
        url_pago: undefined,
        mensaje: "Sesión de pago creada. Usa el client_secret para completar el pago.",
        datos_adicionales: {
          client_secret: paymentIntent.client_secret,
          payment_intent_id: paymentIntent.id
        }
      };
    } catch (error) {
      console.error("[Stripe] Error procesando pago:", error);
      await conexion.execute(
        `UPDATE pedidos SET estado_pago = 'pendiente' WHERE id_pedido = ?`,
        [id_pedido]
      );
      return {
        success: false,
        error: "Error procesando pago con Stripe: " + (error instanceof Error ? error.message : 'Error desconocido')
      };
    }
  }

  /**
   * Confirmar pago de Stripe
   */
  static async confirmarPagoStripe(
    paymentIntentId: string,
    estado: 'succeeded' | 'failed' | 'canceled',
    id_pedido?: number
  ): Promise<boolean> {
    try {
      let pedidoId = id_pedido;

      if (!pedidoId) {
        const stripeApiUrl = `https://api.stripe.com/v1/payment_intents/${paymentIntentId}`;
        const stripeKey = await this.getStripeSecretKey();
        const stripeResponse = await fetch(stripeApiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${stripeKey}`,
          },
        });

        if (stripeResponse.ok) {
          const paymentIntent = await stripeResponse.json() as {
            metadata?: { pedido_id?: string };
          };
          if (paymentIntent.metadata?.pedido_id) {
            pedidoId = parseInt(paymentIntent.metadata.pedido_id);
          }
        }
      }

      if (!pedidoId) {
        console.error("[Stripe] No se pudo determinar el id_pedido para payment_intent_id:", paymentIntentId);
        return false;
      }

      const nuevoEstadoPago = estado === 'succeeded' ? 'pagado' : 'pendiente';

      await conexion.execute(
        `UPDATE pedidos SET estado_pago = ? WHERE id_pedido = ?`,
        [nuevoEstadoPago, pedidoId]
      );

      if (estado === 'succeeded') {
        await conexion.execute(
          `UPDATE pedidos SET estado = 'confirmado' WHERE id_pedido = ?`,
          [pedidoId]
        );

        const pedidosResult = await conexion.query(
          `SELECT id_consumidor, id_productor, total FROM pedidos WHERE id_pedido = ?`,
          [pedidoId]
        ) as Array<{ id_consumidor: number; id_productor: number; total: number }>;

        if (!pedidosResult || pedidosResult.length === 0) {
          console.error("[Stripe] ❌ No se encontró el pedido:", pedidoId);
          return false;
        }

        const pedido = pedidosResult[0];

        if (pedido.id_consumidor) {
          try {
            const { NotificationService } = await import("./NotificationService.ts");
            const notificationService = new NotificationService();
            
            await notificationService.createNotification({
              id_usuario: pedido.id_consumidor,
              titulo: "✅ Pago Completado Exitosamente",
              mensaje: `¡Felicidades! Tu pedido #${pedidoId} ha sido pagado exitosamente por un total de $${pedido.total.toLocaleString()}. El productor recibirá una notificación y comenzará a preparar tu pedido.`,
              tipo: 'success',
              datos_extra: {
                pedido_id: pedidoId,
                action: 'view_order'
              }
            });
          } catch (error) {
            console.error("[Stripe] Error notificando al consumidor:", error);
          }
        }

        if (pedido.id_productor) {
          try {
            const productos = await conexion.query(
              `SELECT dp.*, pr.nombre, pr.unidad_medida
               FROM detalle_pedidos dp
               INNER JOIN productos pr ON dp.id_producto = pr.id_producto
               WHERE dp.id_pedido = ?`,
              [pedidoId]
            ) as Array<any>;

            const { NotificationService } = await import("./NotificationService.ts");
            const notificationService = new NotificationService();

            const cantidadProductos = productos.length;
            const totalFormateado = pedido.total.toLocaleString();

            await notificationService.createNotification({
              id_usuario: pedido.id_productor,
              titulo: "🛒 Nuevo Pedido Recibido",
              mensaje: `¡Tienes un nuevo pedido #${pedidoId}! El cliente ha completado el pago exitosamente por un total de $${totalFormateado}. El pedido incluye ${cantidadProductos} producto${cantidadProductos !== 1 ? 's' : ''} y está listo para ser preparado.`,
              tipo: 'info',
              datos_extra: {
                pedido_id: pedidoId,
                productos: productos,
                action: 'view_order'
              }
            });
          } catch (notifError) {
            console.error("[Stripe] Error notificando al productor:", notifError);
          }
        }
      }

      return true;
    } catch (error) {
      console.error("[Stripe] Error confirmando pago:", error);
      return false;
    }
  }

  /**
   * Webhook de Stripe
   */
  static async stripeWebhook(event: any): Promise<boolean> {
    try {
      console.log("[Stripe Webhook] Evento recibido:", event.type);

      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as { id: string; metadata?: { pedido_id?: string } };
        const id_pedido = paymentIntent.metadata?.pedido_id ? parseInt(paymentIntent.metadata.pedido_id) : undefined;
        await this.confirmarPagoStripe(paymentIntent.id, 'succeeded', id_pedido);
      } else if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object as { id: string; metadata?: { pedido_id?: string } };
        const id_pedido = paymentIntent.metadata?.pedido_id ? parseInt(paymentIntent.metadata.pedido_id) : undefined;
        await this.confirmarPagoStripe(paymentIntent.id, 'failed', id_pedido);
      } else if (event.type === 'payment_intent.canceled') {
        const paymentIntent = event.data.object as { id: string; metadata?: { pedido_id?: string } };
        const id_pedido = paymentIntent.metadata?.pedido_id ? parseInt(paymentIntent.metadata.pedido_id) : undefined;
        await this.confirmarPagoStripe(paymentIntent.id, 'canceled', id_pedido);
      }

      return true;
    } catch (error) {
      console.error("[Stripe Webhook] Error procesando webhook:", error);
      return false;
    }
  }
}
