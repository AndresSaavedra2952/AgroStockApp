import { Context, RouterContext } from "../Dependencies/dependencias.ts";
import { EstadisticasModel } from "../Models/EstadisticasModel.ts";

export class EstadisticasController {
  
  // 📌 Obtener estadísticas generales del sistema (solo admin)
  static async ObtenerEstadisticasGenerales(ctx: Context) {
    try {
      const estadisticasModel = new EstadisticasModel();
      const estadisticas = await estadisticasModel.ObtenerEstadisticasGenerales();

      ctx.response.status = 200;
      ctx.response.body = {
        success: true,
        estadisticas
      };
    } catch (error) {
      console.error("Error en ObtenerEstadisticasGenerales:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Error interno del servidor" };
    }
  }

  // 📌 Obtener estadísticas de un usuario específico
  static async ObtenerEstadisticasUsuario(ctx: RouterContext<"/estadisticas/usuario/:id_usuario">) {
    try {
      const { id_usuario } = ctx.params;
      const userId = ctx.state.user.id;
      const userRole = ctx.state.user.rol;

      // Solo el propio usuario o un admin pueden ver las estadísticas
      if (userRole !== 'admin' && parseInt(id_usuario) !== userId) {
        ctx.response.status = 403;
        ctx.response.body = { error: "No tienes permisos para ver estas estadísticas" };
        return;
      }

      const estadisticasModel = new EstadisticasModel();
      const estadisticas = await estadisticasModel.ObtenerEstadisticasUsuario(parseInt(id_usuario));

      ctx.response.status = 200;
      ctx.response.body = {
        success: true,
        estadisticas
      };
    } catch (error) {
      console.error("Error en ObtenerEstadisticasUsuario:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Error interno del servidor" };
    }
  }

  // 📌 Actualizar estadísticas de un usuario
  static async ActualizarEstadisticasUsuario(ctx: RouterContext<"/estadisticas/usuario/:id_usuario">) {
    try {
      const { id_usuario } = ctx.params;
      const userId = ctx.state.user.id;
      const userRole = ctx.state.user.rol;

      // Solo el propio usuario o un admin pueden actualizar las estadísticas
      if (userRole !== 'admin' && parseInt(id_usuario) !== userId) {
        ctx.response.status = 403;
        ctx.response.body = { error: "No tienes permisos para actualizar estas estadísticas" };
        return;
      }

      const estadisticasModel = new EstadisticasModel();
      const result = await estadisticasModel.ActualizarEstadisticasUsuario(parseInt(id_usuario));

      if (result.success) {
        ctx.response.status = 200;
        ctx.response.body = result;
      } else {
        ctx.response.status = 400;
        ctx.response.body = result;
      }
    } catch (error) {
      console.error("Error en ActualizarEstadisticasUsuario:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Error interno del servidor" };
    }
  }

  // 📌 Obtener actividad reciente del sistema (solo admin)
  static async ObtenerActividadReciente(ctx: Context) {
    try {
      const estadisticasModel = new EstadisticasModel();
      const actividad = await estadisticasModel.ObtenerActividadReciente();

      ctx.response.status = 200;
      ctx.response.body = {
        success: true,
        actividad
      };
    } catch (error) {
      console.error("Error en ObtenerActividadReciente:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Error interno del servidor" };
    }
  }

  // 📌 Obtener estadísticas de productos por categoría
  static async ObtenerEstadisticasProductosPorCategoria(ctx: Context) {
    try {
      const { conexion } = await import("../Models/Conexion.ts");
      
      const estadisticas = await conexion.query(`
        SELECT 
          c.nombre as categoria,
          COUNT(pc.id_producto) as total_productos,
          AVG(p.precio) as precio_promedio,
          SUM(p.stock) as stock_total,
          COUNT(DISTINCT p.id_usuario) as productores_unicos
        FROM categorias c
        LEFT JOIN productos_categorias pc ON c.id_categoria = pc.id_categoria
        LEFT JOIN productos p ON pc.id_producto = p.id_producto
        WHERE c.activa = 1
        GROUP BY c.id_categoria, c.nombre
        ORDER BY total_productos DESC
      `);

      ctx.response.status = 200;
      ctx.response.body = {
        success: true,
        estadisticas
      };
    } catch (error) {
      console.error("Error en ObtenerEstadisticasProductosPorCategoria:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Error interno del servidor" };
    }
  }

