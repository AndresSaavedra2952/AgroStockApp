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
import { Ionicons } from '@expo/vector-icons';
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
        
        {producto.categoria_nombre && (
          <View style={styles.categoriaContainer}>
            <Ionicons name="pricetag-outline" size={16} color="#666" />
            <Text style={styles.categoria}>{producto.categoria_nombre}</Text>
          </View>
        )}
        
        <Text style={styles.precio}>${producto.precio?.toLocaleString()}</Text>
        
        {producto.descripcion && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descripción</Text>
            <Text style={styles.descripcion}>{producto.descripcion}</Text>
          </View>
        )}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Producto</Text>
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="cube-outline" size={20} color="#2e7d32" />
              <View style={styles.infoContent}>
                <Text style={styles.label}>Stock disponible</Text>
                <Text style={styles.value}>{producto.stock} {producto.unidad_medida || 'unidades'}</Text>
              </View>
            </View>
          </View>

          {producto.stock_minimo && (
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="alert-circle-outline" size={20} color="#ff9800" />
                <View style={styles.infoContent}>
                  <Text style={styles.label}>Stock mínimo</Text>
                  <Text style={styles.value}>{producto.stock_minimo} {producto.unidad_medida || 'unidades'}</Text>
                </View>
              </View>
            </View>
          )}

          {producto.unidad_medida && (
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="scale-outline" size={20} color="#666" />
                <View style={styles.infoContent}>
                  <Text style={styles.label}>Unidad de medida</Text>
                  <Text style={styles.value}>{producto.unidad_medida}</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle-outline" size={20} color={producto.disponible ? "#2e7d32" : "#f44336"} />
              <View style={styles.infoContent}>
                <Text style={styles.label}>Estado</Text>
                <Text style={[styles.value, { color: producto.disponible ? "#2e7d32" : "#f44336" }]}>
                  {producto.disponible ? "Disponible" : "No disponible"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ubicación</Text>
          
          {producto.ciudad_origen && (
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="location-outline" size={20} color="#2196f3" />
                <View style={styles.infoContent}>
                  <Text style={styles.label}>Ciudad</Text>
                  <Text style={styles.value}>{producto.ciudad_origen}</Text>
                </View>
              </View>
            </View>
          )}

          {producto.departamento_origen && (
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="map-outline" size={20} color="#2196f3" />
                <View style={styles.infoContent}>
                  <Text style={styles.label}>Departamento</Text>
                  <Text style={styles.value}>{producto.departamento_origen}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {producto.nombre_productor && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información del Productor</Text>
            
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="person-outline" size={20} color="#9c27b0" />
                <View style={styles.infoContent}>
                  <Text style={styles.label}>Nombre</Text>
                  <Text style={styles.value}>{producto.nombre_productor}</Text>
                </View>
              </View>
            </View>

            {producto.email_productor && (
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Ionicons name="mail-outline" size={20} color="#9c27b0" />
                  <View style={styles.infoContent}>
                    <Text style={styles.label}>Email</Text>
                    <Text style={styles.value}>{producto.email_productor}</Text>
                  </View>
                </View>
              </View>
            )}

            {producto.telefono_productor && (
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Ionicons name="call-outline" size={20} color="#9c27b0" />
                  <View style={styles.infoContent}>
                    <Text style={styles.label}>Teléfono</Text>
                    <Text style={styles.value}>{producto.telefono_productor}</Text>
                  </View>
                </View>
              </View>
            )}

            {producto.direccion_productor && (
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Ionicons name="home-outline" size={20} color="#9c27b0" />
                  <View style={styles.infoContent}>
                    <Text style={styles.label}>Dirección</Text>
                    <Text style={styles.value}>{producto.direccion_productor}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {(producto.calificacion_promedio || producto.total_resenas > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reseñas</Text>
            
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="star-outline" size={20} color="#ffc107" />
                <View style={styles.infoContent}>
                  <Text style={styles.label}>Calificación promedio</Text>
                  <Text style={styles.value}>
                    ⭐ {producto.calificacion_promedio || 'N/A'} 
                    {producto.total_resenas > 0 && ` (${producto.total_resenas} reseña${producto.total_resenas > 1 ? 's' : ''})`}
                  </Text>
                </View>
              </View>
            </View>
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
    resizeMode: 'cover',
  },
  content: {
    padding: 20,
  },
  nombre: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  categoriaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  categoria: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
    fontStyle: 'italic',
  },
  precio: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#2e7d32',
    paddingBottom: 8,
  },
  descripcion: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  carritoSection: {
    marginTop: 10,
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cantidadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cantidadInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    width: 100,
    marginLeft: 10,
    textAlign: 'center',
    fontSize: 16,
  },
  carritoButton: {
    backgroundColor: '#2e7d32',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#2e7d32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  carritoButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});



