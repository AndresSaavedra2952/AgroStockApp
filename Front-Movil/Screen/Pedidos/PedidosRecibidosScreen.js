import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import pedidosService from '../../src/service/PedidosService';

export default function PedidosRecibidosScreen({ navigation }) {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarPedidos();
  }, []);

  const cargarPedidos = async () => {
    setLoading(true);
    try {
      const response = await pedidosService.getPedidosRecibidos();
      if (response.success) {
        setPedidos(response.data || []);
      }
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmarPedido = async (id) => {
    try {
      const response = await pedidosService.confirmarPedido(id);
      if (response.success) {
        Alert.alert('Éxito', 'Pedido confirmado');
        cargarPedidos();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo confirmar el pedido');
    }
  };

  const completarPedido = async (id) => {
    try {
      const response = await pedidosService.completarPedido(id);
      if (response.success) {
        Alert.alert('Éxito', 'Pedido marcado como completado');
        cargarPedidos();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo completar el pedido');
    }
  };

  const renderPedido = ({ item }) => (
    <View style={styles.pedidoCard}>
      <View style={styles.pedidoHeader}>
        <Text style={styles.pedidoId}>Pedido #{item.id_pedido}</Text>
        <Text style={styles.estado}>{item.estado}</Text>
      </View>
      <Text style={styles.pedidoFecha}>Fecha: {item.fecha}</Text>
      <Text style={styles.pedidoTotal}>Total: ${item.total?.toLocaleString()}</Text>
      <View style={styles.actions}>
        {item.estado === 'pendiente' && (
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => confirmarPedido(item.id_pedido)}
          >
            <Text style={styles.confirmButtonText}>Confirmar</Text>
          </TouchableOpacity>
        )}
        {item.estado === 'confirmado' && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => completarPedido(item.id_pedido)}
          >
            <Text style={styles.completeButtonText}>Marcar como Completado</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={pedidos}
        renderItem={renderPedido}
        keyExtractor={(item) => item.id_pedido.toString()}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={cargarPedidos} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tienes pedidos recibidos</Text>
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
  pedidoCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    elevation: 2,
    marginHorizontal: 15,
    marginTop: 15,
  },
  pedidoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pedidoId: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  estado: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  pedidoFecha: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  pedidoTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 15,
  },
  actions: {
    marginTop: 10,
  },
  confirmButton: {
    backgroundColor: '#2196f3',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  completeButton: {
    backgroundColor: '#4caf50',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
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



