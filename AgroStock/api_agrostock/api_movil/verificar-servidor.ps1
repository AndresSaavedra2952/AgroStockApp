# Script de verificación del servidor AgroStock API
# Ejecutar en PowerShell: .\verificar-servidor.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔍 VERIFICACIÓN DEL SERVIDOR AGROSTOCK" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar si el puerto 8000 está en uso
Write-Host "1️⃣ Verificando puerto 8000..." -ForegroundColor Yellow
$port = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($port) {
    Write-Host "   ⚠️  El puerto 8000 está en uso" -ForegroundColor Red
    Write-Host "   Proceso: $($port.OwningProcess)" -ForegroundColor Yellow
    $process = Get-Process -Id $port.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "   Nombre: $($process.ProcessName)" -ForegroundColor Yellow
        Write-Host "   Para detener: Stop-Process -Id $($port.OwningProcess)" -ForegroundColor Cyan
    }
} else {
    Write-Host "   ✅ Puerto 8000 disponible" -ForegroundColor Green
}
Write-Host ""

# 2. Verificar conexión al servidor
Write-Host "2️⃣ Verificando conexión al servidor..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Servidor respondiendo correctamente" -ForegroundColor Green
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ Servidor no responde" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   💡 Asegúrate de que el servidor esté corriendo" -ForegroundColor Yellow
}
Write-Host ""

# 3. Verificar IP local
Write-Host "3️⃣ Verificando IP local..." -ForegroundColor Yellow
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "172.20.10.*"}).IPAddress
if ($ip) {
    Write-Host "   ✅ IP encontrada: $ip" -ForegroundColor Green
    Write-Host "   URL del servidor: http://$ip:8000" -ForegroundColor Cyan
} else {
    Write-Host "   ⚠️  No se encontró IP 172.20.10.x" -ForegroundColor Yellow
    Write-Host "   IPs disponibles:" -ForegroundColor Yellow
    Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*"} | ForEach-Object {
        Write-Host "      - $($_.IPAddress)" -ForegroundColor Cyan
    }
}
Write-Host ""

# 4. Verificar MySQL/XAMPP
Write-Host "4️⃣ Verificando MySQL..." -ForegroundColor Yellow
$mysql = Get-Process -Name "mysqld" -ErrorAction SilentlyContinue
if ($mysql) {
    Write-Host "   ✅ MySQL está corriendo" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  MySQL no está corriendo" -ForegroundColor Yellow
    Write-Host "   💡 Inicia XAMPP y asegúrate de que MySQL esté activo" -ForegroundColor Cyan
}
Write-Host ""

# 5. Instrucciones
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📋 INSTRUCCIONES PARA INICIAR EL SERVIDOR" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Abre una terminal en: api_agrostock\api_movil" -ForegroundColor White
Write-Host "2. Ejecuta: deno task start" -ForegroundColor White
Write-Host "   O: deno run --allow-net --allow-read --allow-write --allow-env app.ts" -ForegroundColor White
Write-Host "3. Espera a ver el mensaje: '✅ Servidor listo para recibir conexiones'" -ForegroundColor White
Write-Host "4. Prueba en el navegador: http://localhost:8000/health" -ForegroundColor White
Write-Host ""

