import { encodeBase64Url, decodeBase64Url } from "../Dependencies/dependencias.ts";

/**
 * Servicio de seguridad para manejo de contraseñas y tokens
 */
export class SecurityService {
  // private readonly BCRYPT_ROUNDS = 12; // TODO: Implementar cuando se necesite

  /**
   * Genera un hash seguro de contraseña usando Web Crypto API
   */
  async hashPassword(password: string): Promise<string> {
    try {
      // Crear un salt aleatorio
      const salt = crypto.getRandomValues(new Uint8Array(16));
      
      // Importar la clave para PBKDF2
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
      );

      // Derivar la clave usando PBKDF2
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000, // 100,000 iteraciones
          hash: 'SHA-256'
        },
        keyMaterial,
        256 // 256 bits
      );

      // Combinar salt y hash
      const combined = new Uint8Array(salt.length + derivedBits.byteLength);
      combined.set(salt);
      combined.set(new Uint8Array(derivedBits), salt.length);

      // Codificar en base64url
      return encodeBase64Url(combined.buffer);
    } catch (error) {
      console.error("Error al hashear contraseña:", error);
      throw new Error("Error al procesar contraseña");
    }
  }

  /**
   * Verifica una contraseña contra su hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      console.log(`[SecurityService] ========== VERIFICACIÓN PBKDF2 ==========`);
      console.log(`[SecurityService] Password recibido: "${password}" (${password.length} chars, tipo: ${typeof password})`);
      console.log(`[SecurityService] Hash recibido: "${hash?.substring(0, 50) || 'NULL'}..." (${hash?.length || 0} chars, tipo: ${typeof hash})`);
      
      // Si el hash está vacío o es null, retornar false
      if (!hash || hash.trim() === '') {
        console.log('[SecurityService] ❌ Hash vacío o nulo');
        return false;
      }
      
      // Asegurar que hash sea un string
      const hashString = String(hash).trim();
      
      // Si el hash no parece ser un hash base64url válido (muy corto o formato incorrecto)
      // puede ser texto plano, retornar false para que el AuthController lo maneje
      if (hashString.length < 20) {
        console.log(`[SecurityService] ❌ Hash demasiado corto (${hashString.length} chars), probablemente texto plano`);
        return false;
      }
      
      // Verificar que el hash tenga una longitud razonable (un hash PBKDF2 con salt de 16 bytes + hash de 32 bytes
      // codificado en base64url debería tener aproximadamente 64-65 caracteres)
      if (hashString.length < 40) {
        console.log(`[SecurityService] ⚠️ Hash muy corto (${hashString.length} chars), esperado ~64 chars para PBKDF2`);
      }
      
      // Decodificar el hash
      let combined: Uint8Array;
      try {
        combined = decodeBase64Url(hashString);
        console.log(`[SecurityService] Hash decodificado correctamente (${combined.length} bytes)`);
      } catch (error) {
        console.log('[SecurityService] ❌ Error decodificando hash, probablemente formato incorrecto:', error);
        console.log(`[SecurityService] Hash que falló: "${hashString.substring(0, 100)}..."`);
        return false;
      }
      
      // Verificar que el hash decodificado tenga el tamaño correcto
      if (combined.length < 32) {
        console.log(`[SecurityService] ❌ Hash decodificado demasiado corto (${combined.length} bytes, mínimo 32)`);
        return false;
      }
      
      // Extraer salt y hash
      const salt = combined.slice(0, 16);
      const storedHash = combined.slice(16);
      console.log(`[SecurityService] Salt extraído: ${salt.length} bytes`);
      console.log(`[SecurityService] Hash almacenado extraído: ${storedHash.length} bytes`);

      // Importar la clave para PBKDF2
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
      );

      // Derivar la clave usando el mismo salt
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        256
      );

      // Comparar hashes
      const derivedHash = new Uint8Array(derivedBits);
      console.log(`[SecurityService] Hash derivado generado: ${derivedHash.length} bytes`);
      
      // Comparación segura para evitar timing attacks
      if (derivedHash.length !== storedHash.length) {
        console.log(`[SecurityService] ❌ Longitudes diferentes: derivado=${derivedHash.length}, almacenado=${storedHash.length}`);
        return false;
      }

      let isEqual = true;
      let firstDiffIndex = -1;
      for (let i = 0; i < derivedHash.length; i++) {
        if (derivedHash[i] !== storedHash[i]) {
          isEqual = false;
          if (firstDiffIndex === -1) {
            firstDiffIndex = i;
          }
        }
      }

      if (isEqual) {
        console.log(`[SecurityService] ✅ Hashes coinciden perfectamente`);
      } else {
        console.log(`[SecurityService] ❌ Hashes NO coinciden (primera diferencia en byte ${firstDiffIndex})`);
        console.log(`[SecurityService]   Byte ${firstDiffIndex}: derivado=${derivedHash[firstDiffIndex]}, almacenado=${storedHash[firstDiffIndex]}`);
      }

      return isEqual;
    } catch (error) {
      console.error("Error al verificar contraseña:", error);
      return false;
    }
  }

  /**
   * Genera un token seguro aleatorio
   */
  generateSecureToken(length: number = 32): string {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return encodeBase64Url(bytes.buffer);
  }

  /**
   * Genera un código de verificación
   */
  generateVerificationCode(length: number = 6): string {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    let code = '';
    for (let i = 0; i < length; i++) {
      code += (bytes[i] % 10).toString();
    }
    return code;
  }

  /**
   * Valida la fortaleza de una contraseña
   * Validación simplificada: solo requiere longitud mínima de 8 caracteres
   */
  validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } {
    console.log(`[SecurityService] 🔐 Validando contraseña (nueva versión simplificada)`);
    console.log(`[SecurityService] Longitud de contraseña: ${password.length}`);
    
    const feedback: string[] = [];
    let score = 0;

    // Longitud mínima (requisito obligatorio)
    if (password.length < 8) {
      feedback.push("La contraseña debe tener al menos 8 caracteres");
      console.log(`[SecurityService] ❌ Contraseña rechazada: menos de 8 caracteres`);
      return {
        isValid: false,
        score: 0,
        feedback
      };
    }
    score += 1;
    console.log(`[SecurityService] ✅ Contraseña válida: tiene ${password.length} caracteres (mínimo 8)`);

    // Longitud recomendada (opcional - solo para score)
    if (password.length >= 12) {
      score += 1;
    }

    // Contiene mayúsculas (opcional - solo para score)
    if (/[A-Z]/.test(password)) {
      score += 1;
    }

    // Contiene minúsculas (opcional - solo para score)
    if (/[a-z]/.test(password)) {
      score += 1;
    }

    // Contiene números (opcional - solo para score)
    if (/\d/.test(password)) {
      score += 1;
    }

    // Contiene caracteres especiales (opcional - solo para score)
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score += 1;
    }

    // No contiene patrones comunes (advertencia, no bloquea)
    const commonPatterns = [
      /12345678/,
      /password/i,
      /qwerty/i,
      /abc123/i,
      /admin/i
    ];

    if (commonPatterns.some(pattern => pattern.test(password))) {
      // Solo advertencia, no bloquea el registro
      console.warn("⚠️ Contraseña contiene patrones comunes inseguros");
    }

    // La contraseña es válida si tiene al menos 8 caracteres
    const isValid = password.length >= 8;
    
    console.log(`[SecurityService] ✅ Validación completada: ${isValid ? 'VÁLIDA' : 'INVÁLIDA'}, Score: ${score}`);

    return {
      isValid,
      score: Math.max(0, Math.min(5, score)),
      feedback: [] // No mostrar feedback si es válida
    };
  }

  /**
   * Genera un hash para verificación de email
   */
  async generateEmailVerificationHash(email: string): Promise<string> {
    const timestamp = Date.now().toString();
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    const data = `${email}:${timestamp}:${encodeBase64Url(randomBytes.buffer)}`;
    
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    
    return encodeBase64Url(new Uint8Array(hashBuffer).buffer);
  }

  /**
   * Valida un hash de verificación de email
   */
  async validateEmailVerificationHash(email: string, hash: string): Promise<boolean> {
    try {
      // En un sistema real, almacenarías el hash con timestamp
      // y verificarías que no haya expirado (ej: 24 horas)
      const generatedHash = await this.generateEmailVerificationHash(email);
      return generatedHash === hash;
    } catch (error) {
      console.error("Error al validar hash de email:", error);
      return false;
    }
  }

  /**
   * Genera un token de recuperación de contraseña
   */
  generatePasswordResetToken(): string {
    const timestamp = Date.now().toString();
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const data = `${timestamp}:${encodeBase64Url(randomBytes.buffer)}`;
    
    const encodedData = new TextEncoder().encode(data);
    return encodeBase64Url(encodedData.buffer as ArrayBuffer);
  }

  /**
   * Valida un token de recuperación de contraseña
   */
  validatePasswordResetToken(token: string, maxAgeHours: number = 24): boolean {
    try {
      const decoded = new TextDecoder().decode(decodeBase64Url(token));
      const [timestamp] = decoded.split(':');
      
      const tokenTime = parseInt(timestamp);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000; // Convertir a milisegundos
      
      return (now - tokenTime) <= maxAge;
    } catch (error) {
      console.error("Error al validar token de recuperación:", error);
      return false;
    }
  }

  /**
   * Sanitiza datos de entrada para prevenir XSS
   */
  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remover < y >
      .replace(/javascript:/gi, '') // Remover javascript:
      .replace(/on\w+=/gi, '') // Remover event handlers
      .trim();
  }

  /**
   * Valida formato de email
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Valida formato de teléfono colombiano
   */
  validatePhone(phone: string): boolean {
    // Formato colombiano: +57, 57, o sin código de país
    const phoneRegex = /^(\+?57)?[1-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  /**
   * Genera un ID único para sesiones
   */
  generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    const randomString = encodeBase64Url(randomBytes.buffer).replace(/[^a-zA-Z0-9]/g, '');
    
    return `sess_${timestamp}_${randomString}`.substring(0, 32);
  }

  /**
   * Valida que un string no contenga caracteres peligrosos
   */
  validateSafeString(input: string, maxLength: number = 255): {
    isValid: boolean;
    sanitized: string;
    errors: string[];
  } {
    const errors: string[] = [];
    let sanitized = input;

    // Longitud
    if (input.length > maxLength) {
      errors.push(`El texto no puede exceder ${maxLength} caracteres`);
      sanitized = input.substring(0, maxLength);
    }

    // Caracteres peligrosos
    const dangerousChars = /[<>'"&]/g;
    if (dangerousChars.test(input)) {
      errors.push("El texto contiene caracteres no permitidos");
      sanitized = sanitized.replace(dangerousChars, '');
    }

    // Scripts
    const scriptPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    if (scriptPattern.test(input)) {
      errors.push("El texto contiene código JavaScript no permitido");
      sanitized = sanitized.replace(scriptPattern, '');
    }

    return {
      isValid: errors.length === 0,
      sanitized: sanitized.trim(),
      errors
    };
  }
}

export const securityService = new SecurityService();
