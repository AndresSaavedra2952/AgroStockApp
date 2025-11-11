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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    setLoading(true);
    try {
      const response = await productosService.getProductosPorUsuario(user?.id);
      if (response.success) {
        setProductos(response.data || []);
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const eliminarProducto = (id) => {
    Alert.alert(
      'Eliminar Producto',
      '¿Estás seguro de que deseas eliminar este producto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await productosService.eliminarProducto(id);
              cargarProductos();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el producto');
            }
          },
        },
      ]
    );
  };

  const renderProducto = ({ item }) => (
    <View style={styles.productoCard}>
      {item.imagenUrl && (
        <Image source={{ uri: item.imagenUrl }} style={styles.productoImagen} />
      )}
      <View style={styles.productoInfo}>
        <Text style={styles.productoNombre}>{item.nombre}</Text>
        <Text style={styles.productoPrecio}>${item.precio?.toLocaleString()}</Text>
        <Text style={styles.productoStock}>Stock: {item.stock}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => {
            setProductoSeleccionado(item.id_producto);
            setModalEditarVisible(true);
          }}
          style={styles.editButton}
        >
          <Ionicons name="pencil" size={20} color="#2196f3" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => eliminarProducto(item.id_producto)}
          style={styles.deleteButton}
        >
          <Ionicons name="trash" size={20} color="#d32f2f" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalCrearVisible(true)}
      >
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Agregar Producto</Text>
      </TouchableOpacity>

      <FlatList
        data={productos}
        renderItem={renderProducto}
        keyExtractor={(item) => item.id_producto.toString()}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={cargarProductos} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tienes productos registrados</Text>
          </View>
        }
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  addButton: {
    backgroundColor: '#2e7d32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    margin: 15,
    borderRadius: 10,
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
  productoInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  productoNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productoPrecio: {
    fontSize: 16,
    color: '#2e7d32',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productoStock: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    padding: 10,
    marginBottom: 10,
  },
  deleteButton: {
    padding: 10,
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



