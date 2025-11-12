import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import api from '../../src/service/ApiService';

export default function AlertasStockScreen() {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarAlertas();
  }, []);

  const cargarAlertas = async () => {
    setLoading(true);
    try {
      const response = await api.get('/alertas/stock-bajo');
      if (response.data.success) {
        setAlertas(response.data.data || []);
      }
    } catch (error) {
      console.error('Error al cargar alertas:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderAlerta = ({ item }) => (
    <View style={styles.alertaCard}>
      <Text style={styles.alertaProducto}>{item.nombre_producto || 'Producto'}</Text>
      <Text style={styles.alertaMensaje}>{item.mensaje}</Text>
      <Text style={styles.alertaStock}>Stock actual: {item.stock_actual}</Text>
      <Text style={styles.alertaFecha}>
        {new Date(item.fecha).toLocaleDateString()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={alertas}
        renderItem={renderAlerta}
        keyExtractor={(item, index) => item.id_alerta?.toString() || index.toString()}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={cargarAlertas} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay alertas de stock bajo</Text>
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
  alertaCard: {
    backgroundColor: '#fff3cd',
    padding: 15,
    marginBottom: 10,
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  alertaProducto: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  alertaMensaje: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  alertaStock: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d32f2f',
    marginBottom: 5,
  },
  alertaFecha: {
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



