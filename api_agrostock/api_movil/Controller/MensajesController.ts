import { Context, RouterContext } from "../Dependencies/dependencias.ts";
import { MensajesModel, MensajeCreateData } from "../Models/MensajesModel.ts";

export class MensajesController {
  
  // 📌 Enviar mensaje
  static async EnviarMensaje(ctx: Context) {
    try {
      const body = await ctx.request.body.json();
      const { id_destinatario, id_producto, asunto, mensaje, tipo_mensaje } = body;
      const userId = ctx.state.user.id;

      console.log("📤 [MensajesController] Recibiendo mensaje:");
      console.log("  - id_remitente (userId):", userId, `(tipo: ${typeof userId})`);
      console.log("  - id_destinatario:", id_destinatario, `(tipo: ${typeof id_destinatario})`);
      console.log("  - id_producto:", id_producto, `(tipo: ${typeof id_producto})`);
      console.log("  - asunto:", asunto);
      console.log("  - mensaje_length:", mensaje?.length);
      console.log("  - tipo_mensaje:", tipo_mensaje);
      console.log("  - ctx.state.user completo:", JSON.stringify(ctx.state.user, null, 2));

      if (!id_destinatario || !asunto || !mensaje) {
        console.error("❌ [MensajesController] Faltan campos requeridos:", {
          id_destinatario: !!id_destinatario,
          asunto: !!asunto,
          mensaje: !!mensaje,
        });
        ctx.response.status = 400;
        ctx.response.body = { 
          success: false,
          error: "Faltan campos requeridos",
          message: "id_destinatario, asunto y mensaje son obligatorios"
        };
        return;
      }

      const mensajeData: MensajeCreateData = {
        id_remitente: userId,
        id_destinatario,
        id_producto: id_producto || undefined,
        asunto,
        mensaje,
        tipo_mensaje: tipo_mensaje || 'consulta'
      };

      console.log("📝 [MensajesController] Creando mensaje con datos:", mensajeData);

      const mensajeModel = new MensajesModel(mensajeData);
      const result = await mensajeModel.CrearMensaje();

      console.log("✅ [MensajesController] Resultado de crear mensaje:", JSON.stringify(result, null, 2));

      if (result.success && result.mensaje) {
        // Verificar que el mensaje realmente se guardó en la BD
        const { conexion } = await import("../Models/Conexion.ts");
        const mensajeVerificado = await conexion.query(
          "SELECT * FROM mensajes WHERE id_mensaje = ?",
          [result.mensaje.id_mensaje]
        );
        
        if (mensajeVerificado.length === 0) {
          console.error("❌ [MensajesController] CRÍTICO: El mensaje se creó pero no existe en la BD!");
          ctx.response.status = 500;
          ctx.response.body = {
            success: false,
            error: "Error al guardar mensaje",
            message: "El mensaje no se pudo guardar correctamente en la base de datos"
          };
          return;
        }
        
        console.log("✅ [MensajesController] Mensaje verificado en BD:", mensajeVerificado[0]);
        ctx.response.status = 201;
        ctx.response.body = result;
      } else {
        console.error("❌ [MensajesController] Error al crear mensaje:", result);
        ctx.response.status = 400;
        ctx.response.body = {
          ...result,
          success: false
        };
      }
    } catch (error) {
      console.error("❌ [MensajesController] Error en EnviarMensaje:", error);
      ctx.response.status = 500;
      ctx.response.body = { 
        success: false,
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : "Error desconocido"
      };
    }
  }

