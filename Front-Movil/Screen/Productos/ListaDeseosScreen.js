import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import listaDeseosService from '../../src/service/ListaDeseosService';
import { useAuth } from '../../src/context/AuthContext';
import { API_BASE_URL } from '../../src/service/conexion';

export default function ListaDeseosScreen({ navigation }) {
  const { user, isConsumidor } = useAuth();
  const [listaDeseos, setListaDeseos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarListaDeseos();
  }, []);

  // Recargar cuando la pantalla recibe foco
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (isConsumidor()) {
        cargarListaDeseos();
      }
    });
    return unsubscribe;
  }, [navigation, isConsumidor]);

  const cargarListaDeseos = async () => {
    if (!isConsumidor()) {
      return;
    }

    setLoading(true);
    try {
      const response = await listaDeseosService.getListaDeseos();
      if (response.success) {
        setListaDeseos(response.listaDeseos || []);
      } else {
        setListaDeseos([]);
      }
    } catch (error) {
      console.error('Error al cargar lista de deseos:', error);
      setListaDeseos([]);
    } finally {
      setLoading(false);
    }
  };

  const eliminarDeListaDeseos = async (item) => {
    Alert.alert(
      'Eliminar de lista de deseos',
      `¿Deseas eliminar "${item.nombre_producto}" de tu lista de deseos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Intentar eliminar por ID de lista primero
              if (item.id_lista) {
                const response = await listaDeseosService.eliminarDeListaDeseos(item.id_lista);
                if (response.success) {
                  cargarListaDeseos();
                } else {
                  // Si falla, intentar por ID de producto
                  await listaDeseosService.eliminarProductoDeListaDeseos(item.id_producto);
                  cargarListaDeseos();
                }
              } else {
                // Eliminar por ID de producto
                await listaDeseosService.eliminarProductoDeListaDeseos(item.id_producto);
                cargarListaDeseos();
              }
            } catch (error) {
              console.error('Error al eliminar de lista de deseos:', error);
              Alert.alert('Error', 'No se pudo eliminar el producto de la lista de deseos');
            }
          },
        },
      ]
    );
  };

  const limpiarListaDeseos = async () => {
    if (listaDeseos.length === 0) {
      return;
    }

    Alert.alert(
      'Limpiar lista de deseos',
      '¿Estás seguro de que deseas eliminar todos los productos de tu lista de deseos?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await listaDeseosService.limpiarListaDeseos();
              if (response.success) {
                setListaDeseos([]);
                Alert.alert('Éxito', 'Lista de deseos limpiada');
              } else {
                Alert.alert('Error', response.message || 'No se pudo limpiar la lista de deseos');
              }
            } catch (error) {
              console.error('Error al limpiar lista de deseos:', error);
              Alert.alert('Error', 'No se pudo limpiar la lista de deseos');
            }
          },
        },
      ]
    );
  };

  const construirUrlImagen = (imagenPath) => {
    if (!imagenPath) return null;
    if (imagenPath.startsWith('http://') || imagenPath.startsWith('https://')) {
      return imagenPath;
    }
    const rutaNormalizada = imagenPath.replace(/\\/g, '/');
    const rutaLimpia = rutaNormalizada.startsWith('/') ? rutaNormalizada.substring(1) : rutaNormalizada;
    return `${API_BASE_URL}/${rutaLimpia}`;
  };

  const renderItem = ({ item }) => {
    const imagenUrl = construirUrlImagen(item.imagen_principal);

    return (
      <TouchableOpacity
        style={styles.productoCard}
        onPress={() => navigation.navigate('ProductoDetalle', { productoId: item.id_producto })}
      >
        {imagenUrl ? (
          <Image source={{ uri: imagenUrl }} style={styles.productoImagen} />
        ) : (
          <View style={[styles.productoImagen, styles.productoImagenPlaceholder]}>
            <Ionicons name="image-outline" size={40} color="#ccc" />
          </View>
        )}
        <View style={styles.productoInfo}>
          <Text style={styles.productoNombre}>{item.nombre_producto}</Text>
          {item.descripcion_producto && (
            <Text style={styles.productoDescripcion} numberOfLines={2}>
              {item.descripcion_producto}
            </Text>
          )}
          <View style={styles.productoFooter}>
            <Text style={styles.productoPrecio}>${parseFloat(item.precio || 0).toLocaleString()}</Text>
            {item.stock !== null && (
              <Text style={styles.productoStock}>Stock: {item.stock}</Text>
            )}
          </View>
          {item.categoria_nombre && (
            <View style={styles.categoriaBadge}>
              <Ionicons name="pricetag-outline" size={12} color="#666" />
              <Text style={styles.categoriaText}>{item.categoria_nombre}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.eliminarButton}
          onPress={(e) => {
            e.stopPropagation();
            eliminarDeListaDeseos(item);
          }}
        >
          <Ionicons name="heart" size={24} color="#dc3545" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (!isConsumidor()) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Solo los consumidores pueden usar la lista de deseos</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="heart" size={28} color="#dc3545" />
          <Text style={styles.headerTitle}>Mi Lista de Deseos</Text>
        </View>
        {listaDeseos.length > 0 && (
          <TouchableOpacity
            style={styles.limpiarButton}
            onPress={limpiarListaDeseos}
          >
            <Ionicons name="trash-outline" size={20} color="#d32f2f" />
            <Text style={styles.limpiarButtonText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Lista de productos */}
      <FlatList
        data={listaDeseos}
        renderItem={renderItem}
        keyExtractor={(item) => `deseo-${item.id_lista || item.id_producto}`}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={cargarListaDeseos} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Tu lista de deseos está vacía</Text>
            <Text style={styles.emptySubtext}>
              Agrega productos a tu lista de deseos desde la página de detalle del producto
            </Text>
            <TouchableOpacity
              style={styles.explorarButton}
              onPress={() => navigation.navigate('Productos')}
            >
              <Text style={styles.explorarButtonText}>Explorar Productos</Text>
            </TouchableOpacity>
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
  header: {
    backgroundColor: '#fff',
    padding: 15,
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  limpiarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ffebee',
    gap: 6,
  },
  limpiarButtonText: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 15,
  },
  productoCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    flexDirection: 'row',
    elevation: 2,
    overflow: 'hidden',
  },
  productoImagen: {
    width: 120,
    height: 120,
    backgroundColor: '#ddd',
  },
  productoImagenPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  productoInfo: {
    flex: 1,
    padding: 15,
    justifyContent: 'space-between',
  },
  productoNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  productoDescripcion: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  productoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productoPrecio: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  productoStock: {
    fontSize: 14,
    color: '#666',
  },
  categoriaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  categoriaText: {
    fontSize: 12,
    color: '#666',
  },
  eliminarButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
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
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  explorarButton: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  explorarButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});


