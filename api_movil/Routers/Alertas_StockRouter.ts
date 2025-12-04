import { Router } from "../Dependencies/dependencias.ts";
import {
  getAlertas,
  getAlertasActivas,
  generarAlertasAutomaticas,
  marcarAlertaResuelta,
  deleteAlerta,
  getStockBajo,
} from "../Controller/Alertas_StockController.ts";
import { AuthMiddleware } from "../Middlewares/AuthMiddleware.ts";

const AlertasRouter = new Router();

// IMPORTANTE: Las rutas específicas deben ir ANTES de las rutas con parámetros
// La ruta más específica debe ir primero para evitar conflictos
AlertasRouter.get("/alertas/stock-bajo", AuthMiddleware(["productor", "admin"]), getStockBajo);
AlertasRouter.get("/alertas/activas", AuthMiddleware(["admin", "productor"]), getAlertasActivas);
AlertasRouter.post("/alertas/generar", AuthMiddleware(["admin"]), generarAlertasAutomaticas);
AlertasRouter.put("/alertas/:id/resolver", AuthMiddleware(["admin", "productor"]), marcarAlertaResuelta);
AlertasRouter.delete("/alertas/:id", AuthMiddleware(["admin"]), deleteAlerta);
AlertasRouter.get("/alertas", AuthMiddleware(["admin"]), getAlertas); // Esta debe ir al final porque es la más genérica

console.log("✅ AlertasRouter configurado con rutas:", [
  "GET /alertas/stock-bajo",
  "GET /alertas/activas",
  "POST /alertas/generar",
  "PUT /alertas/:id/resolver",
  "DELETE /alertas/:id",
  "GET /alertas"
]);

export { AlertasRouter };
