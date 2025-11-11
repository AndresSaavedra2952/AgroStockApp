import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import cartService from '../../src/service/CartService';
import { useAuth } from '../../src/context/AuthContext';

export default function CarritoScreen({ navigation }) {
  const { user } = useAuth();
  const [carrito, setCarrito] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarCarrito();
  }, []);

  const cargarCarrito = async () => {
    setLoading(true);
    try {
      const response = await cartService.getCarrito();
      if (response.success) {
        setCarrito(response.data);
      }
    } catch (error) {
      console.error('Error al cargar carrito:', error);
    } finally {
      setLoading(false);
    }
  };

  const actualizarCantidad = async (idItem, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      await eliminarItem(idItem);
      return;
    }

    try {
      await cartService.actualizarItem(idItem, nuevaCantidad);
      cargarCarrito();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar la cantidad');
    }
  };

  const eliminarItem = async (idItem) => {
    try {
      await cartService.eliminarItem(idItem);
      cargarCarrito();
    } catch (error) {
      Alert.alert('Error', 'No se pudo eliminar el producto');
    }
  };

  const realizarCheckout = () => {
    navigation.navigate('Checkout', { carrito });
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemCard}>
      <Image source={{ uri: item.imagenUrl }} style={styles.itemImagen} />
      <View style={styles.itemInfo}>
        <Text style={styles.itemNombre}>{item.nombre_producto}</Text>
        <Text style={styles.itemPrecio}>${item.precio_unitario?.toLocaleString()}</Text>
        <View style={styles.cantidadContainer}>
          <TouchableOpacity
            onPress={() => actualizarCantidad(item.id_item, item.cantidad - 1)}
            style={styles.cantidadButton}
          >
            <Text style={styles.cantidadButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.cantidad}>{item.cantidad}</Text>
          <TouchableOpacity
            onPress={() => actualizarCantidad(item.id_item, item.cantidad + 1)}
            style={styles.cantidadButton}
          >
            <Text style={styles.cantidadButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => eliminarItem(item.id_item)}
        style={styles.eliminarButton}
      >
        <Text style={styles.eliminarButtonText}>Eliminar</Text>
      </TouchableOpacity>
    </View>
  );

  const total = carrito?.items?.reduce((sum, item) => sum + (item.precio_total || 0), 0) || 0;

  return (
    <View style={styles.container}>
      <FlatList
        data={carrito?.items || []}
        renderItem={renderItem}
        keyExtractor={(item) => item.id_item.toString()}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={cargarCarrito} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Tu carrito está vacío</Text>
          </View>
        }
      />
      {carrito?.items?.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.totalText}>Total: ${total.toLocaleString()}</Text>
          <TouchableOpacity style={styles.checkoutButton} onPress={realizarCheckout}>
            <Text style={styles.checkoutButtonText}>Proceder al Pago</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  itemCard: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    elevation: 2,
  },
  itemImagen: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#ddd',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 15,
  },
  itemNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  itemPrecio: {
    fontSize: 16,
    color: '#2e7d32',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cantidadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cantidadButton: {
    backgroundColor: '#2e7d32',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cantidadButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cantidad: {
    marginHorizontal: 15,
    fontSize: 16,
    fontWeight: 'bold',
  },
  eliminarButton: {
    justifyContent: 'center',
    paddingLeft: 10,
  },
  eliminarButtonText: {
    color: '#d32f2f',
    fontSize: 14,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  checkoutButton: {
    backgroundColor: '#2e7d32',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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



