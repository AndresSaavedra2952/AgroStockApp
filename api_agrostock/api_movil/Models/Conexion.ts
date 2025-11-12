import { Client } from "../Dependencies/dependencias.ts";
import { load } from "../Dependencies/dependencias.ts";

// 📌 Configuración de conexión a la base de datos
let conexion: Client;
let isConnected = false;

// Función para inicializar la conexión
async function inicializarConexion() {
  if (isConnected && conexion) {
    return conexion;
  }

  try {
    // Cargar variables de entorno (si existe el archivo .env)
    // Si no existe, usar valores por defecto para XAMPP
    let env: Record<string, string> = {};
    try {
      env = await load();
    } catch (error) {
      // Si no existe el archivo .env, usar valores por defecto
      console.log("ℹ️ No se encontró archivo .env, usando valores por defecto para XAMPP");
    }
    
    // Configuración de conexión con valores por defecto para XAMPP
    const config = {
      hostname: env.DB_HOST || "localhost",
      port: parseInt(env.DB_PORT || "3306"),
      username: env.DB_USER || "root",
      password: env.DB_PASSWORD || "", // XAMPP por defecto no tiene contraseña
      db: env.DB_NAME || "agrostock",
      poolSize: parseInt(env.DB_POOL_SIZE || "10"),
      idleTimeout: parseInt(env.DB_IDLE_TIMEOUT || "60000"),
    };

    console.log("🔗 Conectando a la base de datos...");
    console.log(`   Host: ${config.hostname}:${config.port}`);
    console.log(`   Database: ${config.db}`);
    console.log(`   User: ${config.username}`);

    conexion = await new Client().connect(config);
    
    console.log("✅ Conexión a la base de datos establecida correctamente");
    
    // Probar la conexión
    await conexion.query("SELECT 1 as test");
    console.log("✅ Prueba de conexión exitosa");
    
    isConnected = true;
    return conexion;
    
  } catch (error) {
    console.error("❌ Error al conectar con la base de datos:", error);
    console.error("   Verifica que:");
    console.error("   - MySQL/MariaDB esté ejecutándose");
    console.error("   - Las credenciales sean correctas");
    console.error("   - La base de datos 'agrostock' exista");
    console.error("   - El usuario tenga permisos suficientes");
    isConnected = false;
    throw error;
  }
}

// Inicializar conexión al cargar el módulo (con manejo de errores para no bloquear el servidor)
inicializarConexion().catch((error) => {
  console.error("❌ Error crítico al inicializar la conexión a la base de datos:", error);
  console.error("⚠️ El servidor continuará, pero las peticiones a la BD fallarán hasta que se resuelva el problema");
  console.error("💡 Verifica que MySQL/MariaDB esté corriendo y las credenciales sean correctas");
});

// 📌 Función para obtener la conexión (con reconexión automática)
export const obtenerConexion = async (): Promise<Client> => {
  try {
    if (!isConnected || !conexion) {
      return await inicializarConexion();
    }
    // Verificar que la conexión sigue activa
    await conexion.query("SELECT 1 as test");
    return conexion;
  // deno-lint-ignore no-unused-vars
  } catch (error) {
    console.warn("⚠️ Conexión perdida, intentando reconectar...");
    isConnected = false;
    return await inicializarConexion();
  }
};

// 📌 Función para cerrar la conexión (útil para tests)
export const cerrarConexion = async () => {
  try {
    if (conexion) {
      await conexion.close();
      isConnected = false;
      console.log("🔌 Conexión a la base de datos cerrada");
    }
  } catch (error) {
    console.error("Error al cerrar la conexión:", error);
  }
};

// 📌 Función para verificar el estado de la conexión
export const verificarConexion = async (): Promise<boolean> => {
  try {
    const conn = await obtenerConexion();
    await conn.query("SELECT 1 as test");
    return true;
  } catch (error) {
    console.error("Error al verificar la conexión:", error);
    return false;
  }
};

// 📌 Función para obtener estadísticas de la conexión
export const obtenerEstadisticasConexion = async () => {
  try {
    const conn = await obtenerConexion();
    const stats = await conn.query("SHOW STATUS LIKE 'Connections'");
    return {
      conexiones_totales: stats[0]?.Value || 0,
      estado: "activa",
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      conexiones_totales: 0,
      estado: "error",
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
};

// Exportar conexión directa (para compatibilidad con código existente)
// Nota: Se recomienda usar obtenerConexion() para mejor manejo de errores
// Esta exportación se actualiza cuando se inicializa la conexión
export { conexion };

// Función helper para obtener conexión de forma síncrona (solo si ya está conectada)
export const getConexion = (): Client | null => {
  return isConnected ? conexion : null;
};