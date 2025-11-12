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
import productosService from '../../src/service/ProductosService';
import categoriasService from '../../src/service/CategoriasService';

export default function ProductosScreen({ navigation, route }) {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState(null);
  const [loading, setLoading] = useState(false);
  const categoriaId = route?.params?.categoriaId;

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
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 15,
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
});



