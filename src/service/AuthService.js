import api from './ApiService';

export const authService = {
  /**
   * Iniciar sesión
   */
  async login(email, password) {
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
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

