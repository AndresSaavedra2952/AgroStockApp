import api from './ApiService';

export const ubicacionesService = {
  /**
   * Obtener todas las regiones
   */
  async getRegiones() {
    try {
      const response = await api.get('/regiones');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Obtener todos los departamentos
   */
  async getDepartamentos(idRegion = null) {
    try {
      const url = idRegion 
        ? `/departamentos?id_region=${idRegion}`
        : '/departamentos';
      console.log('[UbicacionesService] 📤 GET', url);
      const response = await api.get(url);
      console.log('[UbicacionesService] ✅ Respuesta:', response.data);
      return response.data;
    } catch (error) {
      console.error('[UbicacionesService] ❌ Error al obtener departamentos:', error);
      const errorData = error.response?.data || { 
        success: false, 
        message: error.message || 'Error al conectar con el servidor',
        error: error.message 
      };
      throw errorData;
    }
  },

  /**
   * Obtener todas las ciudades
   */
  async getCiudades(idDepartamento = null) {
    try {
      const url = idDepartamento
        ? `/ciudades?id_departamento=${idDepartamento}`
        : '/ciudades';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default ubicacionesService;






