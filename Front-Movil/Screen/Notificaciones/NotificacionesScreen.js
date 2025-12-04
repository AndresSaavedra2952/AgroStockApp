import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import notificacionesService from '../../src/service/NotificacionesService';
import { useAuth } from '../../src/context/AuthContext';

export default function NotificacionesScreen({ navigation }) {
  const { user } = useAuth();
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarNotificaciones();
  }, []);

  // Recargar cuando se navega a esta pantalla
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      cargarNotificaciones();
    });
    return unsubscribe;
  }, [navigation]);

  const cargarNotificaciones = async () => {
    setLoading(true);
    try {
      const response = await notificacionesService.getNotificaciones(100);
      if (response.success) {
        setNotificaciones(response.notificaciones || []);
      }
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
      Alert.alert('Error', 'No se pudieron cargar las notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const marcarComoLeida = async (idNotificacion) => {
    try {
      const response = await notificacionesService.marcarComoLeida(idNotificacion);
      if (response.success) {
        // Actualizar la notificación en la lista
        setNotificaciones(prev =>
          prev.map(notif =>
            notif.id_notificacion === idNotificacion
              ? { ...notif, leida: 1 }
              : notif
          )
        );
        // Recargar para actualizar el contador
        cargarNotificaciones();
      }
    } catch (error) {
      console.error('Error al marcar como leída:', error);
    }
  };

  const marcarTodasComoLeidas = async () => {
    try {
      const response = await notificacionesService.marcarTodasComoLeidas();
      if (response.success) {
        Alert.alert('Éxito', 'Todas las notificaciones han sido marcadas como leídas');
        cargarNotificaciones();
      }
    } catch (error) {
      console.error('Error al marcar todas como leídas:', error);
      Alert.alert('Error', 'No se pudieron marcar todas como leídas');
    }
  };

  const eliminarNotificacion = async (idNotificacion) => {
    Alert.alert(
      'Eliminar notificación',
      '¿Estás seguro de que deseas eliminar esta notificación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await notificacionesService.eliminarNotificacion(idNotificacion);
              if (response.success) {
                setNotificaciones(prev =>
                  prev.filter(notif => notif.id_notificacion !== idNotificacion)
                );
              }
            } catch (error) {
              console.error('Error al eliminar notificación:', error);
              Alert.alert('Error', 'No se pudo eliminar la notificación');
            }
          },
        },
      ]
    );
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'pedido':
        return 'receipt';
      case 'stock':
        return 'warning';
      case 'precio':
        return 'pricetag';
      case 'mensaje':
        return 'chatbubble';
      case 'promocion':
        return 'gift';
      case 'sistema':
      default:
        return 'information-circle';
    }
  };

  const getTipoColor = (tipo) => {
    switch (tipo) {
      case 'pedido':
        return '#2196f3';
      case 'stock':
        return '#ff9800';
      case 'precio':
        return '#4caf50';
      case 'mensaje':
        return '#9c27b0';
      case 'promocion':
        return '#e91e63';
      case 'sistema':
      default:
        return '#607d8b';
    }
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '';
    const date = new Date(fecha);
    const now = new Date();
    const diff = now - date;
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);

    if (minutos < 1) return 'Ahora';
    if (minutos < 60) return `Hace ${minutos} min`;
    if (horas < 24) return `Hace ${horas} h`;
    if (dias < 7) return `Hace ${dias} días`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const renderNotificacion = ({ item }) => {
    const noLeida = !item.leida || item.leida === 0;
    const tipoIcon = getTipoIcon(item.tipo);
    const tipoColor = getTipoColor(item.tipo);

    return (
      <TouchableOpacity
        style={[styles.notificacionCard, noLeida && styles.notificacionNoLeida]}
        onPress={() => {
          if (noLeida) {
            marcarComoLeida(item.id_notificacion);
          }
        }}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${tipoColor}20` }]}>
          <Ionicons name={tipoIcon} size={24} color={tipoColor} />
        </View>
        <View style={styles.notificacionContent}>
          <View style={styles.notificacionHeader}>
            <Text style={[styles.notificacionTitulo, noLeida && styles.notificacionTituloNoLeida]}>
              {item.titulo}
            </Text>
            <Text style={styles.notificacionFecha}>{formatFecha(item.fecha_creacion)}</Text>
          </View>
          <Text style={styles.notificacionMensaje} numberOfLines={2}>
            {item.mensaje}
          </Text>
        </View>
        <View style={styles.notificacionActions}>
          {noLeida && <View style={styles.badge} />}
          <TouchableOpacity
            onPress={() => eliminarNotificacion(item.id_notificacion)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={18} color="#999" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const notificacionesNoLeidas = notificaciones.filter(n => !n.leida || n.leida === 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Notificaciones</Text>
          <Text style={styles.headerSubtitle}>
            {notificacionesNoLeidas.length} {notificacionesNoLeidas.length === 1 ? 'no leída' : 'no leídas'}
          </Text>
        </View>
        {notificacionesNoLeidas.length > 0 && (
          <TouchableOpacity
            style={styles.marcarTodasButton}
            onPress={marcarTodasComoLeidas}
          >
            <Ionicons name="checkmark-done" size={20} color="#2e7d32" />
            <Text style={styles.marcarTodasText}>Marcar todas</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Lista de notificaciones */}
      {loading && notificaciones.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2e7d32" />
          <Text style={styles.loadingText}>Cargando notificaciones...</Text>
        </View>
      ) : (
        <FlatList
          data={notificaciones}
          renderItem={renderNotificacion}
          keyExtractor={(item) => item.id_notificacion?.toString() || Math.random().toString()}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={cargarNotificaciones}
              colors={['#2e7d32']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No tienes notificaciones</Text>
              <Text style={styles.emptySubtext}>
                Te notificaremos cuando tengas actualizaciones importantes
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  marcarTodasButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#e8f5e9',
  },
  marcarTodasText: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
  },
  listContent: {
    padding: 15,
  },
  notificacionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  notificacionNoLeida: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificacionContent: {
    flex: 1,
  },
  notificacionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  notificacionTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  notificacionTituloNoLeida: {
    fontWeight: 'bold',
  },
  notificacionFecha: {
    fontSize: 12,
    color: '#999',
  },
  notificacionMensaje: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  notificacionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2196f3',
  },
  deleteButton: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

