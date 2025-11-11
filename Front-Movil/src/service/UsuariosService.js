import api from './ApiService';

export const usuariosService = {
  /**
   * Obtener perfil del usuario actual
   */
  async getPerfil() {
    try {
      const response = await api.get('/usuarios/perfil');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Actualizar perfil del usuario
   */
  async actualizarPerfil(datosUsuario) {
    try {
      const response = await api.put('/usuarios/perfil', datosUsuario);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Obtener usuario por ID
   */
  async getUsuarioPorId(id) {
    try {
      const response = await api.get(`/usuarios/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default usuariosService;






