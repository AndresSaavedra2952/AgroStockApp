import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import mensajesService from '../../src/service/MensajesService';
import { useAuth } from '../../src/context/AuthContext';

export default function ChatIndividualScreen({ route, navigation }) {
  const { userId, nombreUsuario, emailUsuario } = route.params;
  const { user } = useAuth();
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [asunto, setAsunto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const flatListRef = useRef(null);

  useEffect(() => {
    cargarConversacion();
    // Recargar cada 3 segundos para actualizar en tiempo real
    const interval = setInterval(() => {
      cargarConversacion();
    }, 3000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    // Scroll al final cuando hay nuevos mensajes
    if (mensajes.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [mensajes.length]);

  const cargarConversacion = async () => {
    try {
      const response = await mensajesService.obtenerConversacion(userId);
      if (response.success) {
        const datos = response.data || [];
        // Ordenar por fecha (más antiguos primero)
        const ordenados = datos.sort((a, b) => {
          const fechaA = new Date(a.fecha_envio || a.fecha_creacion).getTime();
          const fechaB = new Date(b.fecha_envio || b.fecha_creacion).getTime();
          return fechaA - fechaB;
        });
        setMensajes(ordenados);
        
        // Si hay mensajes no leídos, marcarlos como leídos
        ordenados.forEach(msg => {
          if (!msg.leido && msg.id_remitente === userId && msg.id_destinatario === user?.id_usuario) {
            mensajesService.marcarComoLeido(msg.id_mensaje).catch(console.error);
          }
        });
      }
    } catch (error) {
      console.error('Error al cargar conversación:', error);
    } finally {
      setCargando(false);
    }
  };

  const enviarMensaje = async () => {
    if (!nuevoMensaje.trim()) return;

    const mensajeTexto = nuevoMensaje.trim();
    const asuntoTexto = asunto.trim() || 'Mensaje';
    
    setEnviando(true);
    try {
      const response = await mensajesService.enviarMensaje(
        userId,
        asuntoTexto,
        mensajeTexto,
        null,
        'general'
      );
      
      if (response.success) {
        setNuevoMensaje('');
        setAsunto('');
        cargarConversacion();
      } else {
        alert('Error al enviar el mensaje');
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      alert('Error al enviar el mensaje');
    } finally {
      setEnviando(false);
    }
  };

  const formatMessageDate = (fecha) => {
    if (!fecha) return '';
    const date = new Date(fecha);
    if (isNaN(date.getTime())) return '';
    const ahora = new Date();
    const diffMs = ahora - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)}h`;
    
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderMensaje = ({ item }) => {
    const esPropio = item.id_remitente === user?.id_usuario;
    const fechaMensaje = formatMessageDate(item.fecha_envio || item.fecha_creacion);
    
    return (
      <View style={[styles.mensajeContainer, esPropio ? styles.mensajePropio : styles.mensajeOtro]}>
        <View style={[styles.mensajeBurbuja, esPropio ? styles.burbujaPropia : styles.burbujaOtro]}>
          {!esPropio && (
            <Text style={styles.mensajeRemitente}>
              {item.nombre_remitente || nombreUsuario}
            </Text>
          )}
          {item.asunto && item.asunto !== 'Sin asunto' && (
            <Text style={styles.mensajeAsunto}>{item.asunto}</Text>
          )}
          <Text style={styles.mensajeTexto}>{item.mensaje}</Text>
          <Text style={styles.mensajeFecha}>{fechaMensaje}</Text>
        </View>
      </View>
    );
  };

  if (cargando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={styles.loadingText}>Cargando conversación...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerNombre}>{nombreUsuario}</Text>
          {emailUsuario && (
            <Text style={styles.headerEmail}>{emailUsuario}</Text>
          )}
        </View>
      </View>

      {/* Área de mensajes */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={mensajes}
          renderItem={renderMensaje}
          keyExtractor={(item) => item.id_mensaje?.toString() || `${item.fecha_envio}-${Math.random()}`}
          contentContainerStyle={styles.mensajesList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>Aún no hay mensajes en esta conversación</Text>
            </View>
          }
        />

        {/* Input de asunto (solo si no hay mensajes o es el primer mensaje) */}
        {mensajes.length === 0 && (
          <View style={styles.asuntoContainer}>
            <TextInput
              style={styles.asuntoInput}
              placeholder="Asunto (opcional)"
              value={asunto}
              onChangeText={setAsunto}
              placeholderTextColor="#999"
            />
          </View>
        )}

        {/* Input de mensaje */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            value={nuevoMensaje}
            onChangeText={setNuevoMensaje}
            multiline
            maxLength={1000}
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            style={[styles.sendButton, (!nuevoMensaje.trim() || enviando) && styles.sendButtonDisabled]}
            onPress={enviarMensaje}
            disabled={!nuevoMensaje.trim() || enviando}
          >
            {enviando ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e5ddd5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e5ddd5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  header: {
    backgroundColor: '#2e7d32',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 10,
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerEmail: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  chatContainer: {
    flex: 1,
  },
  mensajesList: {
    padding: 16,
    paddingBottom: 20,
  },
  mensajeContainer: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  mensajePropio: {
    justifyContent: 'flex-end',
  },
  mensajeOtro: {
    justifyContent: 'flex-start',
  },
  mensajeBurbuja: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  burbujaPropia: {
    backgroundColor: '#dcf8c6',
    borderBottomRightRadius: 4,
  },
  burbujaOtro: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  mensajeRemitente: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  mensajeAsunto: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  mensajeTexto: {
    fontSize: 15,
    color: '#1f2933',
    lineHeight: 20,
  },
  mensajeFecha: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  asuntoContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  asuntoInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2e7d32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
    textAlign: 'center',
  },
});

