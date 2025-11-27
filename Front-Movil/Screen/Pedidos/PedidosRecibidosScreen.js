import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import pedidosService from '../../src/service/PedidosService';
import mensajesService from '../../src/service/MensajesService';
import { Ionicons } from '@expo/vector-icons';

export default function PedidosRecibidosScreen({ navigation }) {
  const [pedidos, setPedidos] = useState([]);
  const [pedidosFiltrados, setPedidosFiltrados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [modalVisible, setModalVisible] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [actualizandoEstado, setActualizandoEstado] = useState(false);

  useEffect(() => {
    cargarPedidos();
  }, []);

  useEffect(() => {
    filtrarPedidos();
  }, [pedidos, filtroEstado]);

  const cargarPedidos = async () => {
    setLoading(true);
    try {
      const response = await pedidosService.getPedidosRecibidos();
      if (response.success) {
        setPedidos(response.data || []);
      } else {
        Alert.alert('Error', response.message || 'No se pudieron cargar los pedidos');
      }
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
      Alert.alert('Error', 'No se pudieron cargar los pedidos');
    } finally {
      setLoading(false);
    }
  };

  const filtrarPedidos = () => {
    if (filtroEstado === 'todos') {
      setPedidosFiltrados(pedidos);
    } else {
      setPedidosFiltrados(pedidos.filter(p => p.estado === filtroEstado));
    }
  };

  const getSiguienteEstado = (estadoActual) => {
    const estados = {
      'pendiente': 'confirmado',
      'confirmado': 'en_preparacion',
      'en_preparacion': 'en_camino',
      'en_camino': 'entregado',
    };
    return estados[estadoActual] || null;
  };

  const actualizarEstado = async (pedido, nuevoEstado) => {
    setActualizandoEstado(true);
    try {
      // Preparar los datos del pedido para actualizar
      const pedidoData = {
        id_pedido: pedido.id_pedido,
        id_consumidor: pedido.id_consumidor,
        id_productor: pedido.id_productor,
        total: pedido.total,
        estado: nuevoEstado,
        direccionEntrega: pedido.direccion_entrega || pedido.direccionEntrega,
        metodo_pago: pedido.metodo_pago,
        fecha: pedido.fecha_pedido || pedido.fecha,
        fecha_entrega_estimada: pedido.fecha_entrega || pedido.fecha_entrega_estimada,
        notas: pedido.notas || '',
      };

      const response = await pedidosService.actualizarEstadoPedido(pedido.id_pedido, pedidoData);
      if (response.success) {
        Alert.alert('Éxito', `Pedido actualizado a: ${nuevoEstado.replace('_', ' ')}`);
        setModalVisible(false);
        setPedidoSeleccionado(null);
        cargarPedidos();
      } else {
        Alert.alert('Error', response.message || 'No se pudo actualizar el pedido');
      }
    } catch (error) {
      console.error('Error actualizando estado:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado del pedido');
    } finally {
      setActualizandoEstado(false);
    }
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      pendiente: { color: '#fbc02d', text: 'Pendiente', icon: 'time-outline' },
      confirmado: { color: '#2196f3', text: 'Confirmado', icon: 'checkmark-circle-outline' },
      en_preparacion: { color: '#9c27b0', text: 'En Preparación', icon: 'construct-outline' },
      en_camino: { color: '#ff9800', text: 'En Camino', icon: 'car-outline' },
      entregado: { color: '#2e7d32', text: 'Entregado', icon: 'checkmark-done-circle' },
      cancelado: { color: '#d32f2f', text: 'Cancelado', icon: 'close-circle-outline' },
    };
    return badges[estado] || badges.pendiente;
  };

  const getMetodoPagoIcon = (metodo) => {
    const iconos = {
      efectivo: 'cash-outline',
      transferencia: 'card-outline',
      nequi: 'phone-portrait-outline',
      daviplata: 'phone-portrait-outline',
      pse: 'card-outline',
      tarjeta: 'card-outline',
    };
    return iconos[metodo] || 'card-outline';
  };

  const abrirDetallePedido = (pedido) => {
    setPedidoSeleccionado(pedido);
    setModalVisible(true);
  };

  const renderPedido = ({ item }) => {
    const estado = getEstadoBadge(item.estado);
    const siguienteEstado = getSiguienteEstado(item.estado);
    
    return (
      <TouchableOpacity
        style={styles.pedidoCard}
        onPress={() => abrirDetallePedido(item)}
      >
        <View style={styles.pedidoHeader}>
          <View style={styles.pedidoIdContainer}>
            <Ionicons name="receipt-outline" size={20} color="#2e7d32" />
            <Text style={styles.pedidoId}>Pedido #{item.id_pedido}</Text>
          </View>
          <View style={[styles.estadoBadge, { backgroundColor: estado.color + '20' }]}>
            <Ionicons name={estado.icon} size={14} color={estado.color} />
            <Text style={[styles.estadoText, { color: estado.color }]}>
              {estado.text}
            </Text>
          </View>
        </View>

        <View style={styles.pedidoInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              {item.fecha_pedido 
                ? new Date(item.fecha_pedido).toLocaleDateString('es-ES', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric' 
                  })
                : 'Fecha no disponible'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={16} color="#666" />
            <Text style={styles.pedidoTotal}>
              ${Number(item.total || 0).toLocaleString()}
            </Text>
          </View>

          {item.metodo_pago && (
            <View style={styles.infoRow}>
              <Ionicons name={getMetodoPagoIcon(item.metodo_pago)} size={16} color="#666" />
              <Text style={styles.infoText}>
                {item.metodo_pago.charAt(0).toUpperCase() + item.metodo_pago.slice(1)}
              </Text>
            </View>
          )}

          {item.direccion_entrega && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.infoText} numberOfLines={1}>
                {item.direccion_entrega}
              </Text>
            </View>
          )}
        </View>

        {siguienteEstado && (
          <TouchableOpacity
            style={[styles.accionButton, { backgroundColor: estado.color }]}
            onPress={(e) => {
              e.stopPropagation();
              const nuevoEstado = siguienteEstado;
              Alert.alert(
                'Cambiar Estado',
                `¿Deseas cambiar el estado del pedido a "${nuevoEstado.replace('_', ' ')}"?`,
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Confirmar',
                    onPress: () => actualizarEstado(item, nuevoEstado),
                  },
                ]
              );
            }}
          >
            <Text style={styles.accionButtonText}>
              Marcar como {siguienteEstado.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const pedidosPendientes = pedidos.filter(p => p.estado === 'pendiente').length;
  const pedidosEnProceso = pedidos.filter(p => 
    ['confirmado', 'en_preparacion', 'en_camino'].includes(p.estado)
  ).length;
  const pedidosEntregados = pedidos.filter(p => p.estado === 'entregado').length;

  return (
    <View style={styles.container}>
      {/* Header con estadísticas */}
      <View style={styles.header}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{pedidos.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#fbc02d' }]}>{pedidosPendientes}</Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#2196f3' }]}>{pedidosEnProceso}</Text>
            <Text style={styles.statLabel}>En Proceso</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#2e7d32' }]}>{pedidosEntregados}</Text>
            <Text style={styles.statLabel}>Entregados</Text>
          </View>
        </View>
      </View>

      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['todos', 'pendiente', 'confirmado', 'en_preparacion', 'en_camino', 'entregado'].map((estado) => {
            const isActive = filtroEstado === estado;
            return (
              <TouchableOpacity
                key={estado}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setFiltroEstado(estado)}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {estado === 'todos' ? 'Todos' : estado.replace('_', ' ').toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Lista de pedidos */}
      <FlatList
        data={pedidosFiltrados}
        renderItem={renderPedido}
        keyExtractor={(item) => item.id_pedido.toString()}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={cargarPedidos} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {filtroEstado !== 'todos' 
                ? `No hay pedidos con estado "${filtroEstado.replace('_', ' ')}"` 
                : 'No tienes pedidos recibidos'}
            </Text>
          </View>
        }
        contentContainerStyle={pedidosFiltrados.length === 0 ? styles.emptyList : null}
      />

      {/* Modal de detalle del pedido */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalVisible(false);
          setPedidoSeleccionado(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Pedido #{pedidoSeleccionado?.id_pedido}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setPedidoSeleccionado(null);
                }}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {pedidoSeleccionado && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detalleSection}>
                  <Text style={styles.detalleLabel}>Estado</Text>
                  {(() => {
                    const estado = getEstadoBadge(pedidoSeleccionado.estado);
                    return (
                      <View style={[styles.estadoBadge, { backgroundColor: estado.color + '20' }]}>
                        <Ionicons name={estado.icon} size={16} color={estado.color} />
                        <Text style={[styles.estadoText, { color: estado.color }]}>
                          {estado.text}
                        </Text>
                      </View>
                    );
                  })()}
                </View>

                <View style={styles.detalleSection}>
                  <Text style={styles.detalleLabel}>Fecha del Pedido</Text>
                  <Text style={styles.detalleValue}>
                    {pedidoSeleccionado.fecha_pedido 
                      ? new Date(pedidoSeleccionado.fecha_pedido).toLocaleString('es-ES')
                      : 'No disponible'}
                  </Text>
                </View>

                <View style={styles.detalleSection}>
                  <Text style={styles.detalleLabel}>Total</Text>
                  <Text style={[styles.detalleValue, styles.detalleTotal]}>
                    ${Number(pedidoSeleccionado.total || 0).toLocaleString()}
                  </Text>
                </View>

                {pedidoSeleccionado.metodo_pago && (
                  <View style={styles.detalleSection}>
                    <Text style={styles.detalleLabel}>Método de Pago</Text>
                    <View style={styles.detalleRow}>
                      <Ionicons 
                        name={getMetodoPagoIcon(pedidoSeleccionado.metodo_pago)} 
                        size={20} 
                        color="#2e7d32" 
                      />
                      <Text style={styles.detalleValue}>
                        {pedidoSeleccionado.metodo_pago.charAt(0).toUpperCase() + 
                         pedidoSeleccionado.metodo_pago.slice(1)}
                      </Text>
                    </View>
                  </View>
                )}

                {pedidoSeleccionado.direccion_entrega && (
                  <View style={styles.detalleSection}>
                    <Text style={styles.detalleLabel}>Dirección de Entrega</Text>
                    <View style={styles.detalleRow}>
                      <Ionicons name="location-outline" size={20} color="#2e7d32" />
                      <Text style={styles.detalleValue}>
                        {pedidoSeleccionado.direccion_entrega}
                      </Text>
                    </View>
                  </View>
                )}

                {pedidoSeleccionado.notas && (
                  <View style={styles.detalleSection}>
                    <Text style={styles.detalleLabel}>Notas</Text>
                    <Text style={styles.detalleValue}>{pedidoSeleccionado.notas}</Text>
                  </View>
                )}

                {getSiguienteEstado(pedidoSeleccionado.estado) && (
                  <TouchableOpacity
                    style={[styles.modalAccionButton, { backgroundColor: '#2e7d32' }]}
                    onPress={() => {
                      const nuevoEstado = getSiguienteEstado(pedidoSeleccionado.estado);
                      Alert.alert(
                        'Cambiar Estado',
                        `¿Deseas cambiar el estado del pedido a "${nuevoEstado.replace('_', ' ')}"?`,
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Confirmar',
                            onPress: () => actualizarEstado(pedidoSeleccionado, nuevoEstado),
                          },
                        ]
                      );
                    }}
                    disabled={actualizandoEstado}
                  >
                    <Text style={styles.modalAccionButtonText}>
                      {actualizandoEstado 
                        ? 'Actualizando...' 
                        : `Marcar como ${getSiguienteEstado(pedidoSeleccionado.estado).replace('_', ' ')}`}
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 6,
  },
  filterChipActive: {
    backgroundColor: '#2e7d32',
  },
  filterChipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  pedidoCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    marginHorizontal: 15,
    borderRadius: 10,
    elevation: 2,
    marginTop: 15,
  },
  pedidoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pedidoIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pedidoId: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  estadoText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'capitalize',
  },
  pedidoInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  pedidoTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginLeft: 8,
  },
  accionButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  accionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  detalleSection: {
    marginBottom: 20,
  },
  detalleLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  detalleValue: {
    fontSize: 16,
    color: '#333',
  },
  detalleTotal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  detalleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalAccionButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  modalAccionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
