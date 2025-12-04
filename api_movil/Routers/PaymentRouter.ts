// 💳 ROUTER DE PAGOS

import { Router } from "../Dependencies/dependencias.ts";
import { PaymentController } from "../Controller/PaymentController.ts";
import { AuthMiddleware } from "../Middlewares/AuthMiddleware.ts";

export const PaymentRouter = new Router();

// ✅ Pagos: Solo Stripe y efectivo - trabajando directamente con tabla pedidos
// Crear pago: solo consumidor (o admin)
PaymentRouter.post("/pagos", AuthMiddleware(['consumidor', 'admin']), PaymentController.crearPago);

// 💳 Rutas de Stripe
PaymentRouter.post("/pagos/stripe/create-intent", AuthMiddleware(['consumidor', 'admin']), PaymentController.crearStripePaymentIntent);
PaymentRouter.post("/pagos/stripe/confirmar", AuthMiddleware(['consumidor', 'admin']), PaymentController.confirmarPagoStripe);
PaymentRouter.post("/pagos/stripe/webhook", PaymentController.stripeWebhook);






