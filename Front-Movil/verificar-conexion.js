// Script para verificar la conexión con el servidor
// Ejecutar con: node verificar-conexion.js

const axios = require('axios');

const IPs = ['172.20.10.8', '172.20.10.7', '192.168.1.100', 'localhost'];
const PORT = 8000;

async function verificarConexion() {
  console.log('🔍 Verificando conexión con el servidor...\n');
  
  for (const ip of IPs) {
    const url = `http://${ip}:${PORT}/health`;
    try {
      console.log(`Intentando conectar a: ${url}`);
      const response = await axios.get(url, { timeout: 3000 });
      console.log(`✅ ✅ ✅ CONEXIÓN EXITOSA en ${url}`);
      console.log(`Respuesta:`, response.data);
      console.log(`\n💡 Actualiza la IP en Front-Movil/src/service/conexion.js a: ${ip}`);
      return ip;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`❌ Servidor no está corriendo en ${ip}:${PORT}`);
      } else if (error.code === 'ETIMEDOUT') {
        console.log(`⏱️  Timeout al conectar a ${ip}:${PORT}`);
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }
  
  console.log('\n❌ No se pudo conectar a ningún servidor.');
  console.log('💡 Asegúrate de que:');
  console.log('   1. El servidor Deno esté corriendo');
  console.log('   2. MySQL/XAMPP esté activo');
  console.log('   3. La IP sea correcta');
  console.log('\n📋 Para iniciar el servidor:');
  console.log('   cd api_agrostock/api_movil');
  console.log('   deno run --allow-all app.ts');
}

verificarConexion();


