import { conexion } from "./Conexion.ts";

export interface MensajeData {
  id_mensaje: number;
  id_remitente: number;
  id_destinatario: number;
  id_producto?: number;
  asunto: string;
  mensaje: string;
  fecha_envio: Date;
  leido: boolean;
  tipo_mensaje: 'consulta' | 'pedido' | 'general';
}

export interface MensajeCreateData {
  id_remitente: number;
  id_destinatario: number;
  id_producto?: number;
  asunto: string;
  mensaje: string;
  tipo_mensaje?: 'consulta' | 'pedido' | 'general';
}

export class MensajesModel {
  public _objMensaje: MensajeCreateData | null;

  constructor(objMensaje: MensajeCreateData | null = null) {
    this._objMensaje = objMensaje;
  }

  // 📌 Crear nuevo mensaje
  public async CrearMensaje(): Promise<{ success: boolean; message: string; mensaje?: MensajeData }> {
    try {
      if (!this._objMensaje) {
        throw new Error("No se ha proporcionado un objeto de mensaje válido.");
      }

      const { id_remitente, id_destinatario, id_producto, asunto, mensaje, tipo_mensaje } = this._objMensaje;

      console.log("📝 [MensajesModel] Creando mensaje con datos:", {
        id_remitente,
        id_destinatario,
        id_producto,
        asunto,
        mensaje_length: mensaje?.length,
        tipo_mensaje,
      });

      if (!id_remitente || !id_destinatario || !asunto || !mensaje) {
        const errorMsg = `Faltan campos requeridos: id_remitente=${!!id_remitente}, id_destinatario=${!!id_destinatario}, asunto=${!!asunto}, mensaje=${!!mensaje}`;
        console.error("❌ [MensajesModel]", errorMsg);
        throw new Error(errorMsg);
      }

      // Validar que id_remitente no sea 0 (solo permitido para usuarios anónimos)
      if (id_remitente === 0) {
        console.warn("⚠️ [MensajesModel] id_remitente es 0 (usuario anónimo)");
      }

      await conexion.execute("START TRANSACTION");

      // Asegurar que los IDs sean números
      const idRemitenteNum = Number(id_remitente);
      const idDestinatarioNum = Number(id_destinatario);
      
      console.log("💾 [MensajesModel] Valores para INSERT:", {
        id_remitente: idRemitenteNum,
        id_destinatario: idDestinatarioNum,
        id_producto: id_producto ? Number(id_producto) : null,
        asunto,
        mensaje_length: mensaje.length,
        tipo_mensaje,
      });
      
      const result = await conexion.execute(
        "INSERT INTO mensajes (id_remitente, id_destinatario, id_producto, asunto, mensaje, tipo_mensaje) VALUES (?, ?, ?, ?, ?, ?)",
        [idRemitenteNum, idDestinatarioNum, id_producto ? Number(id_producto) : null, asunto, mensaje, tipo_mensaje || 'consulta']
      );

      console.log("💾 [MensajesModel] Resultado del INSERT:", {
        affectedRows: result?.affectedRows,
        insertId: result?.insertId,
      });

      if (result && result.affectedRows && result.affectedRows > 0) {
        const insertId = result.insertId;
        console.log("✅ [MensajesModel] INSERT exitoso, insertId:", insertId);
        
        // Obtener el mensaje recién creado usando el insertId
        const [nuevoMensaje] = await conexion.query(
          "SELECT * FROM mensajes WHERE id_mensaje = ?",
          [insertId]
        );
        
        if (!nuevoMensaje) {
          throw new Error("No se pudo recuperar el mensaje recién creado");
        }
        
        console.log("✅ [MensajesModel] Mensaje creado exitosamente:", {
          id_mensaje: nuevoMensaje.id_mensaje,
          id_remitente: nuevoMensaje.id_remitente,
          id_destinatario: nuevoMensaje.id_destinatario,
          asunto: nuevoMensaje.asunto,
        });
        
        // Verificar que el mensaje realmente se guardó
        const verificarMensaje = await conexion.query(
          "SELECT COUNT(*) as total FROM mensajes WHERE id_mensaje = ?",
          [insertId]
        );
        console.log("🔍 [MensajesModel] Verificación: mensaje existe en BD:", verificarMensaje[0]?.total > 0);
        
        // Actualizar estadísticas del destinatario (no crítico)
        try {
          await this.actualizarEstadisticasDestinatario(idDestinatarioNum);
          console.log("✅ [MensajesModel] Estadísticas actualizadas");
        } catch (statsError) {
          console.warn("⚠️ [MensajesModel] Error al actualizar estadísticas (no crítico):", statsError);
          // No fallar el mensaje si las estadísticas fallan
        }

        // Hacer COMMIT de la transacción
        try {
          await conexion.execute("COMMIT");
          console.log("✅ [MensajesModel] Transacción confirmada (COMMIT)");
          
          // Verificar una vez más que el mensaje existe después del COMMIT
          const mensajeDespuesCommit = await conexion.query(
            "SELECT * FROM mensajes WHERE id_mensaje = ?",
            [insertId]
          );
          
          if (mensajeDespuesCommit.length === 0) {
            console.error("❌ [MensajesModel] CRÍTICO: Mensaje no existe después del COMMIT!");
            throw new Error("El mensaje no se guardó correctamente después del COMMIT");
          }
          
          console.log("✅ [MensajesModel] Mensaje verificado después del COMMIT:", mensajeDespuesCommit[0]);
        } catch (commitError) {
          console.error("❌ [MensajesModel] Error en COMMIT:", commitError);
          await conexion.execute("ROLLBACK");
          throw commitError;
        }

        return {
          success: true,
          message: "Mensaje enviado exitosamente.",
          mensaje: nuevoMensaje as MensajeData,
        };
      } else {
        console.error("❌ [MensajesModel] INSERT falló - no se insertaron filas");
        console.error("❌ [MensajesModel] Resultado del INSERT:", result);
        throw new Error("No se pudo crear el mensaje. No se insertaron filas.");
      }
    } catch (error) {
      await conexion.execute("ROLLBACK");
      console.error("❌ [MensajesModel] Error al crear mensaje:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Error interno del servidor",
      };
    }
  }

