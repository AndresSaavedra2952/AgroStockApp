// 🔐 SERVICIO DE RECUPERACIÓN DE CONTRASEÑA

import { conexion } from "../Models/Conexion.ts";
import { securityService } from "./SecurityService.ts";
import { emailService } from "./EmailService.ts";
import { Usuario, type UsuarioLoginData } from "../Models/UsuariosModel.ts";

export class PasswordRecoveryService {
  
  /**
   * Generar token de recuperación de contraseña
   */
  static async generateRecoveryToken(email: string, metodo: 'email' | 'sms' = 'email'): Promise<{
    success: boolean;
    message: string;
    token?: string;
    codigo_sms?: string;
    expiracion?: Date;
  }> {
    try {
      const userInstance = new Usuario();
      const usuario = await userInstance.buscarPorEmail(email);

      if (!usuario) {
        // Por seguridad, no revelamos si el email existe o no
        return {
          success: true,
          message: "Si el email existe, se enviará un enlace de recuperación."
        };
      }

      // Generar token único
      const token = await securityService.generateEmailVerificationHash(email + Date.now().toString());
      const fechaExpiracion = new Date();
      fechaExpiracion.setHours(fechaExpiracion.getHours() + 1); // Expira en 1 hora

      // Guardar token en la base de datos
      await conexion.execute(
        `INSERT INTO tokens_recuperacion 
         (id_usuario, token, tipo, metodo, fecha_expiracion, ip_address) 
         VALUES (?, ?, 'password_reset', ?, ?, ?)`,
        [usuario.id_usuario, token, metodo, fechaExpiracion, null]
      );

      if (metodo === 'email') {
        // Enviar email con enlace de recuperación
        await emailService.sendPasswordRecoveryEmail(
          usuario.email,
          usuario.nombre,
          token
        );

        return {
          success: true,
          message: "Se ha enviado un enlace de recuperación a tu correo electrónico.",
          token: token,
          expiracion: fechaExpiracion
        };
      } else {
        // Generar código SMS de 6 dígitos
        const codigoSMS = Math.floor(100000 + Math.random() * 900000).toString();
        const fechaExpiracionSMS = new Date();
        fechaExpiracionSMS.setMinutes(fechaExpiracionSMS.getMinutes() + 15); // Expira en 15 minutos

        // Guardar código SMS en el usuario
        await conexion.execute(
          `UPDATE usuarios 
           SET codigo_verificacion_sms = ?, 
               codigo_sms_expiracion = ?,
               intentos_sms = 0
           WHERE id_usuario = ?`,
          [codigoSMS, fechaExpiracionSMS, usuario.id_usuario]
        );

        // Enviar SMS (aquí integrarías tu servicio de SMS)
        // await smsService.sendPasswordRecoverySMS(usuario.telefono, codigoSMS);

        return {
          success: true,
          message: "Se ha enviado un código de verificación a tu teléfono.",
          codigo_sms: codigoSMS, // Solo en desarrollo, en producción no se devuelve
          expiracion: fechaExpiracionSMS
        };
      }
    } catch (error) {
      console.error("Error generando token de recuperación:", error);
      return {
        success: false,
        message: "Error al generar token de recuperación."
      };
    }
  }

  /**
   * Validar token de recuperación
   */
  static async validateRecoveryToken(token: string): Promise<{
    success: boolean;
    valid: boolean;
    message: string;
    id_usuario?: number;
  }> {
    try {
      const result = await conexion.query(
        `SELECT tr.*, u.email, u.nombre
         FROM tokens_recuperacion tr
         INNER JOIN usuarios u ON tr.id_usuario = u.id_usuario
         WHERE tr.token = ? 
           AND tr.tipo = 'password_reset'
           AND tr.usado = 0
           AND tr.fecha_expiracion > NOW()`,
        [token]
      );

      if (result.length === 0) {
        return {
          success: true,
          valid: false,
          message: "Token inválido o expirado."
        };
      }

      const tokenData = result[0];
      return {
        success: true,
        valid: true,
        message: "Token válido.",
        id_usuario: tokenData.id_usuario
      };
    } catch (error) {
      console.error("Error validando token:", error);
      return {
        success: false,
        valid: false,
        message: "Error al validar token."
      };
    }
  }

