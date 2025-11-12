import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './ApiService';

// Configurar cómo se manejan las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const notificationService = {
  /**
   * Solicitar permisos de notificaciones
   */
  async solicitarPermisos() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      return finalStatus === 'granted';
    } catch (error) {
      console.error('Error al solicitar permisos:', error);
      return false;
    }
  },

  /**
   * Registrar token FCM en el servidor
   */
  async registrarToken() {
    try {
      // En desarrollo con Expo Go, el projectId puede no estar disponible
      // Intentamos obtener el token, pero no fallamos si no hay projectId
      const token = await Notifications.getExpoPushTokenAsync();
      
      if (!token?.data) {
        return null;
      }
      
      // Guardar token localmente
      await AsyncStorage.setItem('fcm_token', token.data);
      
      // Enviar token al servidor
      try {
        await api.post('/usuarios/fcm-token', {
          fcm_token: token.data,
        });
      } catch (error) {
        console.error('Error al registrar token en servidor:', error);
      }
      
      return token.data;
    } catch (error) {
      // En desarrollo, si el error es por projectId, lo ignoramos silenciosamente
      if (error.message?.includes('projectId') && __DEV__) {
        // No mostrar error en desarrollo, las notificaciones push no son críticas
        return null;
      }
      // Para otros errores o en producción, mostrar el error
      console.error('Error al obtener token:', error);
      return null;
    }
  },

  /**
   * Configurar listener de notificaciones
   */
  configurarListeners(navigation) {
    // Listener para cuando se recibe una notificación
    Notifications.addNotificationReceivedListener(notification => {
      console.log('Notificación recibida:', notification);
    });

    // Listener para cuando el usuario toca una notificación
    Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      if (data && navigation) {
        // Navegar según el tipo de notificación
        if (data.type === 'pedido') {
          navigation.navigate('Pedidos');
        } else if (data.type === 'mensaje') {
          navigation.navigate('Mensajes');
        } else if (data.type === 'producto') {
          navigation.navigate('Productos');
        }
      }
    });
  },

  /**
   * Enviar notificación local
   */
  async enviarNotificacionLocal(titulo, mensaje, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: titulo,
          body: mensaje,
          data: data,
          sound: true,
        },
        trigger: null, // Mostrar inmediatamente
      });
    } catch (error) {
      console.error('Error al enviar notificación local:', error);
    }
  },
};

export default notificationService;





