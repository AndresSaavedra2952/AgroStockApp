// Configuración centralizada de conexión con el servidor Deno
// IMPORTANTE: Tu PC y tu móvil deben estar en la misma red WiFi

// IP local de tu PC (cámbiala por la tuya)
// Para encontrarla: ipconfig (Windows) o ifconfig (Mac/Linux)
// Busca "Dirección IPv4"
const LOCAL_IP = '172.20.10.8';

// Puerto donde corre el backend Denos
const API_PORT = 8000;

// URL base de la API
const getBaseURL = () => {
  if (__DEV__) {
    // En desarrollo: usa tu IP local (NO localhost ni 127.0.0.1)
    const url = `http://${LOCAL_IP}:${API_PORT}`;
    console.log('🔗 API Base URL:', url);
    return url;
  } else {
    // En producción: URL del servidor
    return 'https://tu-servidor-produccion.com';
  }
};

// URL base exportada
export const API_BASE_URL = getBaseURL();

// Configuración completa exportada
export default {
  API_BASE_URL,
  API_PORT,
  getBaseURL,
};
