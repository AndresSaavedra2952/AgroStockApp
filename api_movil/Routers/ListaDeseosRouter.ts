import { Router } from "../Dependencies/dependencias.ts";
import { ListaDeseosController } from "../Controller/ListaDeseosController.ts";
import { AuthMiddleware } from "../Middlewares/AuthMiddleware.ts";

const ListaDeseosRouter = new Router();

// 📌 Lista de deseos: Consumidores y productores pueden usar la lista de deseos
// IMPORTANTE: Las rutas más específicas deben ir ANTES de las rutas con parámetros
// Orden correcto: rutas específicas primero, luego rutas con parámetros
ListaDeseosRouter.get("/lista-deseos/producto/:id_producto/verificar", AuthMiddleware(['consumidor', 'productor', 'admin']), ListaDeseosController.VerificarProductoEnLista);
ListaDeseosRouter.delete("/lista-deseos/limpiar", AuthMiddleware(['consumidor', 'productor', 'admin']), ListaDeseosController.LimpiarListaDeseos);
ListaDeseosRouter.delete("/lista-deseos/producto/:id_producto", AuthMiddleware(['consumidor', 'productor', 'admin']), ListaDeseosController.EliminarProductoDeListaDeseos);
ListaDeseosRouter.get("/lista-deseos", AuthMiddleware(['consumidor', 'productor', 'admin']), ListaDeseosController.ObtenerMiListaDeseos);
ListaDeseosRouter.post("/lista-deseos", AuthMiddleware(['consumidor', 'productor', 'admin']), ListaDeseosController.AgregarAListaDeseos);
ListaDeseosRouter.delete("/lista-deseos/:id_lista", AuthMiddleware(['consumidor', 'productor', 'admin']), ListaDeseosController.EliminarDeListaDeseos);

export { ListaDeseosRouter };






