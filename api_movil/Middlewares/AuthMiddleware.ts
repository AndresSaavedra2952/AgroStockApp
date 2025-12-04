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
        console.log(`[AuthMiddleware] ❌ Acceso denegado`);
        console.log(`   - Ruta: ${ctx.request.method} ${ctx.request.url.pathname}`);
        console.log(`   - Usuario ID: ${payload.id || payload.id_usuario || 'N/A'}`);
        console.log(`   - Rol del usuario: ${payload.rol}`);
        console.log(`   - Roles permitidos: ${rolesPermitidos.join(', ')}`);
        console.log(`   - Payload completo:`, JSON.stringify(payload, null, 2));
        ctx.response.status = 403;
        ctx.response.body = { 
          success: false,
          error: "FORBIDDEN",
          message: "No tienes permisos para acceder a este recurso",
          debug: {
            user_rol: payload.rol,
            user_id: payload.id || payload.id_usuario,
            allowed_roles: rolesPermitidos,
            route: `${ctx.request.method} ${ctx.request.url.pathname}`
          }
        };
        return;
      }
      
      // Log de acceso exitoso para debugging
      if (rolesPermitidos.length > 0) {
        console.log(`[AuthMiddleware] ✅ Acceso permitido - Rol: ${payload.rol}, Ruta: ${ctx.request.method} ${ctx.request.url.pathname}`);
      }

      await next();
    } catch (_e) {
      ctx.response.status = 401;
      ctx.response.body = { 
        success: false,
        error: "INVALID_TOKEN",
        message: "Token inválido o expirado" 
      };
    }
  };
}
