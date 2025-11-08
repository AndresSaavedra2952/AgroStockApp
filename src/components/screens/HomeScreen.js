import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import productosService from '../../service/ProductosService';
import categoriasService from '../../service/CategoriasService';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [categorias, setCategorias] = useState([]);
  const [productosDestacados, setProductosDestacados] = useState([]);

  const { data: productosData, loading, refresh } = useAutoRefresh(
    () => productosService.getProductos({ limite: 10, orden: 'precio_asc' }),
    60000, // Refrescar cada minuto
    true
  );

  useEffect(() => {
    cargarCategorias();
  }, []);

  useEffect(() => {
    if (productosData?.data) {
      setProductosDestacados(productosData.data.slice(0, 6));
    }
  }, [productosData]);

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

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>¡Hola, {user?.nombre}! 👋</Text>
        <Text style={styles.subtitle}>Explora los mejores productos agro</Text>
      </View>

      {/* Categorías */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Categorías</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categorias.map((categoria) => (
            <TouchableOpacity
              key={categoria.id_categoria}
              style={styles.categoriaCard}
              onPress={() => navigation.navigate('Productos', { categoriaId: categoria.id_categoria })}
            >
              <Text style={styles.categoriaNombre}>{categoria.nombre}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Productos destacados */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Productos Destacados</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Productos')}>
            <Text style={styles.verTodos}>Ver todos</Text>
          </TouchableOpacity>
        </View>
        {productosDestacados.map((producto) => (
          <TouchableOpacity
            key={producto.id_producto}
            style={styles.productoCard}
            onPress={() => navigation.navigate('ProductoDetalle', { productoId: producto.id_producto })}
          >
            {producto.imagenUrl && (
              <Image source={{ uri: producto.imagenUrl }} style={styles.productoImagen} />
            )}
            <View style={styles.productoInfo}>
              <Text style={styles.productoNombre}>{producto.nombre}</Text>
              <Text style={styles.productoPrecio}>${producto.precio?.toLocaleString()}</Text>
              <Text style={styles.productoStock}>Stock: {producto.stock}</Text>
            </View>
          </TouchableOpacity>
        ))}
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
    padding: 20,
    backgroundColor: '#2e7d32',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  verTodos: {
    color: '#2e7d32',
    fontSize: 14,
  },
  categoriaCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
    elevation: 2,
  },
  categoriaNombre: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
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
    width: 100,
    height: 100,
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
  productoPrecio: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 5,
  },
  productoStock: {
    fontSize: 14,
    color: '#666',
  },
});

