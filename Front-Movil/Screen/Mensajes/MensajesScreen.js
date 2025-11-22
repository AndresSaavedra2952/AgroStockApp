import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import mensajesService from '../../src/service/MensajesService';
import { useAuth } from '../../src/context/AuthContext';

export default function MensajesScreen({ navigation }) {
  const { user } = useAuth();
  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensajeSeleccionado, setMensajeSeleccionado] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalResponderVisible, setModalResponderVisible] = useState(false);
  const [asuntoRespuesta, setAsuntoRespuesta] = useState('');
  const [mensajeRespuesta, setMensajeRespuesta] = useState('');

  useEffect(() => {
    cargarMensajes();
  }, []);

  const cargarMensajes = async () => {
    setLoading(true);
    try {
      console.log('📥 [MensajesScreen] Cargando mensajes recibidos...');
      console.log('📥 [MensajesScreen] Usuario actual:', {
        id: user?.id,
        id_usuario: user?.id_usuario,
        nombre: user?.nombre,
        rol: user?.rol,
      });
      
      const response = await mensajesService.getMensajesRecibidos();
      console.log('📥 [MensajesScreen] Respuesta completa:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        const mensajesData = response.data || response.mensajes || [];
        console.log(`📥 [MensajesScreen] Se encontraron ${mensajesData.length} mensajes`);
        console.log('📥 [MensajesScreen] Mensajes:', JSON.stringify(mensajesData, null, 2));
        
        // Debug: mostrar información de debug si está disponible
        if (response.debug) {
          console.log('🔍 [MensajesScreen] Debug info:', JSON.stringify(response.debug, null, 2));
        }
        
        setMensajes(mensajesData);
      } else {
        console.error('❌ [MensajesScreen] Respuesta sin éxito:', response);
        setMensajes([]);
      }
    } catch (error) {
      console.error('❌ [MensajesScreen] Error al cargar mensajes:', error);
      console.error('❌ [MensajesScreen] Error completo:', JSON.stringify(error, null, 2));
      Alert.alert('Error', `No se pudieron cargar los mensajes: ${error.message || error.error || 'Error desconocido'}`);
      setMensajes([]);
    } finally {
      setLoading(false);
    }
  };

  const marcarComoLeido = async (idMensaje) => {
    try {
      await mensajesService.marcarComoLeido(idMensaje);
      cargarMensajes();
    } catch (error) {
      console.error('Error al marcar como leído:', error);
    }
  };

  const abrirDetalleMensaje = (mensaje) => {
    setMensajeSeleccionado(mensaje);
    setModalVisible(true);
    if (!mensaje.leido) {
      marcarComoLeido(mensaje.id_mensaje);
    }
  };

  const abrirResponder = () => {
    if (mensajeSeleccionado) {
      setAsuntoRespuesta(`Re: ${mensajeSeleccionado.asunto}`);
      setModalResponderVisible(true);
    }
  };

  const enviarRespuesta = async () => {
    if (!asuntoRespuesta.trim() || !mensajeRespuesta.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    try {
      const response = await mensajesService.enviarMensaje(
        mensajeSeleccionado.id_remitente,
        asuntoRespuesta,
        mensajeRespuesta,
        mensajeSeleccionado.id_producto || null,
        'respuesta'
      );

      if (response.success) {
        Alert.alert('Éxito', 'Respuesta enviada correctamente');
        setModalResponderVisible(false);
        setAsuntoRespuesta('');
        setMensajeRespuesta('');
        cargarMensajes();
      } else {
        Alert.alert('Error', response.message || 'No se pudo enviar la respuesta');
      }
    } catch (error) {
      console.error('Error al enviar respuesta:', error);
      Alert.alert('Error', 'No se pudo enviar la respuesta. Intenta nuevamente.');
    }
  };

  const renderMensaje = ({ item }) => (
    <TouchableOpacity
      style={[styles.mensajeCard, !item.leido && styles.mensajeNoLeido]}
      onPress={() => abrirDetalleMensaje(item)}
    >
      <View style={styles.mensajeHeader}>
        <View style={styles.mensajeHeaderLeft}>
          <Ionicons 
            name={item.leido ? "mail-open-outline" : "mail-unread-outline"} 
            size={20} 
            color={item.leido ? "#999" : "#2196f3"} 
          />
          <Text style={styles.mensajeRemitente}>{item.nombre_remitente || 'Usuario'}</Text>
        </View>
        {!item.leido && <View style={styles.puntoNoLeido} />}
      </View>
      <Text style={styles.mensajeAsunto}>{item.asunto}</Text>
      <Text style={styles.mensajeTexto} numberOfLines={2}>
        {item.mensaje}
      </Text>
      {item.nombre_producto && (
        <View style={styles.productoInfo}>
          <Ionicons name="cube-outline" size={14} color="#666" />
          <Text style={styles.productoTexto}>{item.nombre_producto}</Text>
        </View>
      )}
      <Text style={styles.mensajeFecha}>
        {new Date(item.fecha_envio).toLocaleString()}
      </Text>
    </TouchableOpacity>
  );

  const probarMensajes = async () => {
    try {
      console.log('🔍 [MensajesScreen] Ejecutando prueba de mensajes...');
      console.log('🔍 [MensajesScreen] Usuario actual:', JSON.stringify(user, null, 2));
      
      // Cargar mensajes normalmente primero
      const response = await mensajesService.getMensajesRecibidos();
      console.log('🔍 [MensajesScreen] Respuesta normal:', JSON.stringify(response, null, 2));
      
      Alert.alert(
        'Debug - Mensajes', 
        `Usuario ID: ${user?.id || 'N/A'}\n` +
        `Mensajes encontrados: ${response.data?.length || 0}\n` +
        `Total en respuesta: ${response.total || 0}\n\n` +
        `Revisa los logs del servidor para más detalles.`
      );
      
      // Recargar mensajes después de la prueba
      cargarMensajes();
    } catch (error) {
      console.error('❌ Error en prueba:', error);
      Alert.alert('Error', error.message || 'No se pudo ejecutar la prueba');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Mensajes</Text>
          <TouchableOpacity onPress={probarMensajes} style={styles.debugButton}>
            <Ionicons name="bug-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>
          {mensajes.filter(m => !m.leido).length} sin leer
        </Text>
      </View>

      <FlatList
        data={mensajes}
        renderItem={renderMensaje}
        keyExtractor={(item) => item.id_mensaje.toString()}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={cargarMensajes} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="mail-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No tienes mensajes</Text>
          </View>
        }
      />

      {/* Modal de detalle del mensaje */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {mensajeSeleccionado && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Detalle del Mensaje</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalBody}>
                  <View style={styles.detalleSection}>
                    <Text style={styles.detalleLabel}>De:</Text>
                    <Text style={styles.detalleValue}>
                      {mensajeSeleccionado.nombre_remitente || 'Usuario'}
                    </Text>
                  </View>
                  
                  {mensajeSeleccionado.email_remitente && (
                    <View style={styles.detalleSection}>
                      <Text style={styles.detalleLabel}>Email:</Text>
                      <Text style={styles.detalleValue}>
                        {mensajeSeleccionado.email_remitente}
                      </Text>
                    </View>
                  )}

                  {mensajeSeleccionado.nombre_producto && (
                    <View style={styles.detalleSection}>
                      <Text style={styles.detalleLabel}>Producto:</Text>
                      <Text style={styles.detalleValue}>
                        {mensajeSeleccionado.nombre_producto}
                      </Text>
                    </View>
                  )}

                  <View style={styles.detalleSection}>
                    <Text style={styles.detalleLabel}>Asunto:</Text>
                    <Text style={styles.detalleValue}>
                      {mensajeSeleccionado.asunto}
                    </Text>
                  </View>

                  <View style={styles.detalleSection}>
                    <Text style={styles.detalleLabel}>Fecha:</Text>
                    <Text style={styles.detalleValue}>
                      {new Date(mensajeSeleccionado.fecha_envio).toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.detalleSection}>
                    <Text style={styles.detalleLabel}>Mensaje:</Text>
                    <Text style={styles.detalleMensaje}>
                      {mensajeSeleccionado.mensaje}
                    </Text>
                  </View>
                </ScrollView>
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.responderButton}
                    onPress={abrirResponder}
                  >
                    <Ionicons name="arrow-undo-outline" size={20} color="#fff" />
                    <Text style={styles.responderButtonText}>Responder</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal para responder */}
      <Modal
        visible={modalResponderVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalResponderVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Responder Mensaje</Text>
              <TouchableOpacity onPress={() => setModalResponderVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {mensajeSeleccionado && (
                <>
                  <View style={styles.detalleSection}>
                    <Text style={styles.detalleLabel}>Para:</Text>
                    <Text style={styles.detalleValue}>
                      {mensajeSeleccionado.nombre_remitente || 'Usuario'}
                    </Text>
                  </View>

                  <Text style={styles.modalLabel}>Asunto:</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={asuntoRespuesta}
                    onChangeText={setAsuntoRespuesta}
                    placeholder="Asunto de la respuesta"
                    placeholderTextColor="#999"
                  />

                  <Text style={styles.modalLabel}>Mensaje:</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalTextArea]}
                    value={mensajeRespuesta}
                    onChangeText={setMensajeRespuesta}
                    placeholder="Escribe tu respuesta aquí..."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                  />

                  <TouchableOpacity
                    style={styles.enviarButton}
                    onPress={enviarRespuesta}
                  >
                    <Ionicons name="send" size={20} color="#fff" />
                    <Text style={styles.enviarButtonText}>Enviar Respuesta</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
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
  header: {
    backgroundColor: '#fff',
    paddingTop: 20,
    paddingBottom: 15,
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  debugButton: {
    backgroundColor: '#ff9800',
    padding: 8,
    borderRadius: 8,
  },
  mensajeCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 10,
    elevation: 2,
  },
  mensajeNoLeido: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  mensajeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mensajeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mensajeRemitente: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  puntoNoLeido: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2196f3',
  },
  mensajeAsunto: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  mensajeTexto: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  productoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
    padding: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  productoTexto: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  mensajeFecha: {
    fontSize: 12,
    color: '#999',
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
    marginTop: 16,
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
  detalleSection: {
    marginBottom: 15,
  },
  detalleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  detalleValue: {
    fontSize: 16,
    color: '#333',
  },
  detalleMensaje: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginTop: 8,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  responderButton: {
    backgroundColor: '#2e7d32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
  },
  responderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 6,
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
    minHeight: 120,
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



