import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import cartService from '../../src/service/CartService';
import { useAuth } from '../../src/context/AuthContext';
import cartRateLimitManager from '../../src/service/CartRateLimitManager';
import StripePaymentForm from '../../src/components/StripePaymentForm';

export default function CarritoScreen({ navigation }) {
  const { user } = useAuth();
  const [carrito, setCarrito] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showStripe, setShowStripe] = useState(false);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [direccionEntrega, setDireccionEntrega] = useState('');
  const [notas, setNotas] = useState('');
  const [pedidoCreado, setPedidoCreado] = useState(null);
  const [procesandoCheckout, setProcesandoCheckout] = useState(false);

  const [rateLimited, setRateLimited] = useState(false);
  const lastCallRef = useRef(0);
  const isCallingRef = useRef(false);

  // Suscribirse al gestor global de rate limiting
  useEffect(() => {
    const unsubscribe = cartRateLimitManager.subscribe((isLimited, retryAfter) => {
      setRateLimited(isLimited);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    cargarCarrito();
  }, []);

  // Recargar cuando la pantalla recibe foco (con debounce y verificación de rate limit)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // NO recargar si hay rate limiting activo (verificar global primero)
      if (cartRateLimitManager.isRateLimited() || rateLimited) {
        console.log('🚫 CarritoScreen: Rate limit activo, no recargando al recibir foco');
        return;
      }
      // Solo recargar si han pasado al menos 5 segundos desde la última llamada
      const now = Date.now();
      if (now - lastCallRef.current > 5000 && !isCallingRef.current) {
        cargarCarrito();
      }
    });
    return unsubscribe;
  }, [navigation, rateLimited]);

  const cargarCarrito = async () => {
    // Verificar rate limiting global (más confiable)
    if (cartRateLimitManager.isRateLimited()) {
      console.log('🚫 CarritoScreen: Rate limit global activo, bloqueando llamada');
      return;
    }

    // También verificar estado local
    if (rateLimited) {
      console.log('🚫 CarritoScreen: Rate limit local activo, bloqueando llamada');
      return;
    }

    // Evitar llamadas duplicadas
    if (isCallingRef.current) {
      return;
    }

    const now = Date.now();
    // Debounce: no hacer llamadas más frecuentes que cada 5 segundos
    if (now - lastCallRef.current < 5000) {
      return;
    }

    lastCallRef.current = now;
    isCallingRef.current = true;
    setLoading(true);

    try {
      const response = await cartService.getCarrito();
      
      // Detectar errores 429 (rate limiting)
      if (response && (response.error === 'Demasiadas solicitudes' || response.status === 429)) {
        const retryAfter = response.retryAfter || 900; // En segundos
        // Activar rate limiting global (afecta a todos los componentes)
        cartRateLimitManager.setRateLimited(retryAfter);
        // Mantener los datos actuales si existen
        return;
      }
      
      if (response.success) {
        // Asegurar que la estructura del carrito sea correcta
        const carritoData = response.data || {};
        const items = Array.isArray(carritoData.items) ? carritoData.items : [];
        // Filtrar items inválidos - el backend usa id_producto
        const itemsValidos = items.filter(item => 
          item && (item.id_producto != null || item.id_item != null)
        );
        
        setCarrito({
          ...carritoData,
          items: itemsValidos
        });
      } else {
        // Si no hay éxito, inicializar con carrito vacío
        setCarrito({ items: [] });
      }
    } catch (error) {
      // Detectar errores 429 en el catch
      if (error?.response?.data?.error === 'Demasiadas solicitudes' || 
          error?.status === 429 ||
          error?.error === 'Demasiadas solicitudes') {
        const retryAfter = error?.response?.data?.retryAfter || error?.retryAfter || 900; // En segundos
        // Activar rate limiting global (afecta a todos los componentes)
        cartRateLimitManager.setRateLimited(retryAfter);
        return;
      }
      console.error('Error al cargar carrito:', error);
      // En caso de error, mantener los datos actuales si existen
      if (!carrito) {
        setCarrito({ items: [] });
      }
    } finally {
      setLoading(false);
      isCallingRef.current = false;
    }
  };

  const actualizandoRef = useRef({});
  const eliminandoRef = useRef({});

  const actualizarCantidad = async (idItem, nuevaCantidad) => {
    if (!idItem) {
      Alert.alert('Error', 'ID de item inválido');
      return;
    }

    // Evitar llamadas duplicadas para el mismo item (pero con timeout más corto)
    if (actualizandoRef.current[idItem]) {
      return; // Silenciosamente ignorar si ya se está procesando
    }

    if (nuevaCantidad <= 0) {
      await eliminarItem(idItem);
      return;
    }

    // Actualizar optimísticamente la UI primero para mejor UX
    const itemActual = carrito?.items?.find(item => 
      (item.id_producto === idItem || item.id_item === idItem)
    );
    
    if (itemActual) {
      // Actualizar localmente primero
      setCarrito(prevCarrito => {
        if (!prevCarrito || !prevCarrito.items) return prevCarrito;
        
        const itemsActualizados = prevCarrito.items.map(item => {
          if (item.id_producto === idItem || item.id_item === idItem) {
            return {
              ...item,
              cantidad: nuevaCantidad,
              precio_total: nuevaCantidad * (parseFloat(item.precio_unitario) || 0)
            };
          }
          return item;
        });
        
        return {
          ...prevCarrito,
          items: itemsActualizados,
          total_items: itemsActualizados.reduce((sum, item) => sum + (item.cantidad || 0), 0),
          total_precio: itemsActualizados.reduce((sum, item) => sum + (item.precio_total || 0), 0)
        };
      });
    }

    actualizandoRef.current[idItem] = true;

    try {
      const response = await cartService.actualizarItem(idItem, nuevaCantidad);
      
      // Si el producto no se encuentra, recargar el carrito para sincronizar
      if (response && !response.success && response.message?.includes('no encontrado')) {
        console.log('⚠️ Producto no encontrado, recargando carrito...');
        await cargarCarrito();
        return;
      }

      // Recargar el carrito para obtener datos actualizados del servidor
      // Usar un delay muy corto para que se sienta responsivo
      setTimeout(() => {
        cargarCarrito();
      }, 100);
    } catch (error) {
      console.error('Error al actualizar cantidad:', error);
      
      // Si hay error, revertir la actualización optimista recargando del servidor
      await cargarCarrito();
      
      // Si el producto no se encuentra, ya se recargó arriba
      if (!error?.response?.data?.message?.includes('no encontrado') && 
          !error?.message?.includes('no encontrado')) {
        Alert.alert('Error', error?.response?.data?.message || 'No se pudo actualizar la cantidad');
      }
    } finally {
      // Limpiar la bandera rápidamente para permitir el siguiente clic
      setTimeout(() => {
        delete actualizandoRef.current[idItem];
      }, 200);
    }
  };

  const eliminarItem = async (idItem) => {
    if (!idItem) {
      Alert.alert('Error', 'ID de item inválido');
      return;
    }

    // Evitar llamadas duplicadas para el mismo item
    if (eliminandoRef.current[idItem]) {
      console.log(`⏸️ Ya se está eliminando el item ${idItem}, ignorando llamada duplicada`);
      return;
    }

    eliminandoRef.current[idItem] = true;

    try {
      const response = await cartService.eliminarItem(idItem);
      
      // Si el producto no se encuentra, recargar el carrito para sincronizar
      if (response && !response.success && response.message?.includes('no encontrado')) {
        console.log('⚠️ Producto no encontrado al eliminar, recargando carrito...');
        await cargarCarrito();
        return;
      }

      // Esperar un poco antes de recargar
      setTimeout(() => {
        cargarCarrito();
      }, 300);
    } catch (error) {
      console.error('Error al eliminar item:', error);
      
      // Si el producto no se encuentra, recargar el carrito
      if (error?.response?.data?.message?.includes('no encontrado') || 
          error?.message?.includes('no encontrado')) {
        console.log('⚠️ Producto no encontrado al eliminar (catch), recargando carrito...');
        await cargarCarrito();
        return;
      }
      
      Alert.alert('Error', error?.response?.data?.message || 'No se pudo eliminar el producto');
    } finally {
      // Limpiar la bandera después de un delay
      setTimeout(() => {
        delete eliminandoRef.current[idItem];
      }, 1000);
    }
  };

  const realizarCheckout = () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para proceder al pago');
      return;
    }
    setShowCheckout(true);
  };

  const handleCheckout = async () => {
    if (!direccionEntrega.trim()) {
      Alert.alert('Error', 'Por favor ingresa una dirección de entrega');
      return;
    }

    if (direccionEntrega.trim().length < 10) {
      Alert.alert('Error', 'La dirección de entrega debe tener al menos 10 caracteres');
      return;
    }

    setProcesandoCheckout(true);

    try {
      const carritoActual = await cartService.getCarrito();
      
      if (!carritoActual || !carritoActual.success || !carritoActual.data || !carritoActual.data.items || carritoActual.data.items.length === 0) {
        Alert.alert('Error', 'Tu carrito está vacío. Por favor agrega productos antes de proceder al pago.');
        setProcesandoCheckout(false);
        setShowCheckout(false);
        await cargarCarrito();
        return;
      }

      const response = await cartService.checkout(
        direccionEntrega,
        notas,
        null,
        metodoPago
      );

      if (response.success) {
        if (metodoPago === 'tarjeta') {
          if (response.data?.pago?.client_secret) {
            setPedidoCreado({
              id: response.data.pedido_id,
              total: response.data.total_precio,
              client_secret: response.data.pago.client_secret,
              payment_intent_id: response.data.pago.payment_intent_id,
            });
            setShowCheckout(false);
            setShowStripe(true);
          } else {
            Alert.alert('Error', response.data?.pago?.error || 'No se pudo inicializar el pago. Por favor, intenta nuevamente.');
            setProcesandoCheckout(false);
          }
        } else if (metodoPago === 'efectivo') {
          Alert.alert(
            'Pedido Creado',
            `Tu pedido #${response.data.pedido_id} ha sido creado exitosamente. El pago está pendiente ya que seleccionaste pago en efectivo.`,
            [
              {
                text: 'OK',
                onPress: () => {
                  setShowCheckout(false);
                  cargarCarrito();
                  navigation.navigate('Pedidos', { refresh: true });
                },
              },
            ]
          );
        } else {
          Alert.alert('Error', 'No se pudo inicializar el pago. Por favor, intenta nuevamente.');
        }
      } else {
        Alert.alert('Error', response.message || 'Error al procesar el pedido');
      }
    } catch (error) {
      console.error('Error en checkout:', error);
      Alert.alert('Error', error?.message || 'Error al procesar el pedido');
    } finally {
      setProcesandoCheckout(false);
    }
  };

  const handleStripeSuccess = (paymentIntentId) => {
    Alert.alert(
      'Pago Exitoso',
      'Tu pedido y pago han sido procesados exitosamente.',
      [
        {
          text: 'OK',
          onPress: () => {
            setShowStripe(false);
            setPedidoCreado(null);
            cargarCarrito();
            navigation.navigate('Pedidos', { refresh: true });
          },
        },
      ]
    );
  };

  const handleStripeError = (error) => {
    Alert.alert('Error', error);
  };

  const handleStripeCancel = () => {
    setShowStripe(false);
    setPedidoCreado(null);
  };

  const renderItem = ({ item, index }) => {
    // Validar que el item tenga los datos necesarios
    // El backend usa id_producto, no id_item
    if (!item || (item.id_producto == null && item.id_item == null)) {
      return null;
    }

    // El backend puede usar id_producto o el frontend puede tener id_item
    const itemId = item.id_producto || item.id_item;
    const nombreProducto = item.producto_nombre || item.nombre_producto || 'Producto sin nombre';
    const imagenUrl = item.imagen_principal || item.imagenUrl;
    
    // Construir URL de imagen si es necesario
    let imagenUri = null;
    if (imagenUrl) {
      if (imagenUrl.startsWith('http://') || imagenUrl.startsWith('https://')) {
        imagenUri = imagenUrl;
      } else {
        // Si es una ruta relativa, construir la URL completa
        const API_BASE_URL = require('../../src/service/conexion').API_BASE_URL;
        const rutaNormalizada = imagenUrl.replace(/\\/g, '/');
        const rutaLimpia = rutaNormalizada.startsWith('/') ? rutaNormalizada.substring(1) : rutaNormalizada;
        imagenUri = `${API_BASE_URL}/${rutaLimpia}`;
      }
    }

    return (
      <View style={styles.itemCard}>
        {imagenUri ? (
          <Image source={{ uri: imagenUri }} style={styles.itemImagen} />
        ) : (
          <View style={[styles.itemImagen, styles.itemImagenPlaceholder]}>
            <Text style={styles.itemImagenPlaceholderText}>Sin imagen</Text>
          </View>
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemNombre}>{nombreProducto}</Text>
          <Text style={styles.itemPrecio}>
            ${(item.precio_unitario || 0).toLocaleString()}
          </Text>
          <View style={styles.cantidadContainer}>
            <TouchableOpacity
              onPress={() => actualizarCantidad(itemId, (item.cantidad || 1) - 1)}
              style={styles.cantidadButton}
            >
              <Text style={styles.cantidadButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.cantidad}>{item.cantidad || 1}</Text>
            <TouchableOpacity
              onPress={() => actualizarCantidad(itemId, (item.cantidad || 1) + 1)}
              style={styles.cantidadButton}
            >
              <Text style={styles.cantidadButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => eliminarItem(itemId)}
          style={styles.eliminarButton}
        >
          <Text style={styles.eliminarButtonText}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const total = carrito?.items?.reduce((sum, item) => sum + (item.precio_total || 0), 0) || 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={carrito?.items || []}
        renderItem={renderItem}
        keyExtractor={(item, index) => {
          // El backend usa id_producto, pero también puede venir id_item
          if (item && item.id_producto != null) {
            return `producto-${item.id_producto}`;
          }
          if (item && item.id_item != null) {
            return `item-${item.id_item}`;
          }
          return `cart-item-${index}`;
        }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={cargarCarrito} />}
        contentContainerStyle={styles.listContent}
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

      <Modal
        visible={showCheckout}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCheckout(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Información de Entrega</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Dirección de Entrega *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Calle 123 #45-67, Barrio Centro"
                  value={direccionEntrega}
                  onChangeText={setDireccionEntrega}
                  multiline
                  numberOfLines={3}
                />
                <Text style={[styles.helpText, direccionEntrega.length < 10 && styles.helpTextError]}>
                  Mínimo 10 caracteres ({direccionEntrega.length}/10)
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Método de Pago *</Text>
                <View style={styles.paymentMethodContainer}>
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodButton,
                      metodoPago === 'efectivo' && styles.paymentMethodButtonSelected,
                    ]}
                    onPress={() => setMetodoPago('efectivo')}
                  >
                    <Text
                      style={[
                        styles.paymentMethodText,
                        metodoPago === 'efectivo' && styles.paymentMethodTextSelected,
                      ]}
                    >
                      Efectivo
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodButton,
                      metodoPago === 'tarjeta' && styles.paymentMethodButtonSelected,
                    ]}
                    onPress={() => setMetodoPago('tarjeta')}
                  >
                    <Text
                      style={[
                        styles.paymentMethodText,
                        metodoPago === 'tarjeta' && styles.paymentMethodTextSelected,
                      ]}
                    >
                      Tarjeta
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notas (opcional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Instrucciones especiales para la entrega..."
                  value={notas}
                  onChangeText={setNotas}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowCheckout(false)}
                  disabled={procesandoCheckout}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleCheckout}
                  disabled={procesandoCheckout}
                >
                  <Text style={styles.confirmButtonText}>
                    {procesandoCheckout ? 'Procesando...' : metodoPago === 'tarjeta' ? 'Continuar con Pago' : 'Confirmar Pedido'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showStripe}
        animationType="slide"
        onRequestClose={handleStripeCancel}
      >
        <SafeAreaView style={styles.stripeModalContainer}>
          {pedidoCreado && (
            <StripePaymentForm
              monto={pedidoCreado.total}
              id_pedido={pedidoCreado.id}
              client_secret={pedidoCreado.client_secret}
              payment_intent_id={pedidoCreado.payment_intent_id}
              onSuccess={handleStripeSuccess}
              onError={handleStripeError}
              onCancel={handleStripeCancel}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    paddingTop: 15,
  },
  itemCard: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    padding: 15,
    marginBottom: 10,
    marginHorizontal: 15,
    borderRadius: 10,
    elevation: 2,
  },
  itemImagen: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#ddd',
  },
  itemImagenPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  itemImagenPlaceholderText: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  helpTextError: {
    color: '#d32f2f',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  paymentMethodButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  paymentMethodButtonSelected: {
    borderColor: '#2e7d32',
    backgroundColor: '#e8f5e9',
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  paymentMethodTextSelected: {
    color: '#2e7d32',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#2e7d32',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stripeModalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});



