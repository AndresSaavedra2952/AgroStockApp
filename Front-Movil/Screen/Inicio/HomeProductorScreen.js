import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import productosService from '../../src/service/ProductosService';
import pedidosService from '../../src/service/PedidosService';
import useNotifications from '../../src/hooks/useNotifications';

export default function HomeProductorScreen({ navigation }) {
  const { user } = useAuth();
  const { totalNoLeidas, refrescar: refrescarNotificaciones } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [estadisticas, setEstadisticas] = useState({
    totalProductos: 0,
    productosActivos: 0,
    productosStockBajo: 0,
    productosAgotados: 0,
    pedidosPendientes: 0,
    pedidosHoy: 0,
  });

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  // Recargar cuando la pantalla recibe foco
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      cargarEstadisticas();
      refrescarNotificaciones();
    });
    return unsubscribe;
  }, [navigation]);

  const cargarEstadisticas = async () => {
    setLoading(true);
    try {
      // Cargar productos del productor
      const productosResponse = await productosService.getProductosPorUsuario(user?.id);
      if (productosResponse.success) {
        const productos = productosResponse.data || [];
        const productosActivos = productos.filter(p => p.disponible).length;
        const productosStockBajo = productos.filter(p => 
          p.stock !== null && p.stock_minimo !== null && p.stock <= p.stock_minimo && p.stock > 0
        ).length;
        const productosAgotados = productos.filter(p => p.stock === 0 || p.stock === null).length;

        // Cargar pedidos
        let pedidosPendientes = 0;
        let pedidosHoy = 0;
        try {
          const pedidosResponse = await pedidosService.getPedidosRecibidos();
          if (pedidosResponse.success) {
            const pedidos = pedidosResponse.data || [];
            pedidosPendientes = pedidos.filter(p => 
              p.estado === 'pendiente' || p.estado === 'confirmado'
            ).length;
            
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            pedidosHoy = pedidos.filter(p => {
              const fechaPedido = new Date(p.fecha);
              fechaPedido.setHours(0, 0, 0, 0);
              return fechaPedido.getTime() === hoy.getTime();
            }).length;
          }
        } catch (error) {
          console.error('Error al cargar pedidos:', error);
        }

        setEstadisticas({
          totalProductos: productos.length,
          productosActivos,
          productosStockBajo,
          productosAgotados,
          pedidosPendientes,
          pedidosHoy,
        });
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={cargarEstadisticas} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header con notificaciones */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>¡Hola, {user?.nombre?.split(' ')[0] || 'Productor'}!</Text>
            <Text style={styles.subtitle}>Bienvenido a tu panel de control</Text>
          </View>
          <TouchableOpacity
            style={styles.notificacionesButton}
            onPress={() => {
              navigation.navigate('Notificaciones');
              refrescarNotificaciones();
            }}
          >
            <Ionicons name="notifications-outline" size={24} color="#333" />
            {totalNoLeidas > 0 && (
              <View style={styles.notificacionesBadge}>
                <Text style={styles.notificacionesBadgeText}>
                  {totalNoLeidas > 99 ? '99+' : totalNoLeidas}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Estadísticas rápidas */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Resumen Rápido</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#e3f2fd' }]}>
                <Ionicons name="cube" size={24} color="#2196f3" />
              </View>
              <Text style={styles.statValue}>{estadisticas.totalProductos}</Text>
              <Text style={styles.statLabel}>Productos</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#e8f5e9' }]}>
                <Ionicons name="checkmark-circle" size={24} color="#2e7d32" />
              </View>
              <Text style={styles.statValue}>{estadisticas.productosActivos}</Text>
              <Text style={styles.statLabel}>Activos</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#fff3e0' }]}>
                <Ionicons name="warning" size={24} color="#ff9800" />
              </View>
              <Text style={styles.statValue}>{estadisticas.productosStockBajo}</Text>
              <Text style={styles.statLabel}>Stock Bajo</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#ffebee' }]}>
                <Ionicons name="alert-circle" size={24} color="#f44336" />
              </View>
              <Text style={styles.statValue}>{estadisticas.productosAgotados}</Text>
              <Text style={styles.statLabel}>Agotados</Text>
            </View>
          </View>
        </View>

        {/* Pedidos */}
        <View style={styles.pedidosSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="receipt" size={24} color="#333" />
            <Text style={styles.sectionTitle}>Pedidos</Text>
          </View>
          <View style={styles.pedidosGrid}>
            <TouchableOpacity
              style={styles.pedidoCard}
              onPress={() => navigation.navigate('PedidosRecibidos')}
            >
              <View style={styles.pedidoCardContent}>
                <Ionicons name="time-outline" size={32} color="#ff9800" />
                <Text style={styles.pedidoValue}>{estadisticas.pedidosPendientes}</Text>
                <Text style={styles.pedidoLabel}>Pendientes</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pedidoCard}
              onPress={() => navigation.navigate('PedidosRecibidos')}
            >
              <View style={styles.pedidoCardContent}>
                <Ionicons name="today-outline" size={32} color="#2196f3" />
                <Text style={styles.pedidoValue}>{estadisticas.pedidosHoy}</Text>
                <Text style={styles.pedidoLabel}>Hoy</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Acciones rápidas */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('MisProductos')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#e8f5e9' }]}>
                <Ionicons name="cube-outline" size={28} color="#2e7d32" />
              </View>
              <Text style={styles.actionText}>Mis Productos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Productos')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#e3f2fd' }]}>
                <Ionicons name="storefront-outline" size={28} color="#2196f3" />
              </View>
              <Text style={styles.actionText}>Ver Todos los Productos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('PedidosRecibidos')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#fff3e0' }]}>
                <Ionicons name="list-outline" size={28} color="#ff9800" />
              </View>
              <Text style={styles.actionText}>Pedidos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Estadisticas')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#f3e5f5' }]}>
                <Ionicons name="stats-chart-outline" size={28} color="#9c27b0" />
              </View>
              <Text style={styles.actionText}>Estadísticas</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Alertas importantes */}
        {(estadisticas.productosStockBajo > 0 || estadisticas.productosAgotados > 0) && (
          <View style={styles.alertasSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="alert-circle" size={24} color="#f44336" />
              <Text style={styles.sectionTitle}>Alertas</Text>
            </View>
            {estadisticas.productosStockBajo > 0 && (
              <TouchableOpacity
                style={[styles.alertaCard, { backgroundColor: '#fff3e0' }]}
                onPress={() => navigation.navigate('AlertasStock')}
              >
                <Ionicons name="warning" size={24} color="#ff9800" />
                <View style={styles.alertaContent}>
                  <Text style={styles.alertaTitle}>Stock Bajo</Text>
                  <Text style={styles.alertaText}>
                    {estadisticas.productosStockBajo} producto(s) con stock bajo
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ff9800" />
              </TouchableOpacity>
            )}
            {estadisticas.productosAgotados > 0 && (
              <TouchableOpacity
                style={[styles.alertaCard, { backgroundColor: '#ffebee' }]}
                onPress={() => navigation.navigate('MisProductos')}
              >
                <Ionicons name="close-circle" size={24} color="#f44336" />
                <View style={styles.alertaContent}>
                  <Text style={styles.alertaTitle}>Productos Agotados</Text>
                  <Text style={styles.alertaText}>
                    {estadisticas.productosAgotados} producto(s) sin stock
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#f44336" />
              </TouchableOpacity>
            )}
          </View>
        )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  notificacionesButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificacionesBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#d32f2f',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  notificacionesBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  statsSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  pedidosSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  pedidosGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  pedidoCard: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
  },
  pedidoCardContent: {
    alignItems: 'center',
  },
  pedidoValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  pedidoLabel: {
    fontSize: 14,
    color: '#666',
  },
  actionsSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  alertasSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 10,
    marginBottom: 20,
  },
  alertaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  alertaContent: {
    flex: 1,
  },
  alertaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  alertaText: {
    fontSize: 14,
    color: '#666',
  },
});