  // 📌 Obtener mensajes recibidos
  static async ObtenerMensajesRecibidos(ctx: Context) {
    try {
      const userId = ctx.state.user.id;
      const userIdNum = Number(userId);
      
      console.log("📥 [MensajesController] Obteniendo mensajes recibidos:");
      console.log("  - userId original:", userId, `(tipo: ${typeof userId})`);
      console.log("  - userId como número:", userIdNum, `(tipo: ${typeof userIdNum})`);
      console.log("  - ctx.state.user completo:", JSON.stringify(ctx.state.user, null, 2));
      
      // Verificar directamente en la BD primero
      const { conexion } = await import("../Models/Conexion.ts");
      
      // Verificar todos los mensajes en la BD
      const todosMensajesBD = await conexion.query(
        "SELECT id_mensaje, id_remitente, id_destinatario, asunto, fecha_envio FROM mensajes ORDER BY id_mensaje DESC LIMIT 20"
      );
      console.log(`🔍 [MensajesController] Total de mensajes en BD (últimos 20):`, todosMensajesBD.length);
      if (todosMensajesBD.length > 0) {
        console.log("🔍 [MensajesController] Últimos mensajes en BD:", JSON.stringify(todosMensajesBD, null, 2));
      }
      
      // Verificar mensajes específicos para este usuario con diferentes métodos
      const verificarMensajes1 = await conexion.query(
        "SELECT COUNT(*) as total FROM mensajes WHERE id_destinatario = ?",
        [userIdNum]
      );
      console.log(`🔍 [MensajesController] Mensajes con id_destinatario = ${userIdNum} (num):`, verificarMensajes1[0]?.total || 0);
      
      const verificarMensajes2 = await conexion.query(
        "SELECT COUNT(*) as total FROM mensajes WHERE id_destinatario = ?",
        [userId]
      );
      console.log(`🔍 [MensajesController] Mensajes con id_destinatario = ${userId} (original):`, verificarMensajes2[0]?.total || 0);
      
      // Obtener los mensajes directamente
      const mensajesDirectos = await conexion.query(
        "SELECT * FROM mensajes WHERE id_destinatario = ? ORDER BY fecha_envio DESC",
        [userIdNum]
      );
      console.log(`🔍 [MensajesController] Mensajes obtenidos directamente:`, mensajesDirectos.length);
      
      const mensajeModel = new MensajesModel();
      const mensajes = await mensajeModel.ObtenerMensajesRecibidos(userIdNum);

      console.log(`✅ [MensajesController] Se encontraron ${mensajes.length} mensajes para el usuario ${userIdNum}`);
      
      if (mensajes.length > 0) {
        console.log("📋 [MensajesController] Primeros mensajes:", mensajes.slice(0, 3).map(m => ({
          id_mensaje: m.id_mensaje,
          id_remitente: m.id_remitente,
          id_destinatario: m.id_destinatario,
          nombre_remitente: m.nombre_remitente,
          asunto: m.asunto,
        })));
      }

      // TEMPORAL: Si no hay mensajes pero hay mensajes en BD, mostrar todos para debug
      let mensajesFinales = mensajes;
      if (mensajes.length === 0 && todosMensajesBD.length > 0) {
        console.warn("⚠️ [MensajesController] No se encontraron mensajes para este usuario pero hay mensajes en BD");
        console.warn("⚠️ [MensajesController] Esto sugiere un problema con el id_destinatario");
        console.warn("⚠️ [MensajesController] Mostrando todos los mensajes para debug");
        
        // Obtener todos los mensajes con información completa
        const todosMensajesCompletos = await conexion.query(`
          SELECT m.*, 
                 u_remitente.nombre as nombre_remitente,
                 u_remitente.email as email_remitente,
                 p.nombre as nombre_producto
          FROM mensajes m
          LEFT JOIN usuarios u_remitente ON m.id_remitente = u_remitente.id_usuario
          LEFT JOIN productos p ON m.id_producto = p.id_producto
          ORDER BY m.fecha_envio DESC
          LIMIT 50
        `);
        
        // Si hay mensajes pero ninguno coincide, mostrar los últimos 5 para debug
        if (todosMensajesCompletos.length > 0) {
          console.warn("⚠️ [MensajesController] Últimos mensajes en BD (para comparar IDs):");
          todosMensajesCompletos.slice(0, 5).forEach((m: any) => {
            console.warn(`  - Mensaje ID ${m.id_mensaje}: id_destinatario=${m.id_destinatario} (tipo: ${typeof m.id_destinatario}), id_remitente=${m.id_remitente}, usuario_busca=${userIdNum}`);
          });
        }
      }

      ctx.response.status = 200;
      ctx.response.body = {
        success: true,
        mensajes: mensajesFinales,
        data: mensajesFinales, // Agregar también 'data' para compatibilidad
        total: mensajesFinales.length,
        debug: {
          userId,
          userIdNum,
          totalEnBD: todosMensajesBD.length,
          mensajesDirectos: mensajesDirectos.length,
          ultimosMensajesBD: todosMensajesBD.slice(0, 5), // Mostrar últimos 5 para debug
        }
      };
    } catch (error) {
      console.error("❌ [MensajesController] Error en ObtenerMensajesRecibidos:", error);
      ctx.response.status = 500;
      ctx.response.body = { 
        success: false,
        error: "Error interno del servidor",
        mensajes: [],
        data: [],
        total: 0
      };
    }
  }

