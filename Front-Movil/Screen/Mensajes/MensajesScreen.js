import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import mensajesService from '../../src/service/MensajesService';
import { useAuth } from '../../src/context/AuthContext';

export default function MensajesScreen({ navigation }) {
  const { user } = useAuth();
  const [conversaciones, setConversaciones] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarConversaciones();
  }, []);

  // Recargar cuando se navega a esta pantalla
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      cargarConversaciones();
    });
    return unsubscribe;
  }, [navigation]);

  const cargarConversaciones = async () => {
    setLoading(true);
    try {
      // Cargar tanto recibidos como enviados para agrupar conversaciones
      const [recibidosRes, enviadosRes] = await Promise.all([
        mensajesService.getMensajesRecibidos().catch(err => {
          console.error('Error cargando recibidos:', err);
          return { success: false, data: [] };
        }),
        mensajesService.getMensajesEnviados().catch(err => {
          console.error('Error cargando enviados:', err);
          return { success: false, data: [] };
        })
      ]);

      const recibidos = recibidosRes.success ? (recibidosRes.data || []) : [];
      const enviados = enviadosRes.success ? (enviadosRes.data || []) : [];

      // Combinar todos los mensajes
      const todosMensajes = [...recibidos, ...enviados];

      // Agrupar por usuario (remitente o destinatario según corresponda)
      const grouped = {};
      
      todosMensajes.forEach((msg) => {
        // Determinar el ID del otro usuario en la conversación
        let otroUsuarioId = null;
        let otroUsuarioNombre = null;
        let otroUsuarioEmail = null;

        if (msg.id_remitente === user?.id_usuario) {
          // Mensaje enviado por mí, el otro es el destinatario
          otroUsuarioId = msg.id_destinatario;
          otroUsuarioNombre = msg.nombre_destinatario;
          otroUsuarioEmail = msg.email_destinatario;
        } else {
          // Mensaje recibido, el otro es el remitente
          otroUsuarioId = msg.id_remitente;
          otroUsuarioNombre = msg.nombre_remitente;
          otroUsuarioEmail = msg.email_remitente;
        }

        if (!otroUsuarioId || otroUsuarioId === user?.id_usuario) {
          return; // Saltar mensajes propios o inválidos
        }

        if (!grouped[otroUsuarioId]) {
          grouped[otroUsuarioId] = {
            userId: otroUsuarioId,
            nombreUsuario: otroUsuarioNombre || `Usuario #${otroUsuarioId}`,
            emailUsuario: otroUsuarioEmail || '',
            mensajes: [],
            noLeidos: 0,
          };
        }

        grouped[otroUsuarioId].mensajes.push(msg);
        
        // Contar no leídos (solo mensajes recibidos)
        if (!msg.leido && msg.id_remitente === otroUsuarioId) {
          grouped[otroUsuarioId].noLeidos++;
        }
      });

      // Convertir a array y ordenar por último mensaje
      const conversacionesArray = Object.values(grouped).map(conv => {
        // Ordenar mensajes por fecha (más reciente primero)
        conv.mensajes.sort((a, b) => {
          const fechaA = new Date(a.fecha_envio || a.fecha_creacion || 0).getTime();
          const fechaB = new Date(b.fecha_envio || b.fecha_creacion || 0).getTime();
          return fechaB - fechaA;
        });
        
        return {
          ...conv,
          ultimoMensaje: conv.mensajes[0],
        };
      });

      // Ordenar conversaciones por fecha del último mensaje (más recientes primero)
      conversacionesArray.sort((a, b) => {
        const fechaA = new Date(a.ultimoMensaje?.fecha_envio || a.ultimoMensaje?.fecha_creacion || 0).getTime();
        const fechaB = new Date(b.ultimoMensaje?.fecha_envio || b.ultimoMensaje?.fecha_creacion || 0).getTime();
        return fechaB - fechaA;
      });

      setConversaciones(conversacionesArray);
    } catch (error) {
      console.error('Error al cargar conversaciones:', error);
      setConversaciones([]);
    } finally {
      setLoading(false);
    }
  };

  const formatMessageDate = (fecha) => {
    if (!fecha) return '';
    const date = new Date(fecha);
    if (isNaN(date.getTime())) return '';
    
    const ahora = new Date();
    const diffMs = ahora - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)}h`;
    
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMessagePreview = (texto, maxLength = 60) => {
    if (!texto) return 'Sin mensaje';
    return texto.length > maxLength ? `${texto.substring(0, maxLength)}...` : texto;
  };

  const renderConversacion = ({ item }) => {
    const ultimoMensaje = item.ultimoMensaje;
    const fechaUltimoMensaje = formatMessageDate(
      ultimoMensaje?.fecha_envio || ultimoMensaje?.fecha_creacion
    );

    return (
      <TouchableOpacity
        style={[styles.conversacionCard, item.noLeidos > 0 && styles.conversacionNoLeida]}
        onPress={() => {
          navigation.navigate('ChatIndividual', {
            userId: item.userId,
            nombreUsuario: item.nombreUsuario,
            emailUsuario: item.emailUsuario,
          });
        }}
      >
        <View style={styles.conversacionAvatar}>
          <Ionicons 
            name="person" 
            size={24} 
            color={item.noLeidos > 0 ? '#2196f3' : '#666'} 
          />
        </View>
        <View style={styles.conversacionInfo}>
          <View style={styles.conversacionHeader}>
            <Text style={[styles.conversacionNombre, item.noLeidos > 0 && styles.conversacionNombreNoLeida]}>
              {item.nombreUsuario}
            </Text>
            <Text style={styles.conversacionFecha}>{fechaUltimoMensaje}</Text>
          </View>
          <Text style={styles.conversacionAsunto} numberOfLines={1}>
            {ultimoMensaje?.asunto || 'Sin asunto'}
          </Text>
          <Text style={styles.conversacionPreview} numberOfLines={1}>
            {getMessagePreview(ultimoMensaje?.mensaje)}
          </Text>
        </View>
        {item.noLeidos > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {item.noLeidos > 99 ? '99+' : item.noLeidos}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mensajes</Text>
        <Text style={styles.headerSubtitle}>
          {conversaciones.length} {conversaciones.length === 1 ? 'conversación' : 'conversaciones'}
        </Text>
      </View>

      {/* Lista de conversaciones */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2e7d32" />
          <Text style={styles.loadingText}>Cargando conversaciones...</Text>
        </View>
      ) : (
        <FlatList
          data={conversaciones}
          renderItem={renderConversacion}
          keyExtractor={(item) => item.userId.toString()}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={cargarConversaciones}
              colors={['#2e7d32']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No tienes conversaciones</Text>
              <Text style={styles.emptySubtext}>
                Puedes contactar productores desde la página de productos
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
    backgroundColor: '#2e7d32',
    padding: 20,
    paddingTop: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  listContent: {
    paddingBottom: 20,
  },
  conversacionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  conversacionNoLeida: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  conversacionAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  conversacionInfo: {
    flex: 1,
  },
  conversacionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversacionNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  conversacionNombreNoLeida: {
    fontWeight: 'bold',
    color: '#2196f3',
  },
  conversacionFecha: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  conversacionAsunto: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 2,
  },
  conversacionPreview: {
    fontSize: 13,
    color: '#999',
  },
  badge: {
    backgroundColor: '#2196f3',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 15,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
