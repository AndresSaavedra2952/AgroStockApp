import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import estadisticasService from '../../src/service/EstadisticasService';
import productosService from '../../src/service/ProductosService';
import pedidosService from '../../src/service/PedidosService';
import { Ionicons } from '@expo/vector-icons';

export default function EstadisticasScreen() {
  const { user } = useAuth();
  const [estadisticas, setEstadisticas] = useState(null);
  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Cargar datos en paralelo
      const [estadisticasRes, productosRes, pedidosRes] = await Promise.all([
        estadisticasService.getEstadisticasVentas().catch(() => ({ success: false, data: null })),
        productosService.getProductosPorUsuario(user?.id).catch(() => ({ success: false, data: [] })),
        pedidosService.getPedidosRecibidos().catch(() => ({ success: false, data: [] })),
      ]);

      if (estadisticasRes.success) {
        setEstadisticas(estadisticasRes.data);
      }

      if (productosRes.success) {
        setProductos(productosRes.data || []);
      }

      if (pedidosRes.success) {
        setPedidos(pedidosRes.data || []);
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Estadísticas de productos
  const totalProductos = productos.length;
  const productosActivos = productos.filter(p => p.disponible).length;
  const productosInactivos = totalProductos - productosActivos;
  const productosStockBajo = productos.filter(p => 
    p.stock !== null && p.stock_minimo !== null && p.stock <= p.stock_minimo && p.stock > 0
  ).length;
  const productosAgotados = productos.filter(p => p.stock === 0 || p.stock === null).length;
  const porcentajeActivos = totalProductos > 0 
    ? Math.round((productosActivos / totalProductos) * 100) 
    : 0;

  // Estadísticas de pedidos
  const totalPedidos = pedidos.length;
  const pedidosPendientes = pedidos.filter(p => p.estado === 'pendiente').length;
  const pedidosConfirmados = pedidos.filter(p => p.estado === 'confirmado').length;
  const pedidosEnPreparacion = pedidos.filter(p => p.estado === 'en_preparacion').length;
  const pedidosEnCamino = pedidos.filter(p => p.estado === 'en_camino').length;
  const pedidosEntregados = pedidos.filter(p => p.estado === 'entregado').length;
  const pedidosCancelados = pedidos.filter(p => p.estado === 'cancelado').length;

  // Estadísticas financieras
  const totalVentas = pedidos
    .filter(p => p.estado === 'entregado' && p.total)
    .reduce((sum, p) => sum + (Number(p.total) || 0), 0);
  
  const ventasPendientes = pedidos
    .filter(p => ['pendiente', 'confirmado', 'en_preparacion', 'en_camino'].includes(p.estado) && p.total)
    .reduce((sum, p) => sum + (Number(p.total) || 0), 0);

  const promedioPedido = pedidosEntregados > 0 
    ? totalVentas / pedidosEntregados 
    : 0;

  // Calcular tasa de entrega
  const tasaEntrega = totalPedidos > 0 
    ? Math.round((pedidosEntregados / totalPedidos) * 100) 
    : 0;

  // Pedidos últimos 30 días
  const ahora = new Date();
  const hace30Dias = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
  const pedidosUltimos30Dias = pedidos.filter(p => {
    const fechaPedido = new Date(p.fecha_pedido || p.fecha_creacion || 0);
    return fechaPedido >= hace30Dias;
  }).length;

  const ventasUltimos30Dias = pedidos
    .filter(p => {
      const fechaPedido = new Date(p.fecha_pedido || p.fecha_creacion || 0);
      return fechaPedido >= hace30Dias && p.estado === 'entregado' && p.total;
    })
    .reduce((sum, p) => sum + (Number(p.total) || 0), 0);

  const StatCard = ({ icon, title, value, color = '#2e7d32', subtitle }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statCardHeader}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={styles.statCardTitle}>{title}</Text>
      </View>
      <Text style={[styles.statCardValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statCardSubtitle}>{subtitle}</Text>}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={cargarDatos} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Estadísticas</Text>
        <Text style={styles.subtitle}>Resumen de tu actividad</Text>
      </View>

      {/* Estadísticas de Productos */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="cube-outline" size={24} color="#2e7d32" />
          <Text style={styles.sectionTitle}>Productos</Text>
        </View>
        <View style={styles.statsGrid}>
          <StatCard
            icon="cube"
            title="Total"
            value={totalProductos}
            color="#2e7d32"
          />
          <StatCard
            icon="checkmark-circle"
            title="Activos"
            value={productosActivos}
            color="#2e7d32"
            subtitle={`${porcentajeActivos}%`}
          />
          <StatCard
            icon="alert-circle"
            title="Stock Bajo"
            value={productosStockBajo}
            color="#fbc02d"
          />
          <StatCard
            icon="close-circle"
            title="Agotados"
            value={productosAgotados}
            color="#f57c00"
          />
        </View>
      </View>

      {/* Estadísticas de Pedidos */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="receipt-outline" size={24} color="#2196f3" />
          <Text style={styles.sectionTitle}>Pedidos</Text>
        </View>
        <View style={styles.statsGrid}>
          <StatCard
            icon="receipt"
            title="Total"
            value={totalPedidos}
            color="#2196f3"
          />
          <StatCard
            icon="time"
            title="Pendientes"
            value={pedidosPendientes}
            color="#fbc02d"
          />
          <StatCard
            icon="construct"
            title="En Proceso"
            value={pedidosEnPreparacion + pedidosEnCamino}
            color="#9c27b0"
          />
          <StatCard
            icon="checkmark-done-circle"
            title="Entregados"
            value={pedidosEntregados}
            color="#2e7d32"
            subtitle={`${tasaEntrega}%`}
          />
        </View>

        {/* Desglose de estados */}
        <View style={styles.detalleEstados}>
          <View style={styles.estadoRow}>
            <View style={styles.estadoItem}>
              <View style={[styles.estadoDot, { backgroundColor: '#fbc02d' }]} />
              <Text style={styles.estadoLabel}>Pendientes: {pedidosPendientes}</Text>
            </View>
            <View style={styles.estadoItem}>
              <View style={[styles.estadoDot, { backgroundColor: '#2196f3' }]} />
              <Text style={styles.estadoLabel}>Confirmados: {pedidosConfirmados}</Text>
            </View>
          </View>
          <View style={styles.estadoRow}>
            <View style={styles.estadoItem}>
              <View style={[styles.estadoDot, { backgroundColor: '#9c27b0' }]} />
              <Text style={styles.estadoLabel}>En Preparación: {pedidosEnPreparacion}</Text>
            </View>
            <View style={styles.estadoItem}>
              <View style={[styles.estadoDot, { backgroundColor: '#ff9800' }]} />
              <Text style={styles.estadoLabel}>En Camino: {pedidosEnCamino}</Text>
            </View>
          </View>
          <View style={styles.estadoRow}>
            <View style={styles.estadoItem}>
              <View style={[styles.estadoDot, { backgroundColor: '#2e7d32' }]} />
              <Text style={styles.estadoLabel}>Entregados: {pedidosEntregados}</Text>
            </View>
            <View style={styles.estadoItem}>
              <View style={[styles.estadoDot, { backgroundColor: '#d32f2f' }]} />
              <Text style={styles.estadoLabel}>Cancelados: {pedidosCancelados}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Estadísticas Financieras */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="cash-outline" size={24} color="#4caf50" />
          <Text style={styles.sectionTitle}>Finanzas</Text>
        </View>
        <View style={styles.statsGrid}>
          <StatCard
            icon="cash"
            title="Ventas Totales"
            value={`$${totalVentas.toLocaleString()}`}
            color="#4caf50"
            subtitle={pedidosEntregados > 0 ? `${pedidosEntregados} pedidos` : 'Sin ventas'}
          />
          <StatCard
            icon="time-outline"
            title="Pendientes"
            value={`$${ventasPendientes.toLocaleString()}`}
            color="#fbc02d"
          />
          <StatCard
            icon="trending-up"
            title="Promedio"
            value={`$${Math.round(promedioPedido).toLocaleString()}`}
            color="#2196f3"
            subtitle="por pedido"
          />
          <StatCard
            icon="calendar"
            title="Últimos 30 días"
            value={pedidosUltimos30Dias}
            color="#9c27b0"
            subtitle={`$${ventasUltimos30Dias.toLocaleString()}`}
          />
        </View>
      </View>

      {/* Resumen */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="stats-chart-outline" size={24} color="#666" />
          <Text style={styles.sectionTitle}>Resumen</Text>
        </View>
        <View style={styles.resumenCard}>
          <View style={styles.resumenItem}>
            <Text style={styles.resumenLabel}>Tasa de Entrega</Text>
            <Text style={styles.resumenValue}>{tasaEntrega}%</Text>
          </View>
          <View style={styles.resumenItem}>
            <Text style={styles.resumenLabel}>Productos Activos</Text>
            <Text style={styles.resumenValue}>{porcentajeActivos}%</Text>
          </View>
          <View style={styles.resumenItem}>
            <Text style={styles.resumenLabel}>Pedidos este mes</Text>
            <Text style={styles.resumenValue}>{pedidosUltimos30Dias}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
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
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    width: '48%',
    marginBottom: 12,
    elevation: 2,
    borderLeftWidth: 4,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statCardTitle: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    fontWeight: '600',
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statCardSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  detalleEstados: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
    elevation: 2,
  },
  estadoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  estadoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  estadoDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  estadoLabel: {
    fontSize: 14,
    color: '#666',
  },
  resumenCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
  },
  resumenItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resumenLabel: {
    fontSize: 16,
    color: '#666',
  },
  resumenValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
});
