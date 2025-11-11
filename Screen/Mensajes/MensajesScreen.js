import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import mensajesService from '../../src/service/MensajesService';

export default function MensajesScreen({ navigation }) {
  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarMensajes();
  }, []);

  const cargarMensajes = async () => {
    setLoading(true);
    try {
      const response = await mensajesService.getMensajesRecibidos();
      if (response.success) {
        setMensajes(response.data || []);
      }
    } catch (error) {
      console.error('Error al cargar mensajes:', error);
    } finally {
      setLoading(false);
    }
  };

  const marcarComoLeido = async (idMensaje) => {
    try {
      await mensajesService.marcarComoLeido(idMensaje);
      cargarMensajes();
    } catch (error) {
      console.error('Error al marcar como leído:', error);
    }
  };

  const renderMensaje = ({ item }) => (
    <TouchableOpacity
      style={[styles.mensajeCard, !item.leido && styles.mensajeNoLeido]}
      onPress={() => {
        if (!item.leido) {
          marcarComoLeido(item.id_mensaje);
        }
        // Navegar a detalle del mensaje si es necesario
      }}
    >
      <View style={styles.mensajeHeader}>
        <Text style={styles.mensajeRemitente}>{item.nombre_remitente || 'Usuario'}</Text>
        {!item.leido && <View style={styles.puntoNoLeido} />}
      </View>
      <Text style={styles.mensajeAsunto}>{item.asunto}</Text>
      <Text style={styles.mensajeTexto} numberOfLines={2}>
        {item.mensaje}
      </Text>
      <Text style={styles.mensajeFecha}>
        {new Date(item.fecha_envio).toLocaleString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={mensajes}
        renderItem={renderMensaje}
        keyExtractor={(item) => item.id_mensaje.toString()}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={cargarMensajes} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tienes mensajes</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mensajeCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 10,
    elevation: 2,
  },
  mensajeNoLeido: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  mensajeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mensajeRemitente: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  puntoNoLeido: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2196f3',
  },
  mensajeAsunto: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  mensajeTexto: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  mensajeFecha: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
  },
});