  // 📌 Obtener mensajes recibidos por usuario
  public async ObtenerMensajesRecibidos(id_usuario: number): Promise<MensajeData[]> {
    try {
      // Asegurar que id_usuario sea un número
      const userId = Number(id_usuario);
      console.log(`🔍 [MensajesModel] Buscando mensajes recibidos para usuario: ${userId} (tipo: ${typeof userId})`);
      
      // Primero verificar todos los mensajes en la BD
      const todosMensajes = await conexion.query(
        "SELECT id_mensaje, id_remitente, id_destinatario, TYPEOF(id_destinatario) as tipo_dest, asunto, fecha_envio FROM mensajes ORDER BY id_mensaje DESC LIMIT 20"
      );
      console.log(`🔍 [MensajesModel] Total de mensajes en BD: ${todosMensajes.length}`);
      console.log("🔍 [MensajesModel] Últimos mensajes en BD:", JSON.stringify(todosMensajes, null, 2));
      
      // Query principal - usar comparación directa con número
      const result = await conexion.query(`
        SELECT m.*, 
               u_remitente.nombre as nombre_remitente,
               u_remitente.email as email_remitente,
               p.nombre as nombre_producto
        FROM mensajes m
        LEFT JOIN usuarios u_remitente ON m.id_remitente = u_remitente.id_usuario
        LEFT JOIN productos p ON m.id_producto = p.id_producto
        WHERE m.id_destinatario = ?
        ORDER BY m.fecha_envio DESC
      `, [userId]);
      
      console.log(`✅ [MensajesModel] Query principal: ${result.length} mensajes encontrados para usuario ${userId}`);
      
      // Verificar directamente con COUNT para debug
      const countDirecto = await conexion.query(
        "SELECT COUNT(*) as total FROM mensajes WHERE id_destinatario = ?",
        [userId]
      );
      const totalCount = countDirecto[0]?.total || 0;
      console.log(`🔍 [MensajesModel] COUNT directo para id_destinatario=${userId}: ${totalCount}`);
      
      // Si hay diferencia, investigar
      if (totalCount > 0 && result.length === 0) {
        console.error(`❌ [MensajesModel] PROBLEMA: Hay ${totalCount} mensajes en BD pero la query no los encuentra!`);
        // Intentar obtener sin JOINs para ver si el problema es en los JOINs
        const mensajesSinJoin = await conexion.query(
          "SELECT * FROM mensajes WHERE id_destinatario = ? ORDER BY fecha_envio DESC",
          [userId]
        );
        console.log(`🔍 [MensajesModel] Mensajes sin JOINs: ${mensajesSinJoin.length}`);
        if (mensajesSinJoin.length > 0) {
          // Si encuentra sin JOINs, usar esos y hacer JOINs manualmente
          return mensajesSinJoin.map((m: any) => ({
            ...m,
            nombre_remitente: null,
            email_remitente: null,
            nombre_producto: null,
          })) as MensajeData[];
        }
      }
      
      if (result.length > 0) {
        console.log("📋 [MensajesModel] Primeros mensajes encontrados:", result.slice(0, 3).map((m: any) => ({
          id_mensaje: m.id_mensaje,
          id_remitente: m.id_remitente,
          id_destinatario: m.id_destinatario,
          nombre_remitente: m.nombre_remitente,
          asunto: m.asunto,
          leido: m.leido,
        })));
      }
      
      return result as MensajeData[];
    } catch (error) {
      console.error("❌ [MensajesModel] Error al obtener mensajes recibidos:", error);
      return [];
    }
  }

