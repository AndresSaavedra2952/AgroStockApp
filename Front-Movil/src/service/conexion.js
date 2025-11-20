// Configuración centralizada de conexión con el servidor Deno
// IMPORTANTE: Tu PC y tu móvil deben estar en la misma red WiFi

// IP local de tu PC (cámbiala por la tuya)
// Para encontrarla: ipconfig (Windows) o ifconfig (Mac/Linux)
// Busca "Dirección IPv4"
const LOCAL_IP = '10.42.122.250';

// Puerto donde corre el backend Deno
const API_PORT = 8000;

// Lista de IPs alternativas para intentar (fallback)
// Se intentarán en orden si la IP principal falla
const ALTERNATIVE_IPS = [
  '172.20.10.7',      // IP alternativa común
  '172.20.10.9',      // Otra IP posible
  '192.168.1.100',    // IP común en otras redes
  'localhost'         // Solo funciona si estás en el mismo dispositivo
];

// IP actualmente en uso (se establece después de verificar)
let currentIP = LOCAL_IP;

// Función para verificar si una IP responde
const verificarIP = async (ip, port = API_PORT) => {
  try {
    const url = `http://${ip}:${port}/health`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // Timeout de 2 segundos
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'ok') {
        return true;
      }
    }
    return false;
  } catch (error) {
    return false;
  }
};

// Función para encontrar la IP correcta automáticamente
const encontrarIPCorrecta = async () => {
  // Primero intentar la IP principal
  if (await verificarIP(LOCAL_IP)) {
    currentIP = LOCAL_IP;
    return LOCAL_IP;
  }
  
  // Si falla, intentar IPs alternativas
  console.log(`⚠️ IP principal (${LOCAL_IP}) no responde, intentando IPs alternativas...`);
  
  for (const ip of ALTERNATIVE_IPS) {
    console.log(`🔍 Probando IP: ${ip}`);
    if (await verificarIP(ip)) {
      console.log(`✅ IP encontrada: ${ip}`);
      currentIP = ip;
      return ip;
    }
  }
  
  // Si ninguna funciona, usar la IP principal de todas formas
  console.warn(`⚠️ No se pudo verificar ninguna IP, usando la principal: ${LOCAL_IP}`);
  currentIP = LOCAL_IP;
  return LOCAL_IP;
};

// URL base de la API
const getBaseURL = () => {
  if (__DEV__) {
    // En desarrollo: usa tu IP local (NO localhost ni 127.0.0.1)
    const url = `http://${currentIP}:${API_PORT}`;
    console.log('🔗 API Base URL:', url);
    console.log('💡 Si no funciona, verifica que el servidor Deno esté corriendo');
    console.log('💡 Ejecuta: cd api_agrostock/api_movil && deno run --allow-all app.ts');
    return url;
  } else {
    // En producción: URL del servidor
    return 'https://tu-servidor-produccion.com';
  }
};

// Función para inicializar y verificar la conexión (opcional, se puede llamar manualmente)
export const inicializarConexion = async () => {
  if (__DEV__) {
    console.log('🔍 Verificando conexión con el servidor...');
    const ipCorrecta = await encontrarIPCorrecta();
    console.log(`✅ Usando IP: ${ipCorrecta}`);
    return ipCorrecta;
  }
  return LOCAL_IP;
};

// URL base exportada (se inicializa con la IP por defecto)
// Se actualizará automáticamente cuando se encuentre una IP que funcione
export let API_BASE_URL = getBaseURL();

// Variable para rastrear si ya se intentó verificar la conexión
let verificacionEnProceso = false;
let verificacionCompletada = false;

// Función para actualizar la URL base de forma segura
export const actualizarURLBase = (ip) => {
  currentIP = ip;
  API_BASE_URL = `http://${ip}:${API_PORT}`;
  console.log(`🌐 API Base URL actualizada: ${API_BASE_URL}`);
  return API_BASE_URL;
};

// Intentar verificar la conexión de forma asíncrona (no bloquea la carga)
if (__DEV__ && !verificacionCompletada) {
  // Usar setTimeout para no bloquear la inicialización
  setTimeout(() => {
    if (!verificacionEnProceso) {
      verificacionEnProceso = true;
      inicializarConexion()
        .then((ip) => {
          actualizarURLBase(ip);
          verificacionCompletada = true;
        })
        .catch((error) => {
          console.warn('⚠️ No se pudo verificar la IP automáticamente:', error);
          console.log(`💡 Usando IP por defecto: ${LOCAL_IP}`);
          verificacionCompletada = true;
        })
        .finally(() => {
          verificacionEnProceso = false;
        });
    }
  }, 1000); // Esperar 1 segundo antes de verificar
}

// Configuración completa exportada
export default {
  API_BASE_URL,
  API_PORT,
  LOCAL_IP,
  ALTERNATIVE_IPS,
  currentIP,
  getBaseURL,
  inicializarConexion,
  verificarIP,
};
