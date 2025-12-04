import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import pedidosService from '../../src/service/PedidosService';
import { API_BASE_URL } from '../../src/service/ApiService';

export default function PedidoDetalleScreen({ route, navigation }) {
  const { pedidoId } = route.params;
  const [pedido, setPedido] = useState(null);
  const [detalles, setDetalles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDetallePedido();
  }, [pedidoId]);

  const cargarDetallePedido = async () => {
    setLoading(true);
    try {
      const response = await pedidosService.getPedidoPorId(pedidoId);
      if (response.success) {
        setPedido(response.data);
        if (response.data.detalles) {
          setDetalles(response.data.detalles);
        }
      } else {
        Alert.alert('Error', response.message || 'No se pudo cargar el pedido');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error al cargar detalle del pedido:', error);
      Alert.alert('Error', 'No se pudo cargar el pedido');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'comprado':
      case 'entregado':
        return '#4caf50';
      case 'confirmado':
        return '#2196f3';
      case 'en_preparacion':
        return '#ff9800';
      case 'en_camino':
        return '#9c27b0';
      case 'pendiente':
        return '#ff9800';
      case 'cancelado':
        return '#f44336';
      default:
        return '#666';
    }
  };

  const getEstadoPagoColor = (estado) => {
    switch (estado) {
      case 'pagado':
        return '#4caf50';
      case 'pendiente':
        return '#ff9800';
      case 'reembolsado':
        return '#f44336';
      default:
        return '#666';
    }
  };

  const getMetodoPagoTexto = (metodo) => {
    const metodos = {
      efectivo: 'Efectivo',
      transferencia: 'Transferencia',
      nequi: 'Nequi',
      daviplata: 'Daviplata',
      pse: 'PSE',
      tarjeta: 'Tarjeta',
    };
    return metodos[metodo] || metodo;
  };

  const formatFecha = (fecha) => {
    if (!fecha) return 'No especificada';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2e7d32" />
          <Text style={styles.loadingText}>Cargando pedido...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!pedido) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Pedido no encontrado</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.pedidoId}>Pedido #{pedido.id_pedido}</Text>
          <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(pedido.estado) }]}>
            <Text style={styles.estadoText}>{pedido.estado?.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Pedido</Text>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.infoText}>Fecha: {formatFecha(pedido.fecha_pedido)}</Text>
          </View>
          {pedido.fecha_entrega && (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.infoText}>Entrega estimada: {formatFecha(pedido.fecha_entrega)}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Productos</Text>
          {detalles && detalles.length > 0 ? (
            detalles.map((detalle, index) => {
              const imagenUrl = detalle.producto_imagen
                ? detalle.producto_imagen.startsWith('http')
                  ? detalle.producto_imagen
                  : `${API_BASE_URL}/${detalle.producto_imagen.replace(/^\/+/, '')}`
                : null;

              return (
                <View key={detalle.id_detalle || index} style={styles.productoCard}>
                  {imagenUrl && (
                    <Image source={{ uri: imagenUrl }} style={styles.productoImagen} />
                  )}
                  <View style={styles.productoInfo}>
                    <Text style={styles.productoNombre}>
                      {detalle.producto_nombre || 'Producto'}
                    </Text>
                    <Text style={styles.productoCantidad}>
                      Cantidad: {detalle.cantidad} {detalle.unidad_medida || 'unidad(es)'}
                    </Text>
                    <Text style={styles.productoPrecio}>
                      ${detalle.precio_unitario?.toLocaleString()} x {detalle.cantidad}
                    </Text>
                    <Text style={styles.productoSubtotal}>
                      Subtotal: ${detalle.subtotal?.toLocaleString()}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No hay productos en este pedido</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de Entrega</Text>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <Text style={styles.infoText}>{pedido.direccion_entrega}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de Pago</Text>
          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              Método: {getMetodoPagoTexto(pedido.metodo_pago)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle-outline" size={20} color={getEstadoPagoColor(pedido.estado_pago)} />
            <Text style={[styles.infoText, { color: getEstadoPagoColor(pedido.estado_pago) }]}>
              Estado: {pedido.estado_pago?.toUpperCase() || 'PENDIENTE'}
            </Text>
          </View>
        </View>

        {pedido.notas && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notas</Text>
            <Text style={styles.notasText}>{pedido.notas}</Text>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total del Pedido</Text>
            <Text style={styles.totalAmount}>${pedido.total?.toLocaleString()}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
  },
  pedidoId: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  estadoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    flex: 1,
  },
  productoCard: {
    flexDirection: 'row',
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  productoImagen: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
  },
  productoInfo: {
    flex: 1,
  },
  productoNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  productoCantidad: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  productoPrecio: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  productoSubtotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginTop: 5,
  },
  notasText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
});

