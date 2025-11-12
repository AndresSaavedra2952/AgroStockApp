import { Router } from "../Dependencies/dependencias.ts";
import { AuthController } from "../Controller/AuthController.ts";
import { AuthMiddleware } from "../Middlewares/AuthMiddleware.ts";

const AuthRouter = new Router();

// Rutas públicas
AuthRouter.post("/auth/login", AuthController.login);
AuthRouter.post("/auth/register", AuthController.register);
// Ruta temporal para resetear contraseña (solo desarrollo)
AuthRouter.post("/auth/reset-password", AuthController.resetPassword);
// Ruta temporal para probar hash (solo desarrollo)
AuthRouter.post("/auth/test-hash", AuthController.testHash);

// Rutas protegidas
AuthRouter.post("/auth/logout", AuthMiddleware([]), AuthController.logout);
AuthRouter.get("/auth/verify", AuthMiddleware([]), AuthController.verifyToken);
AuthRouter.post("/auth/change-password", AuthMiddleware([]), AuthController.changePassword);

export { AuthRouter };