  // 📌 Obtener estadísticas de usuarios por región
  static async ObtenerEstadisticasUsuariosPorRegion(ctx: Context) {
    try {
      const { conexion } = await import("../Models/Conexion.ts");
      
      const estadisticas = await conexion.query(`
        SELECT 
          r.nombre as region,
          COUNT(u.id_usuario) as total_usuarios,
          COUNT(CASE WHEN u.rol = 'productor' THEN 1 END) as productores,
          COUNT(CASE WHEN u.rol = 'consumidor' THEN 1 END) as consumidores,
          COUNT(CASE WHEN u.rol = 'admin' THEN 1 END) as administradores
        FROM regiones r
        LEFT JOIN departamentos d ON r.id_region = d.id_region
        LEFT JOIN ciudades c ON d.id_departamento = c.id_departamento
        LEFT JOIN usuarios u ON c.id_ciudad = u.id_ciudad
        GROUP BY r.id_region, r.nombre
        ORDER BY total_usuarios DESC
      `);

      ctx.response.status = 200;
      ctx.response.body = {
        success: true,
        estadisticas
      };
    } catch (error) {
      console.error("Error en ObtenerEstadisticasUsuariosPorRegion:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Error interno del servidor" };
    }
  }

  // 📌 Obtener estadísticas de pedidos
  static async ObtenerEstadisticasPedidos(ctx: Context) {
    try {
      const { conexion } = await import("../Models/Conexion.ts");
      
      const estadisticas = await conexion.query(`
        SELECT 
          estado,
          COUNT(*) as total,
          AVG(total) as promedio_valor,
          SUM(total) as valor_total
        FROM pedidos
        GROUP BY estado
        ORDER BY total DESC
      `);

      const pedidosPorMes = await conexion.query(`
        SELECT 
          DATE_FORMAT(fecha, '%Y-%m') as mes,
          COUNT(*) as total_pedidos,
          SUM(total) as valor_total,
          AVG(total) as promedio_valor
        FROM pedidos
        WHERE fecha >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(fecha, '%Y-%m')
        ORDER BY mes DESC
      `);

      ctx.response.status = 200;
      ctx.response.body = {
        success: true,
        estadisticas: {
          por_estado: estadisticas,
          por_mes: pedidosPorMes
        }
      };
    } catch (error) {
      console.error("Error en ObtenerEstadisticasPedidos:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Error interno del servidor" };
    }
  }

  // 📌 Obtener estadísticas de mensajes
  static async ObtenerEstadisticasMensajes(ctx: Context) {
    try {
      const { conexion } = await import("../Models/Conexion.ts");
      
      const estadisticas = await conexion.query(`
        SELECT 
          tipo_mensaje,
          COUNT(*) as total,
          COUNT(CASE WHEN leido = 1 THEN 1 END) as leidos,
          COUNT(CASE WHEN leido = 0 THEN 1 END) as no_leidos
        FROM mensajes
        GROUP BY tipo_mensaje
        ORDER BY total DESC
      `);

      const mensajesPorMes = await conexion.query(`
        SELECT 
          DATE_FORMAT(fecha_envio, '%Y-%m') as mes,
          COUNT(*) as total_mensajes,
          COUNT(CASE WHEN leido = 1 THEN 1 END) as leidos,
          COUNT(CASE WHEN leido = 0 THEN 1 END) as no_leidos
        FROM mensajes
        WHERE fecha_envio >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(fecha_envio, '%Y-%m')
        ORDER BY mes DESC
      `);

      ctx.response.status = 200;
      ctx.response.body = {
        success: true,
        estadisticas: {
          por_tipo: estadisticas,
          por_mes: mensajesPorMes
        }
      };
    } catch (error) {
      console.error("Error en ObtenerEstadisticasMensajes:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Error interno del servidor" };
    }
  }

