import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import estadisticasService from '../../src/service/EstadisticasService';

export default function EstadisticasScreen() {
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    setLoading(true);
    try {
      const response = await estadisticasService.getEstadisticasVentas();
      if (response.success) {
        setEstadisticas(response.data);
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={cargarEstadisticas} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Estadísticas de Ventas</Text>
      </View>

      {estadisticas ? (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{estadisticas.total_productos || 0}</Text>
            <Text style={styles.statLabel}>Productos Totales</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{estadisticas.total_pedidos || 0}</Text>
            <Text style={styles.statLabel}>Pedidos Totales</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              ${(estadisticas.ventas_totales || 0).toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Ventas Totales</Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay estadísticas disponibles</Text>
        </View>
      )}
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsContainer: {
    padding: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    elevation: 2,
  },
  statValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 16,
    color: '#666',
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



