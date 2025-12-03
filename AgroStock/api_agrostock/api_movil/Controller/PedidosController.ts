import { Context, RouterContext } from "../Dependencies/dependencias.ts";
import { z } from "../Dependencies/dependencias.ts";
import { PedidosModel } from "../Models/PedidosModel.ts";

const pedidoSchema = z.object({
  id_consumidor: z.number().int().positive(),
  id_productor: z.number().int().positive(),
  fecha: z.string().refine((date: string) => !isNaN(Date.parse(date)), {}).transform((date: string) => new Date(date)),
  estado: z.enum(["pendiente", "confirmado", "en_preparacion", "en_camino", "entregado", "cancelado"], {}),
  total: z.number().positive(),
  direccionEntrega: z.string().min(5),
  notas: z.string().optional(),
  fecha_entrega_estimada: z.string().refine((date: string) => !isNaN(Date.parse(date)), {}).transform((date: string) => new Date(date)),
  metodo_pago: z.enum(["efectivo", "transferencia", "nequi", "daviplata", "pse", "tarjeta"], {}),
});

const pedidoSchemaUpdate = pedidoSchema.extend({
  id_pedido: z.number().int().positive(),
});

export const getPedidos = async (ctx: Context) => {
  try {
    const objPedido = new PedidosModel();
    const lista = await objPedido.ListarPedidos();

    ctx.response.status = lista.length > 0 ? 200 : 404;
    ctx.response.body = {
      success: lista.length > 0,
      message: lista.length > 0 ? "Pedidos encontrados." : "No se encontraron pedidos.",
      data: lista,
    };
  } catch (_error) {
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor.",
    };
  }
};

export const postPedido = async (ctx: Context) => {
  try {
    const user = ctx.state.user;
    if (!user) {
      ctx.response.status = 401;
      ctx.response.body = {
        success: false,
        message: "No autenticado.",
      };
      return;
    }

    const body = await ctx.request.body.json();
    const validated = pedidoSchema.parse(body);

    // ✅ Validar que solo consumidor pueda crear pedidos (o admin en nombre de otros)
    if (user.rol !== 'admin' && user.rol !== 'consumidor') {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        message: "Solo los consumidores pueden crear pedidos.",
      };
      return;
    }

    // Si no es admin, el id_consumidor debe ser el del usuario autenticado
    if (user.rol !== 'admin' && validated.id_consumidor !== user.id) {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        message: "No puedes crear pedidos para otros usuarios.",
      };
      return;
    }

    const { direccionEntrega, fecha, fecha_entrega_estimada, ...restValidated } = validated;
    const pedidoData = {
      id_pedido: null,
      ...restValidated,
      direccion_entrega: direccionEntrega, // Mapear direccionEntrega a direccion_entrega
      fecha_pedido: fecha ? fecha.toISOString() : null, // Mapear fecha a fecha_pedido
      fecha_entrega: fecha_entrega_estimada ? fecha_entrega_estimada.toISOString() : null, // Mapear fecha_entrega_estimada a fecha_entrega
    };

    const objPedido = new PedidosModel(pedidoData);
    const result = await objPedido.AgregarPedido();

    ctx.response.status = result.success ? 200 : 400;
    ctx.response.body = {
      success: result.success,
      message: result.message,
      data: result.pedido,
    };
  } catch (error) {
    ctx.response.status = 400;
    ctx.response.body = {
      success: false,
      message: error instanceof z.ZodError ? "Datos inválidos." : "Error al crear el pedido.",
    };
  }
};

export const putPedido = async (ctx: RouterContext<"/pedidos/:id">) => {
  try {
    const user = ctx.state.user;
    if (!user) {
      ctx.response.status = 401;
      ctx.response.body = {
        success: false,
        message: "No autenticado.",
      };
      return;
    }

    const id_pedido = Number(ctx.params.id);
    if (isNaN(id_pedido) || id_pedido <= 0) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "ID de pedido inválido.",
      };
      return;
    }

    // ✅ Validar que el usuario tenga acceso al pedido
    const objPedido = new PedidosModel();
    const pedidos = await objPedido.ListarPedidos();
    const pedido = pedidos.find((p: any) => p.id_pedido === id_pedido);

    if (!pedido) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        message: "Pedido no encontrado.",
      };
      return;
    }

    // Validar permisos: admin puede todo, productor solo sus pedidos, consumidor solo sus pedidos
    if (user.rol !== 'admin') {
      if (user.rol === 'productor' && pedido.id_productor !== user.id) {
        ctx.response.status = 403;
        ctx.response.body = {
          success: false,
          message: "No tienes permisos para actualizar este pedido.",
        };
        return;
      }
      if (user.rol === 'consumidor' && pedido.id_consumidor !== user.id) {
        ctx.response.status = 403;
        ctx.response.body = {
          success: false,
          message: "No tienes permisos para actualizar este pedido.",
        };
        return;
      }
    }

    const body = await ctx.request.body.json();
    const validated = pedidoSchemaUpdate.parse(body);

    const { direccionEntrega, fecha, fecha_entrega_estimada, ...restValidated } = validated;
    const pedidoData = {
      ...restValidated,
      direccion_entrega: direccionEntrega, // Mapear direccionEntrega a direccion_entrega
      fecha_pedido: fecha ? fecha.toISOString() : null, // Mapear fecha a fecha_pedido
      fecha_entrega: fecha_entrega_estimada ? fecha_entrega_estimada.toISOString() : null, // Mapear fecha_entrega_estimada a fecha_entrega
    };

    const result = await objPedido.EditarPedido(id_pedido);

    ctx.response.status = result.success ? 200 : 404;
    ctx.response.body = {
      success: result.success,
      message: result.message,
    };
  } catch (error) {
    ctx.response.status = 400;
    ctx.response.body = {
      success: false,
      message: error instanceof z.ZodError ? "Datos inválidos." : "Error al actualizar el pedido.",
    };
  }
};

