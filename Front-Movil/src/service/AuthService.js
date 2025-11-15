import api from './ApiService';

export const authService = {
  /**
   * Iniciar sesión
   */
  async login(email, password) {
    try {
      // Normalizar email: trim y lowercase
      const normalizedEmail = email.trim().toLowerCase();
      const trimmedPassword = password.trim();
      
      // Log en desarrollo para debug
      if (__DEV__) {
        console.log('🔐 Intentando login con:', {
          emailOriginal: email,
          emailNormalizado: normalizedEmail,
          passwordLength: trimmedPassword.length,
        });
      }
      
      const response = await api.post('/auth/login', {
        email: normalizedEmail,
        password: trimmedPassword,
      });
      return response.data;
    } catch (error) {
      // Si hay respuesta del servidor, lanzar el objeto completo del error
      if (error.response?.data) {
        throw error.response.data;
      }
      // Si no hay respuesta, lanzar un objeto con formato similar
      throw {
        success: false,
        error: 'Error de conexión',
        message: error.message || 'Error al conectar con el servidor'
      };
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
      // Si hay respuesta del servidor, lanzar el objeto completo del error
      if (error.response?.data) {
        throw error.response.data;
      }
      // Si no hay respuesta, lanzar un objeto con formato similar
      throw {
        success: false,
        error: 'Error de conexión',
        message: error.message || 'Error al conectar con el servidor'
      };
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





