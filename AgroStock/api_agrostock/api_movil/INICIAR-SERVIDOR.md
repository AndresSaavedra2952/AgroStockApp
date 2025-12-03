# 🚀 GUÍA PARA INICIAR EL SERVIDOR BACKEND

## ⚠️ PROBLEMA ACTUAL
El servidor backend no está respondiendo. Sigue estos pasos para solucionarlo.

---

## 📋 PASO 1: Verificar que el servidor NO esté corriendo

Abre PowerShell y ejecuta:

```powershell
Get-NetTCPConnection -LocalPort 8000
```

**Si muestra algo:**
- El puerto está en uso. Detén el proceso:
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process
```

**Si no muestra nada:**
- El puerto está libre. Continúa al siguiente paso.

---

## 📋 PASO 2: Verificar MySQL/XAMPP

1. Abre **XAMPP Control Panel**
2. Verifica que **MySQL** esté en estado **"Running"** (verde)
3. Si no está corriendo, haz clic en **"Start"** junto a MySQL

---

## 📋 PASO 3: Verificar archivo .env

Asegúrate de que existe el archivo `.env` en `api_agrostock/api_movil/`

Si no existe, créalo con este contenido:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=agrostock
JWT_SECRET=mi_clave_secreta_super_segura_2024
```

---

## 📋 PASO 4: Iniciar el servidor

Abre una **nueva terminal** (PowerShell o CMD) y ejecuta:

```powershell
cd C:\xampp\htdocs\Agrostock\AgroStockApp\api_agrostock\api_movil
deno task start
```

**O si no funciona, ejecuta directamente:**

```powershell
deno run --allow-net --allow-read --allow-write --allow-env app.ts
```

---

## 📋 PASO 5: Verificar que el servidor inició correctamente

Deberías ver estos mensajes:

```
============================================================
🚀 INICIANDO SERVIDOR AGROSTOCK API
============================================================
📡 Escuchando en todas las interfaces (0.0.0.0:8000)
🌐 URLs disponibles:
   - http://localhost:8000
   - http://127.0.0.1:8000
   - http://172.20.10.7:8000 (IP local)

✅ Servidor listo para recibir conexiones
💡 Health check: http://localhost:8000/health
============================================================
```

**⚠️ Si ves errores, compártelos para ayudarte.**

---

## 📋 PASO 6: Probar el servidor

### Opción A: Desde el navegador
Abre tu navegador y ve a:
```
http://localhost:8000/health
```

Deberías ver:
```json
{
  "status": "ok",
  "message": "Servidor funcionando correctamente",
  "timestamp": "...",
  "server": "AgroStock API",
  "version": "1.0.0"
}
```

### Opción B: Desde PowerShell
```powershell
Invoke-WebRequest -Uri "http://localhost:8000/health"
```

---

## 📋 PASO 7: Verificar la IP en el frontend

1. Obtén tu IP actual:
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*"}
```

2. Verifica que la IP en `Front-Movil/src/service/conexion.js` sea la correcta.

3. Si cambió tu IP, actualiza el archivo:
```javascript
const LOCAL_IP = 'TU_IP_AQUI'; // Ejemplo: '192.168.1.100'
```

---

## 📋 PASO 8: Probar desde el móvil

1. Asegúrate de que tu PC y móvil estén en la **misma red WiFi**
2. En el móvil, abre un navegador y ve a:
```
http://TU_IP:8000/health
```
Ejemplo: `http://172.20.10.7:8000/health`

3. Si funciona, el servidor está accesible desde el móvil.

---

## ❌ PROBLEMAS COMUNES

### Error: "Puerto 8000 en uso"
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process
```

### Error: "No se puede conectar a la base de datos"
- Verifica que MySQL esté corriendo en XAMPP
- Verifica las credenciales en el archivo `.env`

### Error: "Deno no se reconoce como comando"
- Instala Deno: https://deno.land/
- O usa: `winget install DenoLand.Deno`

### El móvil no puede conectarse
- Verifica que ambos dispositivos estén en la misma WiFi
- Verifica el firewall de Windows (permite el puerto 8000)
- Verifica que la IP sea correcta

---

## ✅ VERIFICACIÓN FINAL

Si todo está bien, deberías poder:
1. ✅ Ver el mensaje "Servidor listo para recibir conexiones"
2. ✅ Acceder a `http://localhost:8000/health` desde el navegador
3. ✅ Acceder a `http://TU_IP:8000/health` desde el móvil
4. ✅ El frontend móvil puede conectarse al servidor

---

## 🆘 SI NADA FUNCIONA

Comparte:
1. Los mensajes que ves al ejecutar `deno task start`
2. El resultado de `Get-NetTCPConnection -LocalPort 8000`
3. El resultado de acceder a `http://localhost:8000/health` en el navegador

