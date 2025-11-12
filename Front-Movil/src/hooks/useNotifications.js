import { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import notificationService from '../service/NotificationService';

export const useNotifications = (navigation) => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [permisos, setPermisos] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);

  useEffect(() => {
    // Solicitar permisos
    solicitarPermisos();

    // Configurar listeners
    if (navigation) {
      notificationService.configurarListeners(navigation);
    }

    // Listener para notificaciones recibidas
    const receivedSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        setNotificaciones(prev => [notification, ...prev]);
        setBadgeCount(prev => prev + 1);
      }
    );

    // Listener para respuestas a notificaciones
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        handleNotificationTap(data);
      }
    );

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [navigation]);

  const solicitarPermisos = async () => {
    const tienePermiso = await notificationService.solicitarPermisos();
    setPermisos(tienePermiso);
    
    if (tienePermiso) {
      await notificationService.registrarToken();
    }
  };

  const handleNotificationTap = (data) => {
    if (!navigation || !data) return;

    // Navegar según el tipo de notificación
    if (data.type === 'pedido') {
      navigation.navigate('Pedidos', { pedidoId: data.id });
    } else if (data.type === 'mensaje') {
      navigation.navigate('Mensajes', { mensajeId: data.id });
    } else if (data.type === 'producto') {
      navigation.navigate('Productos', { productoId: data.id });
    }
  };

  const enviarNotificacionLocal = async (titulo, mensaje, data = {}) => {
    await notificationService.enviarNotificacionLocal(titulo, mensaje, data);
  };

  const limpiarBadge = async () => {
    await Notifications.setBadgeCountAsync(0);
    setBadgeCount(0);
  };

  return {
    notificaciones,
    permisos,
    badgeCount,
    solicitarPermisos,
    enviarNotificacionLocal,
    limpiarBadge,
  };
};

export default useNotifications;






