import api from './ApiService';

export const authService = {
  /**
   * Iniciar sesión
   */
  async login(email, password) {
    try {
      // Normalizar email: trim y lowercase
      // NO hacer trim del password aquí - el backend lo manejará para consistencia
      const normalizedEmail = email.trim().toLowerCase();
      
      // Log en desarrollo para debug
      if (__DEV__) {
        console.log('🔐 Intentando login con:', {
          emailOriginal: email,
          emailNormalizado: normalizedEmail,
          passwordLength: password.length,
        });
      }
      
      const response = await api.post('/auth/login', {
        email: normalizedEmail,
        password: password, // Enviar password sin trim - backend lo manejará
      });
      
      // Validar que la respuesta tenga el formato esperado
      if (!response || !response.data) {
        console.error('❌ Respuesta inválida del servidor:', response);
        throw new Error('Respuesta inválida del servidor');
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Error en AuthService.login:', error);
      
      // Manejar diferentes tipos de errores
      if (error.response) {
        // El servidor respondió con un código de error
        const errorData = error.response.data || {};
        const errorMessage = errorData.message || errorData.error || 'Error al iniciar sesión';
        throw {
          message: errorMessage,
          error: errorData.error,
          status: error.response.status,
          data: errorData
        };
      } else if (error.request) {
        // La petición se hizo pero no hubo respuesta
        throw {
          message: 'No se pudo conectar al servidor. Verifica tu conexión.',
          error: 'NETWORK_ERROR'
        };
      } else {
        // Error al configurar la petición
        throw {
          message: error.message || 'Error al iniciar sesión',
          error: 'REQUEST_ERROR'
        };
      }
    }
  },

  /**
   * Registro de nuevo usuario
   */
  async register(userData) {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Cerrar sesión
   */
  async logout() {
    try {
      const response = await api.post('/auth/logout');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Verificar token
   */
  async verifyToken() {
    try {
      const response = await api.get('/auth/verify');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Cambiar contraseña
   */
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default authService;





