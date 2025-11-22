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
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import productosService from '../../src/service/ProductosService';
import { Ionicons } from '@expo/vector-icons';
import CrearProductoModal from '../../src/components/CrearProductoModal';
import EditarProductoModal from '../../src/components/EditarProductoModal';

export default function MisProductosScreen({ navigation }) {
  const [modalCrearVisible, setModalCrearVisible] = useState(false);
  const [modalEditarVisible, setModalEditarVisible] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const { user } = useAuth();
  const [productos, setProductos] = useState([]);
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos'); // todos, disponibles, no-disponibles, stock-bajo, agotados

  useEffect(() => {
    cargarProductos();
  }, []);

  useEffect(() => {
    filtrarProductos();
  }, [productos, busqueda, filtroEstado]);

  const cargarProductos = async () => {
    setLoading(true);
    try {
      const response = await productosService.getProductosPorUsuario(user?.id);
      if (response.success) {
        const productosConImagenes = (response.data || []).map(producto => {
          // Log para debugging
          console.log(`[MisProductosScreen] Producto: ${producto.nombre}`, {
            imagen_principal: producto.imagen_principal,
            imagenUrl: producto.imagenUrl,
            tieneImagen: !!(producto.imagen_principal || producto.imagenUrl)
          });
          return producto;
        });
        setProductos(productosConImagenes);
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
      Alert.alert('Error', 'No se pudieron cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  const filtrarProductos = () => {
    let filtrados = [...productos];

    // Filtrar por búsqueda
    if (busqueda.trim()) {
      filtrados = filtrados.filter(p =>
        p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    // Filtrar por estado
    switch (filtroEstado) {
      case 'activos':
        filtrados = filtrados.filter(p => p.disponible);
        break;
      case 'inactivos':
        filtrados = filtrados.filter(p => !p.disponible);
        break;
      case 'stock-bajo':
        filtrados = filtrados.filter(p => 
          p.stock !== null && 
          p.stock_minimo !== null && 
          p.stock <= p.stock_minimo && 
          p.stock > 0
        );
        break;
      case 'agotados':
        filtrados = filtrados.filter(p => p.stock === 0 || p.stock === null);
        break;
      default:
        break;
    }

    setProductosFiltrados(filtrados);
  };

  const eliminarProducto = (id) => {
    Alert.alert(
      'Eliminar Producto',
      '¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await productosService.eliminarProducto(id);
              if (response.success) {
                Alert.alert('Éxito', 'Producto eliminado correctamente');
                cargarProductos();
              } else {
                Alert.alert('Error', response.message || 'No se pudo eliminar el producto');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el producto');
            }
          },
        },
      ]
    );
  };

  const getEstadoBadge = (producto) => {
    if (!producto.disponible) {
      return { color: '#d32f2f', text: 'No disponible', icon: 'close-circle' };
    }
    if (producto.stock === 0 || producto.stock === null) {
      return { color: '#f57c00', text: 'Agotado', icon: 'warning' };
    }
    if (producto.stock_minimo && producto.stock <= producto.stock_minimo) {
      return { color: '#fbc02d', text: 'Stock Bajo', icon: 'alert-circle' };
    }
    return { color: '#2e7d32', text: 'Disponible', icon: 'checkmark-circle' };
  };

  const renderProducto = ({ item }) => {
    const estado = getEstadoBadge(item);
    
    // Construir URL de imagen: usar imagenUrl si está disponible, sino construir desde imagen_principal
    let imagenUrl = null;
    if (item.imagenUrl) {
      imagenUrl = item.imagenUrl;
    } else if (item.imagen_principal) {
      // Si solo tenemos la ruta relativa, construir la URL completa
      const API_BASE_URL = require('../../src/service/conexion').API_BASE_URL;
      // Normalizar la ruta (cambiar \ por /)
      const rutaNormalizada = item.imagen_principal.replace(/\\/g, '/');
      // Asegurarse de que no empiece con /
      const rutaLimpia = rutaNormalizada.startsWith('/') ? rutaNormalizada.substring(1) : rutaNormalizada;
      imagenUrl = `${API_BASE_URL}/${rutaLimpia}`;
    }
    
    return (
      <TouchableOpacity
        style={styles.productoCard}
        onPress={() => navigation.navigate('ProductoDetalle', { productoId: item.id_producto })}
      >
        {imagenUrl ? (
          <Image 
            source={{ uri: imagenUrl }} 
            style={styles.productoImagen}
            onError={(error) => {
              console.error('Error cargando imagen:', error.nativeEvent.error);
              console.error('URL intentada:', imagenUrl);
            }}
            onLoad={() => {
              console.log('✅ Imagen cargada exitosamente:', imagenUrl);
            }}
          />
        ) : (
          <View style={[styles.productoImagen, styles.productoImagenPlaceholder]}>
            <Ionicons name="image-outline" size={40} color="#ccc" />
          </View>
        )}
        <View style={styles.productoInfo}>
          <View style={styles.productoHeader}>
            <Text style={styles.productoNombre} numberOfLines={1}>{item.nombre}</Text>
            <View style={[styles.estadoBadge, { backgroundColor: estado.color + '20' }]}>
              <Ionicons name={estado.icon} size={14} color={estado.color} />
              <Text style={[styles.estadoText, { color: estado.color }]}>{estado.text}</Text>
            </View>
          </View>
          <Text style={styles.productoPrecio}>${Number(item.precio || 0).toLocaleString()}</Text>
          <View style={styles.productoDetalles}>
            <View style={styles.detalleItem}>
              <Ionicons name="cube-outline" size={16} color="#666" />
              <Text style={styles.detalleText}>Stock: {item.stock || 0}</Text>
            </View>
            {item.stock_minimo && (
              <View style={styles.detalleItem}>
                <Ionicons name="alert-outline" size={16} color="#666" />
                <Text style={styles.detalleText}>Mín: {item.stock_minimo}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              setProductoSeleccionado(item.id_producto);
              setModalEditarVisible(true);
            }}
            style={styles.actionButton}
          >
            <Ionicons name="pencil" size={20} color="#2196f3" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              eliminarProducto(item.id_producto);
            }}
            style={styles.actionButton}
          >
            <Ionicons name="trash" size={20} color="#d32f2f" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const productosActivos = productos.filter(p => p.disponible).length;
  const productosStockBajo = productos.filter(p => 
    p.stock !== null && p.stock_minimo !== null && p.stock <= p.stock_minimo && p.stock > 0
  ).length;
  const productosAgotados = productos.filter(p => p.stock === 0 || p.stock === null).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header con estadísticas */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Productos</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{productos.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#2e7d32' }]}>{productosActivos}</Text>
            <Text style={styles.statLabel}>Disponibles</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#fbc02d' }]}>{productosStockBajo}</Text>
            <Text style={styles.statLabel}>Stock Bajo</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#f57c00' }]}>{productosAgotados}</Text>
            <Text style={styles.statLabel}>Agotados</Text>
          </View>
        </View>
      </View>

      {/* Barra de búsqueda y filtros */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar productos..."
            value={busqueda}
            onChangeText={setBusqueda}
            placeholderTextColor="#999"
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {
            const filtros = ['todos', 'activos', 'inactivos', 'stock-bajo', 'agotados'];
            const currentIndex = filtros.indexOf(filtroEstado);
            setFiltroEstado(filtros[(currentIndex + 1) % filtros.length]);
          }}
        >
          <Ionicons name="filter" size={20} color="#2e7d32" />
          <Text style={styles.filterText}>
            {filtroEstado === 'todos' ? 'Todos' :
             filtroEstado === 'activos' ? 'Disponibles' :
             filtroEstado === 'inactivos' ? 'No disponibles' :
             filtroEstado === 'stock-bajo' ? 'Stock Bajo' : 'Agotados'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Botón agregar */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalCrearVisible(true)}
      >
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Agregar Producto</Text>
      </TouchableOpacity>

      {/* Lista de productos */}
      <FlatList
        data={productosFiltrados}
        renderItem={renderProducto}
        keyExtractor={(item) => item.id_producto.toString()}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={cargarProductos} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {busqueda || filtroEstado !== 'todos' 
                ? 'No se encontraron productos con estos filtros' 
                : 'No tienes productos registrados'}
            </Text>
            {productos.length === 0 && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => setModalCrearVisible(true)}
              >
                <Text style={styles.emptyButtonText}>Crear mi primer producto</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        contentContainerStyle={productosFiltrados.length === 0 ? styles.emptyList : null}
      />

      <CrearProductoModal
        visible={modalCrearVisible}
        onClose={() => setModalCrearVisible(false)}
        onSuccess={cargarProductos}
      />

      <EditarProductoModal
        visible={modalEditarVisible}
        onClose={() => {
          setModalEditarVisible(false);
          setProductoSeleccionado(null);
        }}
        productoId={productoSeleccionado}
        onSuccess={cargarProductos}
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
    paddingTop: 30,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statCard: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 15,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  filterText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#2e7d32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    margin: 15,
    borderRadius: 10,
    elevation: 2,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  productoCard: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    padding: 15,
    marginBottom: 10,
    marginHorizontal: 15,
    borderRadius: 10,
    elevation: 2,
  },
  productoImagen: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#ddd',
  },
  productoImagenPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  productoInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  productoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  productoNombre: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  productoPrecio: {
    fontSize: 18,
    color: '#2e7d32',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  productoDetalles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detalleItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detalleText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  actions: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
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
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});



