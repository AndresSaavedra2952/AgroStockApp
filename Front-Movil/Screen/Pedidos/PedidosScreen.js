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
import { SafeAreaView } from 'react-native-safe-area-context';
import pedidosService from '../../src/service/PedidosService';
import { useAuth } from '../../src/context/AuthContext';

export default function PedidosScreen({ navigation, route }) {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarPedidos();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (route?.params?.refresh) {
        cargarPedidos();
        navigation.setParams({ refresh: false });
      } else {
        cargarPedidos();
      }
    });
    return unsubscribe;
  }, [navigation, route]);

  const cargarPedidos = async () => {
    setLoading(true);
    try {
      const response = await pedidosService.getPedidosRealizados();
      if (response.success) {
        setPedidos(response.data || []);
      }
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'comprado':
        return '#4caf50';
      case 'confirmado':
        return '#2196f3';
      case 'pendiente':
        return '#ff9800';
      default:
        return '#666';
    }
  };

  const renderPedido = ({ item }) => (
    <TouchableOpacity
      style={styles.pedidoCard}
      onPress={() => {
        navigation.navigate('PedidoDetalle', { pedidoId: item.id_pedido });
      }}
    >
      <View style={styles.pedidoHeader}>
        <Text style={styles.pedidoId}>Pedido #{item.id_pedido}</Text>
        <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(item.estado) }]}>
          <Text style={styles.estadoText}>{item.estado}</Text>
        </View>
      </View>
      <Text style={styles.pedidoFecha}>
        Fecha: {item.fecha_pedido ? new Date(item.fecha_pedido).toLocaleDateString('es-ES') : 'No especificada'}
      </Text>
      <Text style={styles.pedidoTotal}>Total: ${item.total?.toLocaleString()}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={pedidos}
        renderItem={renderPedido}
        keyExtractor={(item) => item.id_pedido.toString()}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={cargarPedidos} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tienes pedidos realizados</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    paddingTop: 15,
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
    alignItems: 'center',
    marginBottom: 10,
  },
  pedidoId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  estadoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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