  // 📌 Obtener mensajes enviados
  static async ObtenerMensajesEnviados(ctx: Context) {
    try {
      const userId = ctx.state.user.id;
      const mensajeModel = new MensajesModel();
      const mensajes = await mensajeModel.ObtenerMensajesEnviados(userId);

      ctx.response.status = 200;
      ctx.response.body = {
        success: true,
        mensajes,
        total: mensajes.length
      };
    } catch (error) {
      console.error("Error en ObtenerMensajesEnviados:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Error interno del servidor" };
    }
  }

  // 📌 Marcar mensaje como leído
  static async MarcarComoLeido(ctx: RouterContext<"/mensajes/:id_mensaje/leer">) {
    try {
      const { id_mensaje } = ctx.params;
      // const userId = ctx.state.user.id; // TODO: Implementar validación de propietario

      if (!id_mensaje) {
        ctx.response.status = 400;
        ctx.response.body = { error: "ID del mensaje requerido" };
        return;
      }

      const mensajeModel = new MensajesModel();
      const result = await mensajeModel.MarcarComoLeido(parseInt(id_mensaje));

      if (result.success) {
        ctx.response.status = 200;
        ctx.response.body = result;
      } else {
        ctx.response.status = 400;
        ctx.response.body = result;
      }
    } catch (error) {
      console.error("Error en MarcarComoLeido:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Error interno del servidor" };
    }
  }

  // 📌 Eliminar mensaje
  static async EliminarMensaje(ctx: RouterContext<"/mensajes/:id_mensaje">) {
    try {
      const { id_mensaje } = ctx.params;
      // const userId = ctx.state.user.id; // TODO: Implementar validación de propietario

      if (!id_mensaje) {
        ctx.response.status = 400;
        ctx.response.body = { error: "ID del mensaje requerido" };
        return;
      }

      const mensajeModel = new MensajesModel();
      const result = await mensajeModel.EliminarMensaje(parseInt(id_mensaje));

      if (result.success) {
        ctx.response.status = 200;
        ctx.response.body = result;
      } else {
        ctx.response.status = 400;
        ctx.response.body = result;
      }
    } catch (error) {
      console.error("Error en EliminarMensaje:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Error interno del servidor" };
    }
  }

  // 📌 Obtener mensajes no leídos
  static async ObtenerMensajesNoLeidos(ctx: Context) {
    try {
      const userId = ctx.state.user.id;
      const mensajeModel = new MensajesModel();
      const totalNoLeidos = await mensajeModel.ObtenerMensajesNoLeidos(userId);

      ctx.response.status = 200;
      ctx.response.body = {
        success: true,
        total_no_leidos: totalNoLeidos
      };
    } catch (error) {
      console.error("Error en ObtenerMensajesNoLeidos:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Error interno del servidor" };
    }
  }

  // 📌 Obtener conversación
  static async ObtenerConversacion(ctx: RouterContext<"/mensajes/conversacion/:id_usuario">) {
    try {
      const { id_usuario } = ctx.params;
      const userId = ctx.state.user.id;

      if (!id_usuario) {
        ctx.response.status = 400;
        ctx.response.body = { error: "ID del usuario requerido" };
        return;
      }

      const mensajeModel = new MensajesModel();
      const conversacion = await mensajeModel.ObtenerConversacion(userId, parseInt(id_usuario));

      ctx.response.status = 200;
      ctx.response.body = {
        success: true,
        conversacion,
        total: conversacion.length
      };
    } catch (error) {
      console.error("Error en ObtenerConversacion:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Error interno del servidor" };
    }
  }