  /**
   * Validar código SMS
   */
  static async validateSMSCode(email: string, codigo: string): Promise<{
    success: boolean;
    valid: boolean;
    message: string;
    id_usuario?: number;
  }> {
    try {
      const userInstance = new Usuario();
      const usuario = await userInstance.buscarPorEmail(email);

      if (!usuario) {
        return {
          success: true,
          valid: false,
          message: "Código inválido."
        };
      }

      // Verificar intentos
      const usuarioConSMS = usuario as UsuarioLoginData & {
        intentos_sms?: number | null;
        codigo_sms_expiracion?: string | Date | null;
        codigo_verificacion_sms?: string | null;
      };
      const intentosSMS = usuarioConSMS.intentos_sms ?? 0;
      if (intentosSMS >= 5) {
        return {
          success: true,
          valid: false,
          message: "Demasiados intentos fallidos. Intenta más tarde."
        };
      }

      // Verificar código y expiración
      const ahora = new Date();
      const codigoSMSExpiracion = usuarioConSMS.codigo_sms_expiracion;
      const fechaExpiracion = codigoSMSExpiracion ? new Date(codigoSMSExpiracion as string | Date) : null;
      const codigoVerificacionSMS = usuarioConSMS.codigo_verificacion_sms;

      if (!codigoVerificacionSMS || 
          codigoVerificacionSMS !== codigo ||
          !fechaExpiracion || 
          fechaExpiracion < ahora) {
        
        // Incrementar intentos
        await conexion.execute(
          `UPDATE usuarios SET intentos_sms = intentos_sms + 1 WHERE id_usuario = ?`,
          [usuario.id_usuario]
        );

        return {
          success: true,
          valid: false,
          message: "Código inválido o expirado."
        };
      }

      // Código válido - limpiar código
      await conexion.execute(
        `UPDATE usuarios 
         SET codigo_verificacion_sms = NULL, 
             codigo_sms_expiracion = NULL,
             intentos_sms = 0
         WHERE id_usuario = ?`,
        [usuario.id_usuario]
      );

      return {
        success: true,
        valid: true,
        message: "Código válido.",
        id_usuario: usuario.id_usuario ?? undefined
      };
    } catch (error) {
      console.error("Error validando código SMS:", error);
      return {
        success: false,
        valid: false,
        message: "Error al validar código."
      };
    }
  }

  /**
   * Restablecer contraseña con token
   */
  static async resetPasswordWithToken(
    token: string, 
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validar token
      const validation = await this.validateRecoveryToken(token);
      if (!validation.valid || !validation.id_usuario) {
        return {
          success: false,
          message: "Token inválido o expirado."
        };
      }

      // Validar fortaleza de contraseña
      const passwordValidation = securityService.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: "La contraseña no cumple con los requisitos de seguridad.",
        };
      }

      // Hash de nueva contraseña
      const hashedPassword = await securityService.hashPassword(newPassword);

      // Actualizar contraseña
      await conexion.execute(
        `UPDATE usuarios SET password = ? WHERE id_usuario = ?`,
        [hashedPassword, validation.id_usuario]
      );

      // Marcar token como usado
      await conexion.execute(
        `UPDATE tokens_recuperacion SET usado = 1, fecha_uso = NOW() WHERE token = ?`,
        [token]
      );

      // Registrar en auditoría
      await this.registrarAuditoria(
        validation.id_usuario!,
        'password_reset',
        'usuarios',
        validation.id_usuario!,
        { accion: 'restablecer_contraseña', metodo: 'token' }
      );

      return {
        success: true,
        message: "Contraseña restablecida exitosamente."
      };
    } catch (error) {
      console.error("Error restableciendo contraseña:", error);
      return {
        success: false,
        message: "Error al restablecer contraseña."
      };
    }
  }

  /**
   * Restablecer contraseña con código SMS
   */
  static async resetPasswordWithSMS(
    email: string,
    codigo: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validar código SMS
      const validation = await this.validateSMSCode(email, codigo);
      if (!validation.valid || !validation.id_usuario) {
        return {
          success: false,
          message: "Código inválido o expirado."
        };
      }

      // Validar fortaleza de contraseña
      const passwordValidation = securityService.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: "La contraseña no cumple con los requisitos de seguridad.",
        };
      }

      // Hash de nueva contraseña
      const hashedPassword = await securityService.hashPassword(newPassword);

      // Actualizar contraseña
      await conexion.execute(
        `UPDATE usuarios SET password = ? WHERE id_usuario = ?`,
        [hashedPassword, validation.id_usuario]
      );

      // Registrar en auditoría
      await this.registrarAuditoria(
        validation.id_usuario!,
        'password_reset',
        'usuarios',
        validation.id_usuario!,
        { accion: 'restablecer_contraseña', metodo: 'sms' }
      );

      return {
        success: true,
        message: "Contraseña restablecida exitosamente."
      };
    } catch (error) {
      console.error("Error restableciendo contraseña:", error);
      return {
        success: false,
        message: "Error al restablecer contraseña."
      };
    }
  }

  /**
   * Registrar acción en auditoría
   */
  private static async registrarAuditoria(
    id_usuario: number,
    accion: string,
    tabla: string,
    id_registro: number,
    datos_extra?: Record<string, unknown>
  ): Promise<void> {
    try {
      await conexion.execute(
        `INSERT INTO auditoria_acciones 
         (id_usuario, accion, tabla_afectada, id_registro_afectado, datos_antes, datos_despues, descripcion)
         VALUES (?, ?, ?, ?, NULL, ?, ?)`,
        [
          id_usuario,
          accion,
          tabla,
          id_registro,
          JSON.stringify(datos_extra || {}),
          `Recuperación de contraseña realizada`
        ]
      );
    } catch (error) {
      console.error("Error registrando auditoría:", error);
    }
  }
}







