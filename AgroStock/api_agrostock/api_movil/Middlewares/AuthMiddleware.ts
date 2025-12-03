// deno-lint-ignore-file
import { Context } from "../Dependencies/dependencias.ts";
import { verify } from "../Dependencies/dependencias.ts";
import { load } from "../Dependencies/dependencias.ts";

const env = await load();
const secret = env.JWT_SECRET || "fallback_secret";

const key = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(secret),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign", "verify"],
);

// Middleware de autenticación con validación de roles
export function AuthMiddleware(rolesPermitidos: string[] = []) {
  return async (ctx: Context, next: () => Promise<unknown>) => {
    const headers = ctx.request.headers;
    const authorization = headers.get("Authorization");

    if (!authorization) {
      ctx.response.status = 401;
      ctx.response.body = { 
        success: false,
        error: "UNAUTHORIZED",
        message: "Token no proporcionado" 
      };
      return;
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      ctx.response.status = 401;
      ctx.response.body = { 
        success: false,
        error: "INVALID_AUTH_FORMAT",
        message: "Formato de autorización inválido. Use: Bearer <token>" 
      };
      return;
    }

    try {
      const payload: any = await verify(token, key);

      // Guardamos el payload en el contexto
      ctx.state.user = payload;

      // 🚨 Validar roles si el endpoint requiere alguno
      // ✅ ADMIN siempre tiene acceso completo (bypass de restricciones)
      if (rolesPermitidos.length > 0 && payload.rol !== 'admin' && !rolesPermitidos.includes(payload.rol)) {
        ctx.response.status = 403;
        ctx.response.body = { 
          success: false,
          error: "FORBIDDEN",
          message: "No tienes permisos para acceder a este recurso" 
        };
        return;
      }

      await next();
    } catch (e) {
      // Log del error específico para debugging
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`[AuthMiddleware] ❌ Error verificando token:`, errorMessage);
      console.error(`[AuthMiddleware] Token recibido (primeros 20 chars):`, token.substring(0, 20) + '...');
      
      // Determinar el tipo de error
      let errorType = "INVALID_TOKEN";
      let message = "Token inválido o expirado";
      
      if (errorMessage.includes("expired") || errorMessage.includes("exp")) {
        errorType = "TOKEN_EXPIRED";
        message = "El token ha expirado. Por favor, inicia sesión nuevamente.";
      } else if (errorMessage.includes("invalid") || errorMessage.includes("signature")) {
        errorType = "INVALID_TOKEN";
        message = "Token inválido. Por favor, inicia sesión nuevamente.";
      }
      
      ctx.response.status = 401;
      ctx.response.body = { 
        success: false,
        error: errorType,
        message: message
      };
    }
  };
}
