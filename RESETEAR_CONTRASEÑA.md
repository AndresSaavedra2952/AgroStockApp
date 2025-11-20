# 🔐 Cómo Resetear tu Contraseña para Probar el Login

## Problema
El login está fallando porque el hash de la contraseña en la base de datos no coincide con la contraseña que estás ingresando.

## Solución: Resetear la Contraseña

### Opción 1: Usar el Endpoint de Reset (Recomendado)

Usa Postman, Insomnia, o curl para hacer una petición POST al endpoint de reset:

**URL:** `http://localhost:8000/auth/reset-password`  
**Método:** POST  
**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "email": "tu-email@ejemplo.com",
  "newPassword": "tu-nueva-contraseña-123"
}
```

**Ejemplo con curl:**
```bash
curl -X POST http://localhost:8000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email": "tu-email@ejemplo.com", "newPassword": "tu-nueva-contraseña-123"}'
```

### Opción 2: Usar el Endpoint de Test Hash

Primero, prueba si el hash funciona:

**URL:** `http://localhost:8000/auth/test-hash`  
**Método:** POST  
**Body:**
```json
{
  "email": "tu-email@ejemplo.com",
  "password": "tu-contraseña-actual"
}
```

Esto te dirá si el hash es válido o no.

### Opción 3: Ver los Logs del Servidor

Cuando intentas hacer login, revisa la consola del servidor backend. Deberías ver logs como:

```
[AuthController] ========== VERIFICACIÓN DE CONTRASEÑA ==========
[AuthController] Password recibido (raw): "..." (longitud: X)
[AuthController] Password almacenado (longitud): Y
[SecurityService] ========== VERIFICACIÓN PBKDF2 ==========
```

Estos logs te dirán exactamente dónde está fallando.

## Pasos Recomendados

1. **Resetea tu contraseña** usando el endpoint de reset-password
2. **Intenta hacer login** con la nueva contraseña
3. **Revisa los logs del servidor** si sigue fallando
4. **Comparte los logs** si necesitas ayuda adicional

## Nota Importante

El endpoint de reset-password es solo para desarrollo. En producción, deberías usar un sistema de recuperación de contraseña más seguro.








