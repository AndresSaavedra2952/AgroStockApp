import {
  Context,
  create,
  getNumericDate,
  load,
} from "../Dependencies/dependencias.ts";
import type { Header, Payload } from "../Dependencies/dependencias.ts";
import { Usuario } from "../Models/UsuariosModel.ts";
import { securityService } from "../Services/SecurityService.ts";
import { emailService } from "../Services/EmailService.ts";
import { obtenerConexion } from "../Models/Conexion.ts";
import { ProductoresModel } from "../Models/ProductoresModel.ts";


// Configuración JWT mejorada
let secret: string;
let key: CryptoKey;

async function initializeJWT() {
  // Cargar variables de entorno (si existe el archivo .env)
  // Si no existe, usar valores por defecto
  let env: Record<string, string> = {};
  try {
    env = await load();
  } catch (error) {
    // Si no existe el archivo .env, usar valores por defecto
    console.log("ℹ️ No se encontró archivo .env para JWT, usando valor por defecto");
  }
  
  secret = env.JWT_SECRET || "mi_clave_secreta_super_segura_2024";
  
  key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

// Inicializar JWT (con manejo de errores para no bloquear el servidor)
initializeJWT().catch((error) => {
  console.error("❌ Error crítico al inicializar JWT:", error);
  console.error("⚠️ El servidor continuará, pero la autenticación fallará hasta que se resuelva el problema");
});

export class AuthController {
  /**
   * Login mejorado con validaciones de seguridad
   */
  static async login(ctx: Context) {
    try {
      const body = await ctx.request.body.json();
      const { email, password } = body;

      // Validaciones básicas
      if (!email || !password) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: "Datos requeridos",
          message: "Email y contraseña son requeridos"
        };
        return;
      }

      // Validar formato de email
      if (!securityService.validateEmail(email)) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: "Email inválido",
          message: "El formato del email no es válido"
        };
        return;
      }

      // Normalizar email: trim y lowercase
      const normalizedEmail = email.trim().toLowerCase();
      console.log(`[AuthController] ========== INICIO LOGIN ==========`);
      console.log(`[AuthController] Email original: "${email}", normalizado: "${normalizedEmail}"`);
      console.log(`[AuthController] Password recibido (raw): "${password}" (longitud: ${password.length})`);

      const userInstance = new Usuario();
      const usuario = await userInstance.buscarPorEmail(normalizedEmail);

      if (!usuario) {
        console.log(`[AuthController] ❌ Usuario NO encontrado con email: "${normalizedEmail}"`);
        ctx.response.status = 401;
        ctx.response.body = {
          success: false,
          error: "Credenciales inválidas",
          message: "Email o contraseña incorrectos"
        };
        return;
      }
      
      console.log(`[AuthController] ✅ Usuario encontrado: ID=${usuario.id_usuario}, Nombre=${usuario.nombre}, Email=${usuario.email}`);

      // Verificación de bloqueo removida - la base de datos simplificada no tiene esta columna

      // Verificar si el usuario está activo
      if (usuario.activo === false) {
        ctx.response.status = 403;
        ctx.response.body = {
          success: false,
          error: "Cuenta inactiva",
          message: "Tu cuenta ha sido desactivada. Contacta al administrador."
        };
        return;
      }

      // Verificar contraseña - IMPORTANTE: usar trim para consistencia con el registro
      const trimmedPassword = password.trim();
      console.log(`[AuthController] ========== VERIFICACIÓN DE CONTRASEÑA ==========`);
      console.log(`[AuthController] Password recibido (raw): "${password}" (longitud: ${password.length})`);
      console.log(`[AuthController] Password recibido (trimmed): "${trimmedPassword}" (longitud: ${trimmedPassword.length})`);
      
      // Asegurar que el password de la BD sea un string
      // NO hacer trim del hash almacenado, puede corromper el hash
      const storedPassword = usuario.password ? String(usuario.password) : '';
      console.log(`[AuthController] Password almacenado (raw): "${storedPassword.substring(0, 50)}..." (longitud: ${storedPassword.length})`);
      console.log(`[AuthController] Tipo de password almacenado: ${typeof usuario.password}`);
      
      let passwordValid = false;
      
      // Verificar si la contraseña almacenada parece ser un hash (base64url, longitud > 40)
      const pareceHash = storedPassword.length > 40;
      console.log(`[AuthController] ¿Parece hash? ${pareceHash} (longitud: ${storedPassword.length})`);
      
      if (pareceHash) {
        // Intentar verificar con el método normal (hash PBKDF2)
        console.log(`[AuthController] Intentando verificar con hash PBKDF2 (con trimmed password)...`);
        try {
          // Siempre usar trimmed password (consistente con el registro)
          passwordValid = await securityService.verifyPassword(trimmedPassword, storedPassword);
          console.log(`[AuthController] Verificación con hash (trimmed): ${passwordValid ? '✅ ÉXITO' : '❌ FALLÓ'}`);
          
          // Si la verificación falla, intentar sin trim SOLO si el password original tenía espacios
          // Esto es para compatibilidad con usuarios antiguos
          if (!passwordValid && password !== trimmedPassword) {
            console.log(`[AuthController] ⚠️ Verificación con trimmed falló, intentando sin trim (compatibilidad)...`);
            const passwordValidSinTrim = await securityService.verifyPassword(password, storedPassword);
            console.log(`[AuthController] Verificación sin trim: ${passwordValidSinTrim ? '✅ ÉXITO' : '❌ FALLÓ'}`);
            if (passwordValidSinTrim) {
              passwordValid = true;
              console.log(`[AuthController] ⚠️ Contraseña verificada sin trim (usuario antiguo). Actualizando hash...`);
              // Actualizar el hash para usar trim en el futuro
              try {
                const hashedPassword = await securityService.hashPassword(trimmedPassword);
                const conexion = await obtenerConexion();
                await conexion.execute(
                  "UPDATE usuarios SET password = ? WHERE id_usuario = ?",
                  [hashedPassword, usuario.id_usuario]
                );
                console.log(`[AuthController] ✅ Hash actualizado correctamente`);
              } catch (updateError) {
                console.error(`[AuthController] ⚠️ Error actualizando hash:`, updateError);
                // No fallar el login si la actualización falla
              }
            }
          }
          
          // Si aún falla, intentar con el password sin ningún procesamiento
          if (!passwordValid) {
            console.log(`[AuthController] ⚠️ Intentando verificación con password original sin procesar...`);
            const passwordValidOriginal = await securityService.verifyPassword(password, storedPassword);
            console.log(`[AuthController] Verificación con password original: ${passwordValidOriginal ? '✅ ÉXITO' : '❌ FALLÓ'}`);
            if (passwordValidOriginal) {
              passwordValid = true;
            }
          }
        } catch (error) {
          console.log(`[AuthController] ❌ Error verificando hash:`, error);
          console.log(`[AuthController] Error details:`, error instanceof Error ? error.message : String(error));
          console.log(`[AuthController] Error stack:`, error instanceof Error ? error.stack : 'No stack available');
          passwordValid = false;
        }
      }
      
      // Si no es hash o la verificación falló, intentar comparación directa (texto plano)
      if (!passwordValid) {
        console.log(`[AuthController] Intentando comparación directa (texto plano)...`);
        const storedPasswordTrimmed = storedPassword.trim();
        console.log(`[AuthController] Comparando (con trim): "${storedPasswordTrimmed}" === "${trimmedPassword}"`);
        console.log(`[AuthController] Comparando (sin trim): "${storedPassword}" === "${password}"`);
        console.log(`[AuthController] ¿Son iguales (trimmed)? ${storedPasswordTrimmed === trimmedPassword}`);
        console.log(`[AuthController] ¿Son iguales (sin trim)? ${storedPassword === password}`);
        console.log(`[AuthController] Longitudes: almacenado=${storedPassword.length}, recibido=${trimmedPassword.length}, password original=${password.length}`);
        
        // Intentar con trimmed primero
        if (storedPasswordTrimmed === trimmedPassword) {
          console.log(`[AuthController] ⚠️ Contraseña en texto plano detectada (trimmed). Actualizando a hash...`);
          try {
            const hashedPassword = await securityService.hashPassword(trimmedPassword);
            const conexion = await obtenerConexion();
            await conexion.execute(
              "UPDATE usuarios SET password = ? WHERE id_usuario = ?",
              [hashedPassword, usuario.id_usuario]
            );
            passwordValid = true;
            console.log(`[AuthController] ✅ Contraseña actualizada a hash correctamente`);
          } catch (error) {
            console.error(`[AuthController] ❌ Error actualizando hash:`, error);
            passwordValid = false;
          }
        } 
        // Intentar sin trim
        else if (storedPassword === password) {
          console.log(`[AuthController] ⚠️ Contraseña en texto plano detectada (sin trim). Actualizando a hash...`);
          try {
            const hashedPassword = await securityService.hashPassword(trimmedPassword);
            const conexion = await obtenerConexion();
            await conexion.execute(
              "UPDATE usuarios SET password = ? WHERE id_usuario = ?",
              [hashedPassword, usuario.id_usuario]
            );
            passwordValid = true;
            console.log(`[AuthController] ✅ Contraseña actualizada a hash correctamente`);
          } catch (error) {
            console.error(`[AuthController] ❌ Error actualizando hash:`, error);
            passwordValid = false;
          }
        } else {
          console.log(`[AuthController] ❌ Contraseña no coincide (ni hash ni texto plano)`);
          const storedChars = Array.from(storedPassword).map((c) => (c as string).charCodeAt(0));
          const trimmedChars = Array.from(trimmedPassword).map((c) => (c as string).charCodeAt(0));
          console.log(`[AuthController] DEBUG: storedPassword chars: [${storedChars.join(', ')}]`);
          console.log(`[AuthController] DEBUG: trimmedPassword chars: [${trimmedChars.join(', ')}]`);
        }
      }
      
      if (!passwordValid) {
        console.log(`[AuthController] ❌ Verificación de contraseña falló completamente`);
        console.log(`[AuthController] DEBUG INFO:`);
        console.log(`[AuthController]   - Email buscado: "${normalizedEmail}"`);
        console.log(`[AuthController]   - Usuario encontrado: ${usuario ? 'SÍ' : 'NO'}`);
        if (usuario) {
          console.log(`[AuthController]   - ID Usuario: ${usuario.id_usuario}`);
          console.log(`[AuthController]   - Email en BD: "${usuario.email}"`);
          console.log(`[AuthController]   - Password en BD (longitud): ${usuario.password?.length}`);
          console.log(`[AuthController]   - Password recibido (longitud): ${trimmedPassword.length}`);
        }
        ctx.response.status = 401;
        ctx.response.body = {
          success: false,
          error: "Credenciales inválidas",
          message: "Email o contraseña incorrectos",
          // Solo en desarrollo - remover en producción
          // @ts-ignore - Deno está disponible en runtime
          debug: (typeof Deno !== 'undefined' && Deno.env.get("NODE_ENV") !== "production") || true ? {
            emailBuscado: normalizedEmail,
            usuarioEncontrado: !!usuario,
            passwordLength: trimmedPassword.length,
            hashLength: usuario?.password?.length
          } : undefined
        };
        return;
      }
      
      console.log(`[AuthController] ✅ Contraseña verificada correctamente`);

      // Login exitoso - actualizar último acceso
      const conexion = await obtenerConexion();
      await conexion.execute(
        "UPDATE usuarios SET ultimo_acceso = NOW() WHERE id_usuario = ?",
        [usuario.id_usuario]
      );

      // Crear sesión (simplificado - sin tabla de sesiones)
      const sessionId = securityService.generateSessionId();

      // Crear JWT con información adicional
      const payload: Payload = {
        id: usuario.id_usuario!,
        rol: usuario.rol,
        email: usuario.email,
        session_id: sessionId,
        exp: getNumericDate(24 * 60 * 60), // expira en 24 horas
        iat: getNumericDate(0), // issued at
      };

      // Asegurar que el JWT esté inicializado
      if (!key) {
        console.warn("[AuthController] ⚠️ JWT no inicializado, intentando inicializar...");
        await initializeJWT();
        if (!key) {
          ctx.response.status = 500;
          ctx.response.body = {
            success: false,
            error: "Error del servidor",
            message: "Error al generar token de autenticación"
          };
          return;
        }
      }

      const header: Header = { alg: "HS256", typ: "JWT" };
      const jwt = await create(header, payload, key);

      // Notificación de login exitoso (simplificado - sin tabla de notificaciones)

      ctx.response.status = 200;
      ctx.response.body = {
        success: true,
        message: "Login exitoso",
        token: jwt,
        usuario: {
          id_usuario: usuario.id_usuario,
          id: usuario.id_usuario, // Compatibilidad
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
          telefono: usuario.telefono || null,
          direccion: usuario.direccion || null,
          id_ciudad: usuario.id_ciudad || null,
          activo: usuario.activo !== undefined ? usuario.activo : true,
          email_verificado: usuario.email_verificado || false,
          foto_perfil: usuario.foto_perfil || null,
          fecha_registro: usuario.fecha_registro || null,
          ultimo_acceso: usuario.ultimo_acceso || null
        },
        session_id: sessionId,
        expires_in: 24 * 60 * 60 // 24 horas en segundos
      };
    } catch (error) {
      console.error("Error en login:", error);
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        error: "Error interno del servidor",
        message: "Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo."
      };
    }
  }

  /**
   * Registro de nuevos usuarios
   */
  static async register(ctx: Context) {
    try {
      const body = await ctx.request.body.json();
      const { 
        nombre, email, password, telefono, direccion, id_ciudad, rol = 'consumidor',
        // Datos adicionales para productor (opcionales)
        nombre_finca, tipo_productor, vereda, direccion_finca, numero_registro_ica,
        certificaciones, descripcion_actividad, anos_experiencia, hectareas,
        metodo_produccion, sitio_web
      } = body;

      // Validaciones básicas
      if (!nombre || !email || !password || !telefono || !direccion || !id_ciudad) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: "Datos requeridos",
          message: "Todos los campos son obligatorios"
        };
        return;
      }

      // Validar formato de email
      if (!securityService.validateEmail(email)) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: "Email inválido",
          message: "El formato del email no es válido"
        };
        return;
      }

      // Validar formato de teléfono
      if (!securityService.validatePhone(telefono)) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: "Teléfono inválido",
          message: "El formato del teléfono no es válido"
        };
        return;
      }

      // Validar fortaleza de contraseña
      console.log(`[AuthController] 🔐 Validando fortaleza de contraseña...`);
      const passwordValidation = securityService.validatePasswordStrength(password);
      console.log(`[AuthController] Resultado validación: isValid=${passwordValidation.isValid}, score=${passwordValidation.score}, feedback.length=${passwordValidation.feedback.length}`);
      
      if (!passwordValidation.isValid) {
        console.log(`[AuthController] ❌ Contraseña rechazada por validación`);
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: "Contraseña débil",
          message: passwordValidation.feedback.length > 0 
            ? passwordValidation.feedback[0] 
            : "La contraseña debe tener al menos 8 caracteres",
          feedback: passwordValidation.feedback,
          score: passwordValidation.score
        };
        return;
      }
      console.log(`[AuthController] ✅ Contraseña válida, continuando con el registro...`);

      // Normalizar email
      const normalizedEmail = email.trim().toLowerCase();
      
      // Verificar si el email ya existe
      const userInstance = new Usuario();
      const existingUser = await userInstance.buscarPorEmail(normalizedEmail);
      if (existingUser) {
        ctx.response.status = 409;
        ctx.response.body = {
          success: false,
          error: "Email ya registrado",
          message: "Ya existe una cuenta con este email"
        };
        return;
      }

      // Hash de la contraseña - IMPORTANTE: usar trim para consistencia con el login
      const trimmedPassword = password.trim();
      console.log(`[AuthController] ========== REGISTRO ==========`);
      console.log(`[AuthController] Password recibido (raw): "${password}" (longitud: ${password.length})`);
      console.log(`[AuthController] Password recibido (trimmed): "${trimmedPassword}" (longitud: ${trimmedPassword.length})`);
      const hashedPassword = await securityService.hashPassword(trimmedPassword);
      console.log(`[AuthController] Password hasheado: "${hashedPassword.substring(0, 50)}..." (longitud: ${hashedPassword.length})`);

      // Crear usuario
      const newUser = new Usuario({
        id_usuario: null,
        nombre: securityService.sanitizeInput(nombre),
        email: normalizedEmail,
        password: hashedPassword,
        telefono: telefono,
        direccion: securityService.sanitizeInput(direccion),
        id_ciudad: id_ciudad,
        rol: rol,
        activo: true,
        email_verificado: false
      });

      const result = await newUser.InsertarUsuario();

      if (!result.success) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: "Error al crear usuario",
          message: result.message
        };
        return;
      }

      const nuevoUsuarioId = result.usuario!.id_usuario;
      
      // Verificar inmediatamente que el hash guardado funcione
      console.log(`[AuthController] Verificando hash inmediatamente después del registro...`);
      const storedHash = result.usuario && result.usuario.password ? String(result.usuario.password) : '';
      const hashVerification = storedHash ? await securityService.verifyPassword(trimmedPassword, storedHash) : false;
      console.log(`[AuthController] Verificación inmediata del hash: ${hashVerification ? '✅ FUNCIONA' : '❌ NO FUNCIONA'}`);
      
      if (!hashVerification) {
        console.warn(`[AuthController] ⚠️ ADVERTENCIA: El hash guardado no funciona. Regenerando...`);
        try {
          const newHash = await securityService.hashPassword(trimmedPassword);
          const conexion = await obtenerConexion();
          await conexion.execute(
            "UPDATE usuarios SET password = ? WHERE id_usuario = ?",
            [newHash, nuevoUsuarioId]
          );
          console.log(`[AuthController] ✅ Hash regenerado y actualizado`);
          
          // Verificar nuevamente
          const secondVerification = await securityService.verifyPassword(trimmedPassword, newHash);
          console.log(`[AuthController] Verificación después de regenerar: ${secondVerification ? '✅ FUNCIONA' : '❌ NO FUNCIONA'}`);
        } catch (regenerateError) {
          console.error(`[AuthController] ❌ Error regenerando hash:`, regenerateError);
        }
      }

      // Si es productor y se proporcionaron datos del productor, crear perfil automáticamente
      if (rol === 'productor' && nombre_finca) {
        try {
          // Obtener id_departamento desde la ciudad
          let id_departamento_productor = null;
          if (id_ciudad) {
            try {
              const conexion = await obtenerConexion();
              const ciudadInfo = await conexion.query(
                "SELECT id_departamento FROM ciudades WHERE id_ciudad = ?",
                [id_ciudad]
              );
              if (ciudadInfo.length > 0) {
                id_departamento_productor = ciudadInfo[0].id_departamento;
              }
            } catch (error) {
              console.warn("No se pudo obtener el departamento desde la ciudad:", error);
            }
          }
          
          const productorData = {
            id_usuario: nuevoUsuarioId as number,
            nombre_finca: nombre_finca || null,
            tipo_productor: tipo_productor || 'agricultor',
            id_departamento: id_departamento_productor,
            id_ciudad: id_ciudad || null,
            vereda: vereda || null,
            direccion_finca: direccion_finca || null,
            numero_registro_ica: numero_registro_ica || null,
            certificaciones: certificaciones || null,
            descripcion_actividad: descripcion_actividad || null,
            anos_experiencia: anos_experiencia ? parseInt(anos_experiencia.toString()) : null,
            hectareas: hectareas ? parseFloat(hectareas.toString()) : null,
            metodo_produccion: metodo_produccion || 'tradicional',
            sitio_web: sitio_web || null,
          };

          const productorModel = new ProductoresModel(productorData);
          const productorResult = await productorModel.GuardarProductor();
          
          if (productorResult.success) {
            console.log(`[AuthController] ✅ Perfil de productor creado para usuario ${nuevoUsuarioId}`);
          } else {
            console.warn(`[AuthController] ⚠️ Usuario creado pero perfil de productor no: ${productorResult.message}`);
          }
        } catch (error) {
          console.error(`[AuthController] ⚠️ Error al crear perfil de productor:`, error);
          // No fallar el registro si el perfil de productor falla, se puede crear después
        }
      }

      // Email de bienvenida (opcional - puede fallar si no está configurado)
      try {
        await emailService.sendWelcomeEmail(email, nombre, rol);
      } catch (error) {
        console.warn('No se pudo enviar email de bienvenida:', error);
      }

      ctx.response.status = 201;
      ctx.response.body = {
        success: true,
        message: "Usuario registrado exitosamente",
        usuario: {
          id_usuario: nuevoUsuarioId,
          id: nuevoUsuarioId,
          nombre: result.usuario!.nombre,
          email: result.usuario!.email,
          rol: result.usuario!.rol,
          email_verificado: false
        }
      };
    } catch (error) {
      console.error("Error en registro:", error);
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        error: "Error interno del servidor",
        message: "Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo."
      };
    }
  }

  /**
   * Logout
   */
  static logout(ctx: Context) {
    try {
      // Logout simplificado - solo limpiar token del cliente
      ctx.response.status = 200;
      ctx.response.body = {
        success: true,
        message: "Sesión cerrada correctamente"
      };
    } catch (error) {
      console.error("Error en logout:", error);
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        error: "Error interno del servidor",
        message: "Error al cerrar sesión"
      };
    }
  }

  /**
   * Verificar token JWT
   */
  static verifyToken(ctx: Context) {
    try {
      const user = ctx.state.user;
      
      if (!user) {
        ctx.response.status = 401;
        ctx.response.body = {
          success: false,
          error: "Token inválido",
          message: "El token proporcionado no es válido"
        };
        return;
      }

      // Verificación simplificada - solo verificar que el token es válido
      ctx.response.status = 200;
      ctx.response.body = {
        success: true,
        message: "Token válido",
        usuario: {
          id: user.id,
          rol: user.rol,
          email: user.email
        }
      };
    } catch (error) {
      console.error("Error al verificar token:", error);
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        error: "Error interno del servidor",
        message: "Error al verificar token"
      };
    }
  }

  /**
   * Endpoint de prueba para verificar hash (solo desarrollo)
   * TODO: Remover en producción
   */
  static async testHash(ctx: Context) {
    try {
      const body = await ctx.request.body.json();
      const { password, hash } = body;

      if (!password) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: "Password requerido",
          message: "Se requiere un password para probar"
        };
        return;
      }

      const trimmedPassword = password.trim();
      
      // Si se proporciona un hash, verificar contra él
      if (hash) {
        console.log(`[AuthController] ========== PRUEBA DE HASH ==========`);
        console.log(`[AuthController] Password: "${trimmedPassword}" (${trimmedPassword.length} chars)`);
        console.log(`[AuthController] Hash proporcionado: "${hash.substring(0, 50)}..." (${hash.length} chars)`);
        
        const isValid = await securityService.verifyPassword(trimmedPassword, hash);
        
        ctx.response.status = 200;
        ctx.response.body = {
          success: true,
          isValid,
          message: isValid ? "Hash válido" : "Hash inválido",
          passwordLength: trimmedPassword.length,
          hashLength: hash.length
        };
        return;
      }

      // Si no se proporciona hash, generar uno nuevo
      const newHash = await securityService.hashPassword(trimmedPassword);
      const testVerification = await securityService.verifyPassword(trimmedPassword, newHash);
      
      ctx.response.status = 200;
      ctx.response.body = {
        success: true,
        hash: newHash,
        hashLength: newHash.length,
        testVerification,
        message: testVerification ? "Hash generado y verificado correctamente" : "Error: Hash generado pero verificación falló"
      };
    } catch (error) {
      console.error("Error en testHash:", error);
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : "Error desconocido"
      };
    }
  }

  /**
   * Resetear contraseña (temporal - solo para desarrollo)
   * TODO: Remover o proteger en producción
   */
  static async resetPassword(ctx: Context) {
    try {
      const body = await ctx.request.body.json();
      const { email, newPassword } = body;

      if (!email || !newPassword) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: "Datos requeridos",
          message: "Email y nueva contraseña son requeridos"
        };
        return;
      }

      // Normalizar email
      const normalizedEmail = email.trim().toLowerCase();

      // Buscar usuario
      const userInstance = new Usuario();
      const usuario = await userInstance.buscarPorEmail(normalizedEmail);

      if (!usuario) {
        ctx.response.status = 404;
        ctx.response.body = {
          success: false,
          error: "Usuario no encontrado",
          message: "No se encontró un usuario con ese email"
        };
        return;
      }

      // Hash de nueva contraseña
      const hashedPassword = await securityService.hashPassword(newPassword);

      // Actualizar contraseña
      const conexion = await obtenerConexion();
      await conexion.execute(
        "UPDATE usuarios SET password = ? WHERE id_usuario = ?",
        [hashedPassword, usuario.id_usuario]
      );

      console.log(`[AuthController] ✅ Contraseña reseteada para usuario: ${normalizedEmail}`);

      ctx.response.status = 200;
      ctx.response.body = {
        success: true,
        message: "Contraseña reseteada correctamente"
      };
    } catch (error) {
      console.error("Error al resetear contraseña:", error);
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        error: "Error interno del servidor",
        message: "Error al resetear contraseña"
      };
    }
  }

  /**
   * Cambiar contraseña
   */
  static async changePassword(ctx: Context) {
    try {
      const user = ctx.state.user;
      const body = await ctx.request.body.json();
      const { currentPassword, newPassword } = body;

      if (!currentPassword || !newPassword) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: "Datos requeridos",
          message: "Contraseña actual y nueva contraseña son requeridas"
        };
        return;
      }

      // Validar fortaleza de nueva contraseña
      const passwordValidation = securityService.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: "Contraseña débil",
          message: "La nueva contraseña no cumple con los requisitos de seguridad",
          feedback: passwordValidation.feedback
        };
        return;
      }

      // Obtener usuario actual
      const userInstance = new Usuario();
      const usuario = await userInstance.buscarPorEmail(user.email);

      if (!usuario) {
        ctx.response.status = 404;
        ctx.response.body = {
          success: false,
          error: "Usuario no encontrado",
          message: "El usuario no existe"
        };
        return;
      }

      // Verificar contraseña actual
      const currentPasswordValid = await securityService.verifyPassword(currentPassword, usuario.password);
      if (!currentPasswordValid) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: "Contraseña actual incorrecta",
          message: "La contraseña actual no es correcta"
        };
        return;
      }

      // Hash de nueva contraseña
      const trimmedNewPassword = newPassword.trim();
      const hashedNewPassword = await securityService.hashPassword(trimmedNewPassword);

      // Actualizar contraseña
      const conexion = await obtenerConexion();
      await conexion.execute(
        "UPDATE usuarios SET password = ? WHERE id_usuario = ?",
        [hashedNewPassword, user.id]
      );

      // Notificación de cambio de contraseña (simplificado)

      ctx.response.status = 200;
      ctx.response.body = {
        success: true,
        message: "Contraseña actualizada correctamente"
      };
    } catch (error) {
      console.error("Error al cambiar contraseña:", error);
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        error: "Error interno del servidor",
        message: "Error al cambiar contraseña"
      };
    }
  }
}