  // 📌 Endpoint de prueba para verificar mensajes
  static async ProbarMensajes(ctx: Context) {
    try {
      const { conexion } = await import("../Models/Conexion.ts");
      const userId = ctx.state.user?.id;
      
      console.log("🔍 [ProbarMensajes] Usuario ID:", userId, `(tipo: ${typeof userId})`);
      
      // Obtener todos los mensajes
      const todosMensajes = await conexion.query(
        "SELECT id_mensaje, id_remitente, id_destinatario, asunto, fecha_envio, TYPEOF(id_destinatario) as tipo_dest FROM mensajes ORDER BY id_mensaje DESC LIMIT 50"
      );
      
      console.log("🔍 [ProbarMensajes] Total mensajes en BD:", todosMensajes.length);
      
      // Obtener mensajes para este usuario con diferentes métodos
      const mensajesUsuario1 = await conexion.query(
        "SELECT id_mensaje, id_remitente, id_destinatario, asunto FROM mensajes WHERE id_destinatario = ? ORDER BY id_mensaje DESC",
        [userId]
      );
      
      const mensajesUsuario2 = await conexion.query(
        "SELECT id_mensaje, id_remitente, id_destinatario, asunto FROM mensajes WHERE CAST(id_destinatario AS UNSIGNED) = ? ORDER BY id_mensaje DESC",
        [userId]
      );
      
      const mensajesUsuario3 = await conexion.query(
        "SELECT id_mensaje, id_remitente, id_destinatario, asunto FROM mensajes WHERE id_destinatario = CAST(? AS UNSIGNED) ORDER BY id_mensaje DESC",
        [userId.toString()]
      );
      
      // Obtener información del usuario actual
      const usuarioInfo = await conexion.query(
        "SELECT id_usuario, nombre, email, rol FROM usuarios WHERE id_usuario = ?",
        [userId]
      );
      
      ctx.response.status = 200;
      ctx.response.body = {
        success: true,
        debug: {
          userId,
          userIdType: typeof userId,
          usuarioInfo: usuarioInfo[0] || null,
          totalMensajesEnBD: todosMensajes.length,
          mensajesParaEsteUsuario_query1: mensajesUsuario1.length,
          mensajesParaEsteUsuario_query2: mensajesUsuario2.length,
          mensajesParaEsteUsuario_query3: mensajesUsuario3.length,
          todosMensajes: todosMensajes,
          mensajesUsuario_query1: mensajesUsuario1,
          mensajesUsuario_query2: mensajesUsuario2,
          mensajesUsuario_query3: mensajesUsuario3,
        }
      };
    } catch (error) {
      console.error("❌ Error en ProbarMensajes:", error);
      ctx.response.status = 500;
      ctx.response.body = { 
        success: false, 
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : "Error desconocido"
      };
    }
  }

  // 📌 Contactar productor desde producto (sin login)
  static async ContactarProductor(ctx: Context) {
    try {
      const body = await ctx.request.body.json();
      const { id_producto, nombre_contacto, email_contacto, telefono_contacto, mensaje } = body;

      if (!id_producto || !nombre_contacto || !email_contacto || !mensaje) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Faltan campos requeridos" };
        return;
      }

      // Obtener información del producto y productor
      const { conexion } = await import("../Models/Conexion.ts");
      const producto = await conexion.query(`
        SELECT p.*, u.nombre as nombre_productor, u.email as email_productor, u.telefono as telefono_productor
        FROM productos p
        INNER JOIN usuarios u ON p.id_usuario = u.id_usuario
        WHERE p.id_producto = ?
      `, [id_producto]);

      if (producto.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = { error: "Producto no encontrado" };
        return;
      }

      const productor = producto[0];

      // Crear mensaje de contacto
      const mensajeData: MensajeCreateData = {
        id_remitente: 0, // Usuario anónimo
        id_destinatario: productor.id_usuario,
        id_producto: parseInt(id_producto),
        asunto: `Consulta sobre ${producto[0].nombre} - ${nombre_contacto}`,
        mensaje: `
          Nombre: ${nombre_contacto}
          Email: ${email_contacto}
          Teléfono: ${telefono_contacto || 'No proporcionado'}
          
          Mensaje:
          ${mensaje}
        `,
        tipo_mensaje: 'consulta'
      };

      const mensajeModel = new MensajesModel(mensajeData);
      const result = await mensajeModel.CrearMensaje();

      if (result.success) {
        ctx.response.status = 201;
        ctx.response.body = {
          success: true,
          message: "Mensaje enviado exitosamente al productor",
          datos_contacto: {
            nombre_productor: productor.nombre_productor,
            email_productor: productor.email_productor,
            telefono_productor: productor.telefono_productor
          }
        };
      } else {
        ctx.response.status = 400;
        ctx.response.body = result;
      }
    } catch (error) {
      console.error("Error en ContactarProductor:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Error interno del servidor" };
    }
  }
}