  // 📌 Obtener estadísticas de ventas del usuario autenticado (para productores)
  static async ObtenerMisVentas(ctx: Context) {
    try {
      const user = ctx.state.user;
      if (!user || !user.id) {
        ctx.response.status = 401;
        ctx.response.body = {
          success: false,
          error: "UNAUTHORIZED",
          message: "Usuario no autenticado"
        };
        return;
      }

      const userId = user.id;
      const { conexion } = await import("../Models/Conexion.ts");

      // Estadísticas de productos
      const productosStats = await conexion.query(`
        SELECT 
          COUNT(*) as total_productos,
          COUNT(CASE WHEN disponible = 1 THEN 1 END) as productos_activos,
          COUNT(CASE WHEN disponible = 0 THEN 1 END) as productos_inactivos,
          COUNT(CASE WHEN stock <= stock_minimo AND stock > 0 THEN 1 END) as stock_bajo,
          COUNT(CASE WHEN stock = 0 OR stock IS NULL THEN 1 END) as productos_agotados,
          SUM(stock) as stock_total,
          AVG(precio) as precio_promedio
        FROM productos
        WHERE id_usuario = ?
      `, [userId]);

      // Estadísticas de pedidos
      const pedidosStats = await conexion.query(`
        SELECT 
          COUNT(*) as total_pedidos,
          COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pedidos_pendientes,
          COUNT(CASE WHEN estado = 'confirmado' THEN 1 END) as pedidos_confirmados,
          COUNT(CASE WHEN estado = 'en_preparacion' THEN 1 END) as pedidos_en_preparacion,
          COUNT(CASE WHEN estado = 'en_camino' THEN 1 END) as pedidos_en_camino,
          COUNT(CASE WHEN estado = 'entregado' THEN 1 END) as pedidos_entregados,
          COUNT(CASE WHEN estado = 'cancelado' THEN 1 END) as pedidos_cancelados,
          SUM(CASE WHEN estado = 'entregado' THEN total ELSE 0 END) as ventas_totales,
          SUM(CASE WHEN estado IN ('pendiente', 'confirmado', 'en_preparacion', 'en_camino') THEN total ELSE 0 END) as ventas_pendientes,
          AVG(CASE WHEN estado = 'entregado' THEN total ELSE NULL END) as promedio_venta
        FROM pedidos
        WHERE id_productor = ?
      `, [userId]);

      // Pedidos por mes (últimos 6 meses)
      const pedidosPorMes = await conexion.query(`
        SELECT 
          DATE_FORMAT(fecha_pedido, '%Y-%m') as mes,
          COUNT(*) as total_pedidos,
          SUM(CASE WHEN estado = 'entregado' THEN total ELSE 0 END) as ventas_mes
        FROM pedidos
        WHERE id_productor = ? 
          AND fecha_pedido >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(fecha_pedido, '%Y-%m')
        ORDER BY mes DESC
      `, [userId]);

      // Obtener estadísticas del modelo también
      const estadisticasModel = new EstadisticasModel();
      const estadisticasUsuario = await estadisticasModel.ObtenerEstadisticasUsuario(userId);

      ctx.response.status = 200;
      ctx.response.body = {
        success: true,
        data: {
          productos: productosStats[0] || {
            total_productos: 0,
            productos_activos: 0,
            productos_inactivos: 0,
            stock_bajo: 0,
            productos_agotados: 0,
            stock_total: 0,
            precio_promedio: 0
          },
          pedidos: pedidosStats[0] || {
            total_pedidos: 0,
            pedidos_pendientes: 0,
            pedidos_confirmados: 0,
            pedidos_en_preparacion: 0,
            pedidos_en_camino: 0,
            pedidos_entregados: 0,
            pedidos_cancelados: 0,
            ventas_totales: 0,
            ventas_pendientes: 0,
            promedio_venta: 0
          },
          pedidos_por_mes: pedidosPorMes || [],
          estadisticas_usuario: estadisticasUsuario
        }
      };
    } catch (error) {
      console.error("Error en ObtenerMisVentas:", error);
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        error: "Error interno del servidor",
        message: "Error al obtener estadísticas de ventas"
      };
    }
  }
}