  // 📌 Obtener mensajes enviados por usuario
  public async ObtenerMensajesEnviados(id_usuario: number): Promise<MensajeData[]> {
    try {
      const result = await conexion.query(`
        SELECT m.*, 
               u_destinatario.nombre as nombre_destinatario,
               u_destinatario.email as email_destinatario,
               p.nombre as nombre_producto
        FROM mensajes m
        LEFT JOIN usuarios u_destinatario ON m.id_destinatario = u_destinatario.id_usuario
        LEFT JOIN productos p ON m.id_producto = p.id_producto
        WHERE m.id_remitente = ?
        ORDER BY m.fecha_envio DESC
      `, [id_usuario]);
      
      return result as MensajeData[];
    } catch (error) {
      console.error("Error al obtener mensajes enviados:", error);
      return [];
    }
  }

  // 📌 Marcar mensaje como leído
  public async MarcarComoLeido(id_mensaje: number): Promise<{ success: boolean; message: string }> {
    try {
      const result = await conexion.execute(
        "UPDATE mensajes SET leido = 1 WHERE id_mensaje = ?",
        [id_mensaje]
      );

      if (result && result.affectedRows && result.affectedRows > 0) {
        return {
          success: true,
          message: "Mensaje marcado como leído.",
        };
      } else {
        return {
          success: false,
          message: "No se pudo marcar el mensaje como leído.",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Error interno del servidor",
      };
    }
  }

  // 📌 Eliminar mensaje
  public async EliminarMensaje(id_mensaje: number): Promise<{ success: boolean; message: string }> {
    try {
      const result = await conexion.execute(
        "DELETE FROM mensajes WHERE id_mensaje = ?",
        [id_mensaje]
      );

      if (result && result.affectedRows && result.affectedRows > 0) {
        return {
          success: true,
          message: "Mensaje eliminado correctamente.",
        };
      } else {
        return {
          success: false,
          message: "No se encontró el mensaje a eliminar.",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Error interno del servidor",
      };
    }
  }

  // 📌 Obtener mensajes no leídos
  public async ObtenerMensajesNoLeidos(id_usuario: number): Promise<number> {
    try {
      const result = await conexion.query(
        "SELECT COUNT(*) as total FROM mensajes WHERE id_destinatario = ? AND leido = 0",
        [id_usuario]
      );
      
      return result[0]?.total || 0;
    } catch (error) {
      console.error("Error al obtener mensajes no leídos:", error);
      return 0;
    }
  }

  // 📌 Obtener conversación entre dos usuarios
  public async ObtenerConversacion(id_usuario1: number, id_usuario2: number): Promise<MensajeData[]> {
    try {
      const result = await conexion.query(`
        SELECT m.*, 
               u_remitente.nombre as nombre_remitente,
               u_destinatario.nombre as nombre_destinatario,
               p.nombre as nombre_producto
        FROM mensajes m
        LEFT JOIN usuarios u_remitente ON m.id_remitente = u_remitente.id_usuario
        LEFT JOIN usuarios u_destinatario ON m.id_destinatario = u_destinatario.id_usuario
        LEFT JOIN productos p ON m.id_producto = p.id_producto
        WHERE (m.id_remitente = ? AND m.id_destinatario = ?) 
           OR (m.id_remitente = ? AND m.id_destinatario = ?)
        ORDER BY m.fecha_envio ASC
      `, [id_usuario1, id_usuario2, id_usuario2, id_usuario1]);
      
      return result as MensajeData[];
    } catch (error) {
      console.error("Error al obtener conversación:", error);
      return [];
    }
  }

  // 📌 Actualizar estadísticas del destinatario
  private async actualizarEstadisticasDestinatario(id_usuario: number): Promise<void> {
    try {
      // Verificar si existe registro de estadísticas
      const existe = await conexion.query(
        "SELECT id_usuario FROM estadisticas_usuarios WHERE id_usuario = ?",
        [id_usuario]
      );

      if (existe.length === 0) {
        // Crear registro inicial
        await conexion.execute(
          "INSERT INTO estadisticas_usuarios (id_usuario, total_mensajes_recibidos) VALUES (?, 1)",
          [id_usuario]
        );
      } else {
        // Actualizar contador
        await conexion.execute(
          "UPDATE estadisticas_usuarios SET total_mensajes_recibidos = total_mensajes_recibidos + 1 WHERE id_usuario = ?",
          [id_usuario]
        );
      }
    } catch (error) {
      console.error("Error al actualizar estadísticas:", error);
    }
  }
}
