import { Router } from "../Dependencies/dependencias.ts";
import { MensajesController } from "../Controller/MensajesController.ts";
import { AuthMiddleware } from "../Middlewares/AuthMiddleware.ts";

const router = new Router();

// 📌 Rutas para mensajes (requieren autenticación)
router.post("/mensajes/enviar", AuthMiddleware(['consumidor', 'productor']), MensajesController.EnviarMensaje);
router.get("/mensajes/recibidos", AuthMiddleware(['consumidor', 'productor']), MensajesController.ObtenerMensajesRecibidos);
router.get("/mensajes/enviados", AuthMiddleware(['consumidor', 'productor']), MensajesController.ObtenerMensajesEnviados);
router.put("/mensajes/:id_mensaje/leer", AuthMiddleware(['consumidor', 'productor']), MensajesController.MarcarComoLeido);
router.delete("/mensajes/:id_mensaje", AuthMiddleware(['consumidor', 'productor']), MensajesController.EliminarMensaje);
router.get("/mensajes/no-leidos", AuthMiddleware(['consumidor', 'productor']), MensajesController.ObtenerMensajesNoLeidos);
router.get("/mensajes/conversacion/:id_usuario", AuthMiddleware(['consumidor', 'productor']), MensajesController.ObtenerConversacion);
router.get("/mensajes/probar", AuthMiddleware(['consumidor', 'productor']), MensajesController.ProbarMensajes);

// 📌 Ruta para contactar productor (sin autenticación)
router.post("/mensajes/contactar-productor", MensajesController.ContactarProductor);

export { router as MensajesRouter };
