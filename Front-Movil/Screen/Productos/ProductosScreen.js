import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import productosService from '../../src/service/ProductosService';
import categoriasService from '../../src/service/CategoriasService';
import { useAuth } from '../../src/context/AuthContext';
import useCart from '../../src/hooks/useCart';
import useNotifications from '../../src/hooks/useNotifications';

export default function ProductosScreen({ navigation, route }) {
  const { isConsumidor, isAuthenticated } = useAuth();
  const { cantidadItems, refrescar } = useCart();
  const { totalNoLeidas, refrescar: refrescarNotificaciones } = useNotifications();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState(null);
  const [loading, setLoading] = useState(false);
  const categoriaId = route?.params?.categoriaId;

  // Recargar carrito y notificaciones cuando la pantalla recibe foco
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // No recargar automáticamente para evitar demasiadas solicitudes
      // El hook useCart ya maneja las actualizaciones automáticas
      if (isAuthenticated()) {
        refrescarNotificaciones();
      }
    });
    return unsubscribe;
  }, [navigation, isAuthenticated]);

  useEffect(() => {
    cargarCategorias();
    if (categoriaId) {
      setCategoriaFiltro(categoriaId);
      cargarProductosPorCategoria(categoriaId);
    } else {
      cargarProductos();
    }
  }, []);

  const cargarCategorias = async () => {
    try {
      const response = await categoriasService.getCategorias();
      if (response.success) {
        setCategorias(response.data || []);
      }
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const cargarProductos = async () => {
    setLoading(true);
    try {
      const response = await productosService.getProductos({ disponible: true });
      if (response.success) {
        setProductos(response.data || []);
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarProductosPorCategoria = async (idCategoria) => {
    setLoading(true);
    try {
      const response = await categoriasService.getProductosPorCategoria(idCategoria);
      if (response.success) {
        setProductos(response.data || []);
      }
    } catch (error) {
      console.error('Error al cargar productos por categoría:', error);
    } finally {
      setLoading(false);
    }
  };

  const buscarProductos = async () => {
    if (!busqueda.trim()) {
      cargarProductos();
      return;
    }

    setLoading(true);
    try {
      const response = await productosService.buscarProductos(busqueda);
      if (response.success) {
        setProductos(response.data || []);
      }
    } catch (error) {
      console.error('Error al buscar productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderProducto = ({ item }) => (
    <TouchableOpacity
      style={styles.productoCard}
      onPress={() => navigation.navigate('ProductoDetalle', { productoId: item.id_producto })}
    >
      {item.imagenUrl && (
        <Image source={{ uri: item.imagenUrl }} style={styles.productoImagen} />
      )}
      <View style={styles.productoInfo}>
        <Text style={styles.productoNombre}>{item.nombre}</Text>
        <Text style={styles.productoDescripcion} numberOfLines={2}>
          {item.descripcion}
        </Text>
        <View style={styles.productoFooter}>
          <Text style={styles.productoPrecio}>${item.precio?.toLocaleString()}</Text>
          <Text style={styles.productoStock}>Stock: {item.stock}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Botón de notificaciones - Solo si está autenticado */}
      {isAuthenticated() && (
        <View style={styles.notificacionesContainer}>
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
      )}

      <View style={styles.header}>
        <TextInput
          style={styles.busqueda}
          placeholder="Buscar productos..."
          value={busqueda}
          onChangeText={setBusqueda}
          onSubmitEditing={buscarProductos}
        />
        <TouchableOpacity style={styles.buscarButton} onPress={buscarProductos}>
          <Text style={styles.buscarButtonText}>Buscar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={productos}
        renderItem={renderProducto}
        keyExtractor={(item) => item.id_producto.toString()}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={cargarProductos} />}
        contentContainerStyle={styles.list}
      />

      {/* Botón flotante de carrito - Solo para consumidores */}
      {isConsumidor() && (
        <TouchableOpacity
          style={styles.carritoButton}
          onPress={() => navigation.navigate('Carrito')}
        >
          <Ionicons name="cart" size={24} color="#fff" />
          {cantidadItems > 0 && (
            <View style={styles.carritoBadge}>
              <Text style={styles.carritoBadgeText}>
                {cantidadItems > 99 ? '99+' : cantidadItems}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  notificacionesContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 5,
    alignItems: 'flex-end',
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
  header: {
    padding: 15,
    paddingTop: 10,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
  },
  busqueda: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 10,
    marginRight: 10,
  },
  buscarButton: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buscarButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  list: {
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
    marginBottom: 10,
  },
  productoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  carritoButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2e7d32',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  carritoBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#d32f2f',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  carritoBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});



