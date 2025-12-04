import api from './ApiService';

export const usuariosService = {
  /**
   * Obtener perfil del usuario actual
   */
  async getPerfil() {
    try {
      const response = await api.get('/usuarios/mi-perfil');
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
      const response = await api.put('/usuarios/mi-perfil', datosUsuario);
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

  /**
   * Subir foto de perfil
   */
  async subirFotoPerfil(imagenData) {
    try {
      const response = await api.post('/images/productor/perfil', {
        imageData: imagenData  // El backend espera 'imageData' (en inglés)
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default usuariosService;






