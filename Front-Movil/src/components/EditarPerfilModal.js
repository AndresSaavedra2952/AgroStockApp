import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import usuariosService from '../service/UsuariosService';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../service/conexion';

export default function EditarPerfilModal({ visible, onClose, onSuccess }) {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
  });
  const [imagen, setImagen] = useState(null);
  const [imagenBase64, setImagenBase64] = useState(null);
  const [fotoPerfilUrl, setFotoPerfilUrl] = useState(null);

  useEffect(() => {
    if (visible && user) {
      setFormData({
        nombre: user.nombre || '',
        email: user.email || '',
        telefono: user.telefono || '',
        direccion: user.direccion || '',
      });
      
      // Cargar foto de perfil si existe
      if (user.foto_perfil) {
        const construirUrlImagen = (path) => {
          if (!path) return null;
          if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
          }
          let normalizedPath = path.replace(/\\/g, '/').replace(/\/+/g, '/');
          if (normalizedPath.startsWith('/uploads')) {
            return `${API_BASE_URL}${normalizedPath}`;
          }
          if (normalizedPath.startsWith('uploads')) {
            return `${API_BASE_URL}/${normalizedPath}`;
          }
          normalizedPath = normalizedPath.startsWith('/') 
            ? normalizedPath.substring(1) 
            : normalizedPath;
          return `${API_BASE_URL}/uploads/${normalizedPath}`;
        };
        setFotoPerfilUrl(construirUrlImagen(user.foto_perfil));
      } else {
        setFotoPerfilUrl(null);
      }
      
      // Resetear imagen seleccionada
      setImagen(null);
      setImagenBase64(null);
    }
  }, [visible, user]);

  const seleccionarImagen = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos', 'Se necesitan permisos para acceder a las imágenes');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setImagen(asset.uri);
      
      // Función para detectar el tipo MIME desde el contenido base64
      const detectarMimeTypeDesdeBase64 = (base64String) => {
        // Detectar desde las firmas de archivo en base64
        if (base64String.startsWith('iVBORw0KGgo')) {
          return 'image/png';
        } else if (base64String.startsWith('/9j/4AAQ') || base64String.startsWith('/9j/')) {
          return 'image/jpeg';
        } else if (base64String.startsWith('R0lGODlh') || base64String.startsWith('R0lGOD')) {
          return 'image/gif';
        } else if (base64String.startsWith('UklGR')) {
          return 'image/webp';
        }
        return 'image/jpeg'; // Por defecto
      };
      
      // Determinar el tipo MIME de la imagen
      let mimeType = 'image/jpeg'; // Por defecto
      
      if (asset.base64) {
        // Detectar desde el contenido base64
        mimeType = detectarMimeTypeDesdeBase64(asset.base64);
        
        // Si asset tiene type o mimeType, usarlo (tiene prioridad)
        if (asset.type && asset.type.startsWith('image/')) {
          mimeType = asset.type;
        } else if (asset.mimeType && asset.mimeType.startsWith('image/')) {
          mimeType = asset.mimeType;
        }
      } else {
        // Si no hay base64, intentar detectarlo desde la URI
        const uriLower = asset.uri.toLowerCase();
        if (uriLower.includes('.png')) {
          mimeType = 'image/png';
        } else if (uriLower.includes('.gif')) {
          mimeType = 'image/gif';
        } else if (uriLower.includes('.webp')) {
          mimeType = 'image/webp';
        } else if (uriLower.includes('.jpg') || uriLower.includes('.jpeg')) {
          mimeType = 'image/jpeg';
        }
      }
      
      console.log('📸 [seleccionarImagen] Tipo MIME detectado:', {
        mimeType,
        assetType: asset.type,
        assetMimeType: asset.mimeType,
        uri: asset.uri.substring(0, 50),
        base64Prefijo: asset.base64 ? asset.base64.substring(0, 20) : 'N/A'
      });
      
      if (asset.base64) {
        const dataUri = `data:${mimeType};base64,${asset.base64}`;
        console.log('✅ [seleccionarImagen] Data URI creado:', {
          prefijo: dataUri.substring(0, 50),
          longitud: dataUri.length,
          mimeType
        });
        setImagenBase64(dataUri);
      } else {
        try {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          // Detectar tipo desde el base64 leído
          const detectedMimeType = detectarMimeTypeDesdeBase64(base64);
          const dataUri = `data:${detectedMimeType};base64,${base64}`;
          console.log('✅ [seleccionarImagen] Data URI creado desde FileSystem:', {
            prefijo: dataUri.substring(0, 50),
            longitud: dataUri.length,
            mimeType: detectedMimeType
          });
          setImagenBase64(dataUri);
        } catch (error) {
          console.error('Error al leer imagen:', error);
          Alert.alert('Error', 'No se pudo procesar la imagen');
          setImagen(null);
          setImagenBase64(null);
        }
      }
    }
  };

  const subirFotoPerfil = async () => {
    if (!imagenBase64) {
      Alert.alert('Error', 'Por favor selecciona una imagen primero');
      return;
    }

    // Validar formato antes de enviar - debe ser data:image/[tipo];base64,...
    const dataUriPattern = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/i;
    if (!dataUriPattern.test(imagenBase64)) {
      console.error('❌ [subirFotoPerfil] Formato de imagen inválido:', {
        prefijo: imagenBase64.substring(0, 50),
        longitud: imagenBase64.length,
        empiezaConDataImage: imagenBase64.startsWith('data:image/'),
        tieneBase64: imagenBase64.includes('base64,')
      });
      Alert.alert('Error', 'Formato de imagen inválido. Por favor selecciona otra imagen.');
      return;
    }

    console.log('📤 [subirFotoPerfil] Enviando imagen:', {
      longitud: imagenBase64.length,
      prefijo: imagenBase64.substring(0, 50),
      tienePrefijoDataImage: imagenBase64.startsWith('data:image/')
    });

    setSubiendoImagen(true);
    try {
      const response = await usuariosService.subirFotoPerfil(imagenBase64);
      
      if (response.success) {
        // Actualizar la URL de la foto de perfil
        if (response.data && response.data.url) {
          setFotoPerfilUrl(response.data.url);
        }
        
        // Actualizar el usuario en el contexto
        const usuarioActualizado = {
          ...user,
          foto_perfil: response.data?.path || user.foto_perfil
        };
        await updateUser(usuarioActualizado);
        
        Alert.alert('Éxito', 'Foto de perfil actualizada correctamente');
        setImagen(null);
        setImagenBase64(null);
      } else {
        Alert.alert('Error', response.message || 'No se pudo subir la foto de perfil');
      }
    } catch (error) {
      console.error('Error al subir foto de perfil:', error);
      Alert.alert(
        'Error',
        error.message || error.error || 'No se pudo subir la foto de perfil'
      );
    } finally {
      setSubiendoImagen(false);
    }
  };

  const handleSave = async () => {
    // Validaciones básicas
    if (!formData.nombre.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    if (!formData.email.trim()) {
      Alert.alert('Error', 'El email es requerido');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Por favor ingresa un email válido');
      return;
    }

    setLoading(true);
    try {
      // Si hay una nueva imagen seleccionada, subirla primero
      if (imagenBase64) {
        await subirFotoPerfil();
      }

      const response = await usuariosService.actualizarPerfil({
        nombre: formData.nombre.trim(),
        email: formData.email.trim().toLowerCase(),
        telefono: formData.telefono.trim() || null,
        direccion: formData.direccion.trim() || null,
      });

      if (response.success) {
        // Actualizar el usuario en el contexto
        if (response.data) {
          await updateUser(response.data);
        }
        Alert.alert('Éxito', 'Perfil actualizado correctamente');
        onSuccess?.();
        onClose();
      } else {
        Alert.alert('Error', response.message || 'No se pudo actualizar el perfil');
      }
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      Alert.alert(
        'Error',
        error.message || error.error || 'No se pudo actualizar el perfil'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Editar Perfil</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Foto de Perfil */}
            <View style={styles.fotoPerfilContainer}>
              <Text style={styles.fotoPerfilLabel}>Foto de Perfil</Text>
              <TouchableOpacity 
                style={styles.fotoPerfilButton} 
                onPress={seleccionarImagen}
                disabled={subiendoImagen}
              >
                {(imagen || fotoPerfilUrl) ? (
                  <Image 
                    source={{ uri: imagen || fotoPerfilUrl }} 
                    style={styles.fotoPerfilPreview} 
                  />
                ) : (
                  <View style={styles.fotoPerfilPlaceholder}>
                    <Ionicons name="camera-outline" size={40} color="#999" />
                    <Text style={styles.fotoPerfilPlaceholderText}>Seleccionar Foto</Text>
                  </View>
                )}
              </TouchableOpacity>
              {imagenBase64 && !subiendoImagen && (
                <TouchableOpacity 
                  style={styles.subirFotoButton}
                  onPress={subirFotoPerfil}
                >
                  <Text style={styles.subirFotoButtonText}>Subir Foto</Text>
                </TouchableOpacity>
              )}
              {subiendoImagen && (
                <View style={styles.subiendoContainer}>
                  <ActivityIndicator size="small" color="#2e7d32" />
                  <Text style={styles.subiendoText}>Subiendo...</Text>
                </View>
              )}
            </View>

            {/* Campo Nombre */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabelContainer}>
                <Ionicons name="person-outline" size={18} color="#666" />
                <Text style={styles.inputLabel}>Nombre *</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Tu nombre completo"
                value={formData.nombre}
                onChangeText={(text) => setFormData({ ...formData, nombre: text })}
                placeholderTextColor="#999"
              />
            </View>

            {/* Campo Email */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabelContainer}>
                <Ionicons name="mail-outline" size={18} color="#666" />
                <Text style={styles.inputLabel}>Email *</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="tu@email.com"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#999"
              />
            </View>

            {/* Campo Teléfono */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabelContainer}>
                <Ionicons name="call-outline" size={18} color="#666" />
                <Text style={styles.inputLabel}>Teléfono</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Tu número de teléfono"
                value={formData.telefono}
                onChangeText={(text) => setFormData({ ...formData, telefono: text })}
                keyboardType="phone-pad"
                placeholderTextColor="#999"
              />
            </View>

            {/* Campo Dirección */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabelContainer}>
                <Ionicons name="location-outline" size={18} color="#666" />
                <Text style={styles.inputLabel}>Dirección</Text>
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tu dirección"
                value={formData.direccion}
                onChangeText={(text) => setFormData({ ...formData, direccion: text })}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                placeholderTextColor="#999"
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
    maxHeight: 500,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#2e7d32',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fotoPerfilContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  fotoPerfilLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  fotoPerfilButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  fotoPerfilPreview: {
    width: '100%',
    height: '100%',
  },
  fotoPerfilPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fotoPerfilPlaceholderText: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
  },
  subirFotoButton: {
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#2e7d32',
    borderRadius: 8,
  },
  subirFotoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  subiendoContainer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subiendoText: {
    fontSize: 14,
    color: '#666',
  },
});

