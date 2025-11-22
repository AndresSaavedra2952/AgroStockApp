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
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import productosService from '../../src/service/ProductosService';
import categoriasService from '../../src/service/CategoriasService';
import cartService from '../../src/service/CartService';
import pedidosService from '../../src/service/PedidosService';
import mensajesService from '../../src/service/MensajesService';
import { useAuth } from '../../src/context/AuthContext';

export default function ProductosScreen({ navigation, route }) {
  const { user } = useAuth();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState(null);
  const [loading, setLoading] = useState(false);
  const [carritoItems, setCarritoItems] = useState(0);
  const [pedidosPendientes, setPedidosPendientes] = useState(0);
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState(0);
  const [modalMensajeVisible, setModalMensajeVisible] = useState(false);
  const [productorSeleccionado, setProductorSeleccionado] = useState(null);
  const [asuntoMensaje, setAsuntoMensaje] = useState('');
  const [mensajeTexto, setMensajeTexto] = useState('');
  const categoriaId = route?.params?.categoriaId;

  useEffect(() => {
    cargarCategorias();
    if (categoriaId) {
      setCategoriaFiltro(categoriaId);
      cargarProductosPorCategoria(categoriaId);
    } else {
      cargarProductos();
    }
    if (user) {
      cargarEstadisticas();
    }
  }, [user]);

  const cargarEstadisticas = async () => {
    try {
      // Cargar carrito
      const carritoRes = await cartService.getCarrito();
      if (carritoRes.success && carritoRes.data?.items) {
        setCarritoItems(carritoRes.data.items.length);
      }

      // Cargar pedidos pendientes
      const pedidosRes = await pedidosService.getPedidosRealizados();
      if (pedidosRes.success && pedidosRes.data) {
        const pendientes = pedidosRes.data.filter(
          p => p.estado === 'pendiente' || p.estado === 'confirmado' || p.estado === 'en_preparacion'
        ).length;
        setPedidosPendientes(pendientes);
      }

      // Cargar mensajes no leídos
      const mensajesRes = await mensajesService.getMensajesRecibidos();
      if (mensajesRes.success && mensajesRes.data) {
        const noLeidos = mensajesRes.data.filter(m => !m.leido).length;
        setMensajesNoLeidos(noLeidos);
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

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

  const abrirModalMensaje = (producto) => {
    console.log('📧 Abriendo modal de mensaje para producto:', {
      id_producto: producto.id_producto,
      nombre: producto.nombre,
      id_usuario: producto.id_usuario,
      nombre_productor: producto.nombre_productor,
    });

    // Obtener el ID del productor desde el producto
    if (producto.id_usuario) {
      setProductorSeleccionado({
        id: producto.id_usuario,
        nombre: producto.nombre_productor || 'Productor',
        productoId: producto.id_producto,
        productoNombre: producto.nombre,
      });
      setAsuntoMensaje(`Consulta sobre ${producto.nombre}`);
      setModalMensajeVisible(true);
    } else {
      console.error('❌ No se encontró id_usuario en el producto:', producto);
      Alert.alert('Error', 'No se pudo obtener la información del productor');
    }
  };

  const enviarMensaje = async () => {
    if (!asuntoMensaje.trim() || !mensajeTexto.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (!productorSeleccionado || !productorSeleccionado.id) {
      Alert.alert('Error', 'No se pudo identificar al productor');
      return;
    }

    console.log('📤 Enviando mensaje:', {
      id_destinatario: productorSeleccionado.id,
      asunto: asuntoMensaje,
      mensaje: mensajeTexto.substring(0, 50) + '...',
      id_producto: productorSeleccionado.productoId,
      id_usuario_actual: user?.id,
    });

    try {
      const response = await mensajesService.enviarMensaje(
        productorSeleccionado.id,
        asuntoMensaje,
        mensajeTexto,
        productorSeleccionado.productoId,
        'consulta'
      );

      console.log('✅ Respuesta del servidor:', JSON.stringify(response, null, 2));

      if (response.success && response.mensaje) {
        console.log('✅ Mensaje enviado exitosamente:', {
          id_mensaje: response.mensaje.id_mensaje,
          id_remitente: response.mensaje.id_remitente,
          id_destinatario: response.mensaje.id_destinatario,
          asunto: response.mensaje.asunto,
        });
        
        Alert.alert('Éxito', 'Mensaje enviado correctamente');
        setModalMensajeVisible(false);
        setAsuntoMensaje('');
        setMensajeTexto('');
        setProductorSeleccionado(null);
        cargarEstadisticas();
      } else {
        console.error('❌ Error en respuesta:', response);
        const errorMsg = response.message || response.error || 'No se pudo enviar el mensaje';
        Alert.alert('Error', errorMsg);
      }
    } catch (error) {
      console.error('❌ Error al enviar mensaje:', error);
      const errorMessage = error.message || error.error || 'No se pudo enviar el mensaje. Intenta nuevamente.';
      Alert.alert('Error', errorMessage);
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
        {user && (
          <TouchableOpacity
            style={styles.mensajeButton}
            onPress={(e) => {
              e.stopPropagation();
              abrirModalMensaje(item);
            }}
          >
            <Ionicons name="mail-outline" size={16} color="#2e7d32" />
            <Text style={styles.mensajeButtonText}>Contactar Productor</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const productosDisponibles = productos.filter(p => p.disponible && p.stock > 0).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Dashboard con estadísticas */}
      {user && (
        <View style={styles.dashboard}>
          <Text style={styles.dashboardTitle}>Productos</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{productosDisponibles}</Text>
              <Text style={styles.statLabel}>Disponibles</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#2196f3' }]}>{carritoItems}</Text>
              <Text style={styles.statLabel}>En Carrito</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#ff9800' }]}>{pedidosPendientes}</Text>
              <Text style={styles.statLabel}>Pedidos</Text>
            </View>
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('Mensajes')}
            >
              <View style={styles.mensajesContainer}>
                <Text style={[styles.statValue, { color: '#2e7d32' }]}>{mensajesNoLeidos}</Text>
                {mensajesNoLeidos > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{mensajesNoLeidos}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.statLabel}>Mensajes</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Barra de búsqueda y filtros */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.busqueda}
            placeholder="Buscar productos..."
            value={busqueda}
            onChangeText={setBusqueda}
            onSubmitEditing={buscarProductos}
            placeholderTextColor="#999"
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.buscarButton} onPress={buscarProductos}>
          <Text style={styles.buscarButtonText}>Buscar</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de productos */}
      <FlatList
        data={productos}
        renderItem={renderProducto}
        keyExtractor={(item) => item.id_producto.toString()}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              cargarProductos();
              if (user) cargarEstadisticas();
            }}
          />
        }
        contentContainerStyle={styles.list}
      />

      {/* Modal para enviar mensaje */}
      <Modal
        visible={modalMensajeVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalMensajeVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Contactar Productor</Text>
              <TouchableOpacity onPress={() => setModalMensajeVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            {productorSeleccionado && (
              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalLabel}>Productor:</Text>
                <Text style={styles.modalText}>{productorSeleccionado.nombre}</Text>
                
                <Text style={styles.modalLabel}>Producto:</Text>
                <Text style={styles.modalText}>{productorSeleccionado.productoNombre}</Text>

                <Text style={styles.modalLabel}>Asunto:</Text>
                <TextInput
                  style={styles.modalInput}
                  value={asuntoMensaje}
                  onChangeText={setAsuntoMensaje}
                  placeholder="Asunto del mensaje"
                  placeholderTextColor="#999"
                />

                <Text style={styles.modalLabel}>Mensaje:</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  value={mensajeTexto}
                  onChangeText={setMensajeTexto}
                  placeholder="Escribe tu mensaje aquí..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />

                <TouchableOpacity style={styles.enviarButton} onPress={enviarMensaje}>
                  <Ionicons name="send" size={20} color="#fff" />
                  <Text style={styles.enviarButtonText}>Enviar Mensaje</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  dashboard: {
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
  dashboardTitle: {
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
  mensajesContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -12,
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
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
  busqueda: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
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
  mensajeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  mensajeButtonText: {
    color: '#2e7d32',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 6,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  enviarButton: {
    backgroundColor: '#2e7d32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  enviarButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});



