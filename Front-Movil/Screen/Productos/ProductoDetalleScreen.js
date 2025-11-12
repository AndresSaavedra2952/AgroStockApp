import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import productosService from '../../src/service/ProductosService';
import cartService from '../../src/service/CartService';
import { useAuth } from '../../src/context/AuthContext';

export default function ProductoDetalleScreen({ route, navigation }) {
  const { productoId } = route.params;
  const { user, isConsumidor } = useAuth();
  const [producto, setProducto] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarProducto();
  }, []);

  const cargarProducto = async () => {
    try {
      const response = await productosService.getProductoDetallado(productoId);
      if (response.success) {
        setProducto(response.data);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el producto');
    } finally {
      setLoading(false);
    }
  };

  const agregarAlCarrito = async () => {
    if (!isConsumidor()) {
      Alert.alert('Error', 'Solo los consumidores pueden agregar productos al carrito');
      return;
    }

    try {
      const response = await cartService.agregarProducto(
        producto.id_producto,
        cantidad,
        producto.precio
      );
      if (response.success) {
        Alert.alert('Éxito', 'Producto agregado al carrito');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo agregar el producto al carrito');
    }
  };

  if (loading || !producto) {
    return (
      <View style={styles.container}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {producto.imagenUrl && (
        <Image source={{ uri: producto.imagenUrl }} style={styles.imagen} />
      )}
      
      <View style={styles.content}>
        <Text style={styles.nombre}>{producto.nombre}</Text>
        <Text style={styles.precio}>${producto.precio?.toLocaleString()}</Text>
        <Text style={styles.descripcion}>{producto.descripcion}</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Stock disponible:</Text>
          <Text style={styles.value}>{producto.stock} {producto.unidadMedida}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Ubicación:</Text>
          <Text style={styles.value}>{producto.ciudad_origen}</Text>
        </View>

        {producto.calificacion_promedio && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Calificación:</Text>
            <Text style={styles.value}>⭐ {producto.calificacion_promedio}</Text>
          </View>
        )}

        {isConsumidor() && (
          <View style={styles.carritoSection}>
            <View style={styles.cantidadContainer}>
              <Text style={styles.label}>Cantidad:</Text>
              <TextInput
                style={styles.cantidadInput}
                value={cantidad.toString()}
                onChangeText={(text) => setCantidad(parseInt(text) || 1)}
                keyboardType="numeric"
              />
            </View>
            <TouchableOpacity style={styles.carritoButton} onPress={agregarAlCarrito}>
              <Text style={styles.carritoButtonText}>Agregar al Carrito</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  imagen: {
    width: '100%',
    height: 300,
    backgroundColor: '#ddd',
  },
  content: {
    padding: 20,
  },
  nombre: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  precio: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 15,
  },
  descripcion: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 16,
    color: '#666',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  carritoSection: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  cantidadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cantidadInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    width: 80,
    marginLeft: 10,
    textAlign: 'center',
  },
  carritoButton: {
    backgroundColor: '#2e7d32',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  carritoButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});