export const deletePedido = async (ctx: RouterContext<"/pedidos/:id">) => {
  try {
    const user = ctx.state.user;
    if (!user) {
      ctx.response.status = 401;
      ctx.response.body = {
        success: false,
        message: "No autenticado.",
      };
      return;
    }

    const id_pedido = Number(ctx.params.id);
    if (isNaN(id_pedido) || id_pedido <= 0) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "ID de pedido inválido.",
      };
      return;
    }

    // ✅ Validar que el usuario tenga acceso al pedido
    const objPedido = new PedidosModel();
    const pedidos = await objPedido.ListarPedidos();
    const pedido = pedidos.find((p: any) => p.id_pedido === id_pedido);

    if (!pedido) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        message: "Pedido no encontrado.",
      };
      return;
    }

    // Validar permisos: admin puede eliminar todo, consumidor solo sus pedidos pendientes
    if (user.rol !== 'admin') {
      if (user.rol === 'consumidor' && pedido.id_consumidor !== user.id) {
        ctx.response.status = 403;
        ctx.response.body = {
          success: false,
          message: "No tienes permisos para eliminar este pedido.",
        };
        return;
      }
      // Solo permitir eliminar pedidos pendientes
      if (pedido.estado !== 'pendiente') {
        ctx.response.status = 403;
        ctx.response.body = {
          success: false,
          message: "Solo se pueden eliminar pedidos pendientes.",
        };
        return;
      }
    }

    const result = await objPedido.EliminarPedido(id_pedido);

    ctx.response.status = result.success ? 200 : 404;
    ctx.response.body = {
      success: result.success,
      message: result.message,
    };
  } catch (_error) {
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor.",
    };
  }
};

// 📌 Obtener mis pedidos (para productores y consumidores)
export const getMisPedidos = async (ctx: Context) => {
  try {
    const user = ctx.state.user;
    
    if (!user) {
      ctx.response.status = 401;
      ctx.response.body = {
        success: false,
        message: "No autenticado.",
      };
      return;
    }

    const objPedido = new PedidosModel();
    let pedidos: Record<string, unknown>[] = [];

    if (user.rol === 'productor') {
      // Obtener pedidos donde el usuario es el productor
      pedidos = await objPedido.ObtenerPedidosPorProductor(user.id) as unknown as Record<string, unknown>[];
    } else if (user.rol === 'consumidor') {
      // Obtener pedidos donde el usuario es el consumidor
      pedidos = await objPedido.ObtenerPedidosPorConsumidor(user.id) as unknown as Record<string, unknown>[];
    } else {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        message: "No tienes permisos para acceder a este recurso.",
      };
      return;
    }

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: "Pedidos encontrados.",
      data: pedidos,
    };
  } catch (error) {
    console.error("Error en getMisPedidos:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor.",
    };
  }
};

// 📌 Obtener pedidos realizados (para consumidores)
export const getPedidosRealizados = async (ctx: Context) => {
  try {
    const user = ctx.state.user;
    
    if (!user) {
      ctx.response.status = 401;
      ctx.response.body = {
        success: false,
        message: "No autenticado.",
      };
      return;
    }

    if (user.rol !== 'consumidor') {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        message: "Solo los consumidores pueden ver sus pedidos realizados.",
      };
      return;
    }

    const objPedido = new PedidosModel();
    const pedidos = await objPedido.ObtenerPedidosPorConsumidor(user.id);

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: "Pedidos encontrados.",
      data: pedidos,
    };
  } catch (error) {
    console.error("Error en getPedidosRealizados:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor.",
    };
  }
};

// 📌 Obtener pedidos recibidos (para productores)
export const getPedidosRecibidos = async (ctx: Context) => {
  try {
    const user = ctx.state.user;
    
    if (!user) {
      ctx.response.status = 401;
      ctx.response.body = {
        success: false,
        message: "No autenticado.",
      };
      return;
    }

    if (user.rol !== 'productor') {
      ctx.response.status = 403;
      ctx.response.body = {
        success: false,
        message: "Solo los productores pueden ver sus pedidos recibidos.",
      };
      return;
    }

    const objPedido = new PedidosModel();
    const pedidos = await objPedido.ObtenerPedidosPorProductor(user.id);

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: "Pedidos encontrados.",
      data: pedidos,
    };
  } catch (error) {
    console.error("Error en getPedidosRecibidos:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor.",
    };
  }
};