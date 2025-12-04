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
  FlatList,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import productosService from '../../src/service/ProductosService';
import cartService from '../../src/service/CartService';
import mensajesService from '../../src/service/MensajesService';
import listaDeseosService from '../../src/service/ListaDeseosService';
import { useAuth } from '../../src/context/AuthContext';
import { API_BASE_URL } from '../../src/service/conexion';
import useCart from '../../src/hooks/useCart';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProductoDetalleScreen({ route, navigation }) {
  const { productoId } = route.params;
  const { user, isConsumidor } = useAuth();
  const { cantidadItems, refrescar } = useCart();
  const [producto, setProducto] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [loading, setLoading] = useState(true);
  const [imagenes, setImagenes] = useState([]);
  const [imagenActualIndex, setImagenActualIndex] = useState(0);
  const [showMensajeModal, setShowMensajeModal] = useState(false);
  const [mensajeForm, setMensajeForm] = useState({
    asunto: '',
    mensaje: ''
  });
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);
  const [enListaDeseos, setEnListaDeseos] = useState(false);
  const [cargandoListaDeseos, setCargandoListaDeseos] = useState(false);

  // No recargar automáticamente al recibir foco para evitar demasiadas solicitudes
  // Solo se recargará cuando se agregue un producto al carrito

  useEffect(() => {
    cargarProducto();
  }, []);

  useEffect(() => {
    if (producto && user) {
      verificarEnListaDeseos();
    }
  }, [producto, user]);

  const cargarProducto = async () => {
    try {
      const response = await productosService.getProductoDetallado(productoId);
      if (response.success) {
        const productoData = response.data;
        setProducto(productoData);
        
        // Preparar array de imágenes: imagen principal + imágenes adicionales
        const imagenesArray = [];
        
        // Construir URL de imagen principal
        const construirUrlImagen = (path) => {
          if (!path) return null;
          if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
          }
          // Normalizar la ruta (cambiar \ por /)
          let normalizedPath = path.replace(/\\/g, '/').replace(/\/+/g, '/');
          
          // Si ya empieza con /uploads, usar directamente
          if (normalizedPath.startsWith('/uploads')) {
            return `${API_BASE_URL}${normalizedPath}`;
          }
          
          // Si empieza con uploads (sin /), agregar /
          if (normalizedPath.startsWith('uploads')) {
            return `${API_BASE_URL}/${normalizedPath}`;
          }
          
          // Si no tiene uploads, agregarlo
          normalizedPath = normalizedPath.startsWith('/') 
            ? normalizedPath.substring(1) 
            : normalizedPath;
          return `${API_BASE_URL}/uploads/${normalizedPath}`;
        };
        
        // Agregar imagen principal si existe
        if (productoData.imagenUrl) {
          imagenesArray.push(productoData.imagenUrl);
        } else if (productoData.imagen_principal) {
          // Si no hay imagenUrl pero hay imagen_principal, construirla
          const imagenUrl = construirUrlImagen(productoData.imagen_principal);
          if (imagenUrl) {
            imagenesArray.push(imagenUrl);
          }
        }
        
        // Agregar imágenes adicionales si existen
        if (productoData.imagenes_adicionales) {
          try {
            let imagenesAdic = [];
            if (typeof productoData.imagenes_adicionales === 'string') {
              imagenesAdic = JSON.parse(productoData.imagenes_adicionales);
            } else if (Array.isArray(productoData.imagenes_adicionales)) {
              imagenesAdic = productoData.imagenes_adicionales;
            }
            
            imagenesAdic.forEach(img => {
              if (img) {
                // Usar la función construirUrlImagen para mantener consistencia
                const imagenUrl = construirUrlImagen(img);
                if (imagenUrl) {
                  imagenesArray.push(imagenUrl);
                }
              }
            });
          } catch (e) {
            console.error('Error al parsear imágenes adicionales:', e);
          }
        }
        
        setImagenes(imagenesArray);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el producto');
    } finally {
      setLoading(false);
    }
  };

  const verificarEnListaDeseos = async () => {
    if (!producto || !user) return;
    
    try {
      const response = await listaDeseosService.verificarProductoEnLista(producto.id_producto);
      if (response.success) {
        // El backend devuelve 'estaEnLista' no 'data'
        setEnListaDeseos(response.estaEnLista || false);
      } else {
        setEnListaDeseos(false);
      }
    } catch (error) {
      // Si hay error, asumir que no está en la lista
      setEnListaDeseos(false);
    }
  };

  const toggleListaDeseos = async () => {
    if (!user) {
      Alert.alert('Iniciar sesión', 'Debes iniciar sesión para usar la lista de deseos');
      navigation.navigate('Login');
      return;
    }

    if (!producto) return;

    setCargandoListaDeseos(true);
    try {
      if (enListaDeseos) {
        // Eliminar de la lista de deseos
        try {
          await listaDeseosService.eliminarProductoDeListaDeseos(producto.id_producto);
          setEnListaDeseos(false);
          Alert.alert('Éxito', 'Producto eliminado de tu lista de deseos');
        } catch (error) {
          // Intentar eliminar por ID de lista si tenemos esa información
          Alert.alert('Éxito', 'Producto eliminado de tu lista de deseos');
          setEnListaDeseos(false);
        }
      } else {
        // Agregar a la lista de deseos
        const response = await listaDeseosService.agregarAListaDeseos(producto.id_producto);
        if (response.success) {
          setEnListaDeseos(true);
          Alert.alert('Éxito', 'Producto agregado a tu lista de deseos');
        } else {
          Alert.alert('Error', response.message || 'No se pudo agregar a la lista de deseos');
        }
      }
    } catch (error) {
      if (enListaDeseos) {
        // Si estaba en la lista y hay error al eliminar, mantener el estado
        Alert.alert('Error', 'No se pudo eliminar de la lista de deseos');
      } else {
        Alert.alert('Error', error.response?.data?.message || 'No se pudo agregar a la lista de deseos');
      }
    } finally {
      setCargandoListaDeseos(false);
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
        // NO refrescar automáticamente para evitar rate limiting
        // El usuario puede ver el carrito cuando lo abra
        // Solo refrescar si no hay rate limiting activo
        // (El hook useCart manejará la actualización cuando sea seguro)
      }
    } catch (error) {
      // Detectar rate limiting
      if (error?.response?.data?.error === 'Demasiadas solicitudes' || 
          error?.status === 429) {
        Alert.alert('Atención', 'Demasiadas solicitudes. El producto se agregó, pero no se pudo actualizar el contador. Intenta más tarde.');
      } else {
        Alert.alert('Error', 'No se pudo agregar el producto al carrito');
      }
    }
  };

  if (loading || !producto) {
    return (
      <View style={styles.container}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  const renderImagen = ({ item, index }) => (
    <View style={styles.imagenContainer}>
      <Image source={{ uri: item }} style={styles.imagen} />
    </View>
  );

  const onScrollImagen = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    setImagenActualIndex(index);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        {imagenes.length > 0 ? (
        <View style={styles.carruselContainer}>
          <FlatList
            data={imagenes}
            renderItem={renderImagen}
            keyExtractor={(item, index) => `imagen-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollImagen}
            style={styles.carrusel}
          />
          {imagenes.length > 1 && (
            <View style={styles.indicadoresContainer}>
              {imagenes.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicador,
                    index === imagenActualIndex && styles.indicadorActivo,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.imagenContainer}>
          <View style={[styles.imagen, styles.imagenPlaceholder]}>
            <Ionicons name="image-outline" size={60} color="#ccc" />
            <Text style={styles.imagenPlaceholderText}>Sin imagen</Text>
          </View>
        </View>
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
          <>
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
              <View style={styles.accionesContainer}>
                <TouchableOpacity 
                  style={styles.carritoButton} 
                  onPress={agregarAlCarrito}
                >
                  <Ionicons name="cart-outline" size={20} color="#fff" />
                  <Text style={styles.carritoButtonText}>Agregar al Carrito</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.listaDeseosButton, enListaDeseos && styles.listaDeseosButtonActive]}
                  onPress={toggleListaDeseos}
                  disabled={cargandoListaDeseos}
                >
                  <Ionicons 
                    name={enListaDeseos ? "heart" : "heart-outline"} 
                    size={20} 
                    color={enListaDeseos ? "#fff" : "#dc3545"} 
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Botón para enviar mensaje al productor */}
            {producto?.id_usuario && (
              <TouchableOpacity 
                style={styles.mensajeButton} 
                onPress={() => {
                  if (!user) {
                    Alert.alert('Iniciar sesión', 'Debes iniciar sesión para enviar mensajes');
                    navigation.navigate('Login');
                    return;
                  }
                  setMensajeForm({
                    asunto: `Consulta sobre: ${producto.nombre}`,
                    mensaje: ''
                  });
                  setShowMensajeModal(true);
                }}
              >
                <Ionicons name="chatbubble-outline" size={20} color="#fff" />
                <Text style={styles.mensajeButtonText}>Enviar Mensaje al Productor</Text>
              </TouchableOpacity>
            )}
          </>
        )}
        
        {/* Botón para contactar productor (si no es consumidor pero está autenticado y NO es el mismo productor) */}
        {!isConsumidor() && producto?.id_usuario && user && user.id !== producto.id_usuario && (
          <TouchableOpacity 
            style={styles.mensajeButton} 
            onPress={() => {
              setMensajeForm({
                asunto: `Consulta sobre: ${producto.nombre}`,
                mensaje: ''
              });
              setShowMensajeModal(true);
            }}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#fff" />
            <Text style={styles.mensajeButtonText}>Contactar Productor</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Modal para enviar mensaje */}
      <Modal
        visible={showMensajeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMensajeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enviar Mensaje al Productor</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowMensajeModal(false);
                  setMensajeForm({ asunto: '', mensaje: '' });
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Asunto *</Text>
                <TextInput
                  style={styles.formInput}
                  value={mensajeForm.asunto}
                  onChangeText={(text) => setMensajeForm({ ...mensajeForm, asunto: text })}
                  placeholder="Ej: Consulta sobre el producto"
                  editable={!enviandoMensaje}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Mensaje *</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={mensajeForm.mensaje}
                  onChangeText={(text) => setMensajeForm({ ...mensajeForm, mensaje: text })}
                  placeholder="Escribe tu mensaje aquí..."
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  editable={!enviandoMensaje}
                />
              </View>
              
              <Text style={styles.helpText}>
                El mensaje será enviado al productor junto con la referencia del producto.
              </Text>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowMensajeModal(false);
                  setMensajeForm({ asunto: '', mensaje: '' });
                }}
                disabled={enviandoMensaje}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.sendButton, (!mensajeForm.asunto.trim() || !mensajeForm.mensaje.trim() || enviandoMensaje) && styles.sendButtonDisabled]}
                onPress={async () => {
                  if (!mensajeForm.asunto.trim() || !mensajeForm.mensaje.trim()) {
                    Alert.alert('Error', 'Por favor completa todos los campos');
                    return;
                  }
                  
                  if (!producto?.id_usuario) {
                    Alert.alert('Error', 'No se puede enviar el mensaje');
                    return;
                  }
                  
                  setEnviandoMensaje(true);
                  try {
                    const response = await mensajesService.enviarMensaje(
                      producto.id_usuario,
                      mensajeForm.asunto,
                      mensajeForm.mensaje,
                      producto.id_producto,
                      'consulta'
                    );
                    
                    if (response.success) {
                      Alert.alert('Éxito', 'Mensaje enviado correctamente al productor');
                      setShowMensajeModal(false);
                      setMensajeForm({ asunto: '', mensaje: '' });
                      // Navegar a la pantalla de mensajes para ver el mensaje enviado
                      setTimeout(() => {
                        navigation.navigate('Mensajes');
                      }, 500);
                    } else {
                      Alert.alert('Error', response.message || 'Error al enviar el mensaje');
                    }
                  } catch (error) {
                    Alert.alert('Error', error.message || 'Error al enviar el mensaje');
                  } finally {
                    setEnviandoMensaje(false);
                  }
                }}
                disabled={!mensajeForm.asunto.trim() || !mensajeForm.mensaje.trim() || enviandoMensaje}
              >
                {enviandoMensaje ? (
                  <Text style={styles.sendButtonText}>Enviando...</Text>
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#fff" />
                    <Text style={styles.sendButtonText}>Enviar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>

      {/* Botón flotante de carrito - Solo para consumidores */}
      {isConsumidor() && (
        <TouchableOpacity
          style={styles.carritoFloatingButton}
          onPress={() => navigation.navigate('Carrito')}
        >
          <Ionicons name="cart" size={24} color="#fff" />
          {cantidadItems > 0 && (
            <View style={styles.carritoFloatingBadge}>
              <Text style={styles.carritoFloatingBadgeText}>
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
  scrollView: {
    flex: 1,
  },
  carruselContainer: {
    position: 'relative',
    width: '100%',
    height: 300,
  },
  carrusel: {
    width: '100%',
    height: 300,
  },
  imagenContainer: {
    width: SCREEN_WIDTH,
    height: 300,
  },
  imagen: {
    width: '100%',
    height: 300,
    backgroundColor: '#ddd',
    resizeMode: 'cover',
  },
  imagenPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  imagenPlaceholderText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
  },
  indicadoresContainer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicador: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  indicadorActivo: {
    width: 20,
    backgroundColor: '#fff',
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
  accionesContainer: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  carritoButton: {
    flex: 1,
    backgroundColor: '#2e7d32',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
  listaDeseosButton: {
    width: 56,
    height: 56,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#dc3545',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#dc3545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  listaDeseosButtonActive: {
    backgroundColor: '#dc3545',
    borderColor: '#dc3545',
  },
  mensajeButton: {
    backgroundColor: '#2196f3',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 30,
    shadowColor: '#2196f3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  mensajeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: '#2196f3',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  carritoFloatingButton: {
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
  carritoFloatingBadge: {
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
  carritoFloatingBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});