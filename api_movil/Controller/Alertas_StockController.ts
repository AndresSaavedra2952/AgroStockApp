import { Context, RouterContext } from "../Dependencies/dependencias.ts";
import { AlertasModel } from "../Models/Alertas_StockModel.ts";

export const getAlertas = async (ctx: Context) => {
  try {
    const model = new AlertasModel();
    const lista = await model.ListarAlertas();

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: lista.length > 0 ? "Alertas encontradas." : "No se encontraron alertas.",
      data: lista,
    };
  } catch (error) {
    console.error("Error en getAlertas:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor.",
    };
  }
};

export const getAlertasActivas = async (ctx: Context) => {
  try {
    const model = new AlertasModel();
    const lista = await model.ListarAlertasActivas();

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: lista.length > 0 ? "Alertas activas encontradas." : "No hay alertas activas.",
      data: lista,
    };
  } catch (error) {
    console.error("Error en getAlertasActivas:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor.",
    };
  }
};

export const generarAlertasAutomaticas = async (ctx: Context) => {
  try {
    const model = new AlertasModel();
    const result = await model.GenerarAlertasAutomaticas();

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: result.mensaje,
      alertasCreadas: result.alertasCreadas,
    };
  } catch (error) {
    console.error("Error en generarAlertasAutomaticas:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error al generar alertas automaticas.",
    };
  }
};

export const marcarAlertaResuelta = async (ctx: RouterContext<"/alertas/:id/resolver">) => {
  try {
    const id_alerta = Number(ctx.params.id);
    if (isNaN(id_alerta) || id_alerta <= 0) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        message: "ID de alerta invalido.",
      };
      return;
    }

    const model = new AlertasModel();
    const result = await model.MarcarAlertaComoResuelta(id_alerta);

    ctx.response.status = result.success ? 200 : 404;
    ctx.response.body = {
      success: result.success,
      message: result.message,
    };
  } catch (error) {
    console.error("Error en marcarAlertaResuelta:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor.",
    };
  }
};

export const deleteAlerta = async (ctx: RouterContext<"/alertas/:id">) => {
  try {
    const id_alerta = Number(ctx.params.id);
    if (isNaN(id_alerta) || id_alerta <= 0) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        message: "ID de alerta invalido.",
      };
      return;
    }

    const model = new AlertasModel();
    const result = await model.EliminarAlerta(id_alerta);

    ctx.response.status = result.success ? 200 : 404;
    ctx.response.body = {
      success: result.success,
      message: result.message,
    };
  } catch (error) {
    console.error("Error en deleteAlerta:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor.",
    };
  }
};

// 📌 Obtener productos con stock bajo del productor autenticado
export const getStockBajo = async (ctx: Context) => {
  try {
    console.log(`[getStockBajo] 🔍 Ruta llamada: ${ctx.request.method} ${ctx.request.url.pathname}`);
    const user = ctx.state.user;
    console.log(`[getStockBajo] Usuario:`, { id: user?.id, rol: user?.rol });
    if (!user || !user.id) {
      ctx.response.status = 401;
      ctx.response.body = {
        success: false,
        error: "UNAUTHORIZED",
        message: "Usuario no autenticado"
      };
      return;
    }

    // Verificar que el usuario sea productor
    if (user.rol !== 'productor' && user.rol !== 'admin') {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        error: "FORBIDDEN",
        message: "Solo los productores pueden ver alertas de stock bajo"
      };
      return;
    }

    const { conexion } = await import("../Models/Conexion.ts");
    
    // Obtener productos del productor con stock bajo o agotado
    const productos = await conexion.query(
      `SELECT 
        p.id_producto,
        p.nombre as nombre_producto,
        p.stock as stock_actual,
        p.stock_minimo,
        p.descripcion,
        CASE 
          WHEN p.stock = 0 OR p.stock IS NULL THEN 'Sin stock'
          WHEN p.stock <= p.stock_minimo THEN 'Stock bajo'
          ELSE 'Normal'
        END as tipo_alerta,
        CASE 
          WHEN p.stock = 0 OR p.stock IS NULL THEN CONCAT('¡URGENTE! El producto "', p.nombre, '" está sin stock.')
          WHEN p.stock <= p.stock_minimo THEN CONCAT('¡ATENCIÓN! El producto "', p.nombre, '" tiene stock bajo (', p.stock, ' unidades). Stock mínimo: ', p.stock_minimo)
          ELSE ''
        END as mensaje,
        NOW() as fecha
      FROM productos p
      WHERE p.id_usuario = ? 
        AND (p.stock = 0 OR p.stock IS NULL OR (p.stock_minimo IS NOT NULL AND p.stock <= p.stock_minimo))
      ORDER BY 
        CASE 
          WHEN p.stock = 0 OR p.stock IS NULL THEN 1
          WHEN p.stock <= p.stock_minimo THEN 2
          ELSE 3
        END,
        p.nombre`,
      [user.id]
    );

    // Formatear los datos para que coincidan con lo que espera el frontend
    const alertas = productos.map((prod: any) => ({
      id_alerta: prod.id_producto, // Usar id_producto como id_alerta temporal
      id_producto: prod.id_producto,
      nombre_producto: prod.nombre_producto,
      stock_actual: prod.stock_actual || 0,
      stock_minimo: prod.stock_minimo,
      mensaje: prod.mensaje,
      tipo_alerta: prod.tipo_alerta,
      fecha: prod.fecha
    }));

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: alertas.length > 0 ? "Alertas de stock bajo encontradas." : "No hay alertas de stock bajo.",
      data: alertas,
    };
  } catch (error) {
    console.error("Error en getStockBajo:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor.",
      error: "INTERNAL_ERROR"
    };
  }
};