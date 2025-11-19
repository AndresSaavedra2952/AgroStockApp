import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../context/AuthContext';
import productosService from '../service/ProductosService';
import ubicacionesService from '../service/UbicacionesService';

export default function CrearProductoModal({ visible, onClose, onSuccess }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    stock: '',
    stockMinimo: '10',
    id_ciudad_origen: user?.id_ciudad || null,
    unidadMedida: 'kg',
    pesoAprox: '',
  });
  const [imagen, setImagen] = useState(null);
  const [imagenBase64, setImagenBase64] = useState(null);
  const [loading, setLoading] = useState(false);

  const seleccionarImagen = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos', 'Se necesitan permisos para acceder a las imágenes');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true, // Obtener base64 directamente de ImagePicker
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setImagen(asset.uri);
      
      // Si ImagePicker devolvió base64, usarlo directamente
      if (asset.base64) {
        console.log('✅ ImagePicker devolvió base64 directamente');
        // Detectar tipo MIME
        let mimeType = 'image/jpeg';
        if (asset.type) {
          mimeType = asset.type;
        } else if (asset.uri.toLowerCase().includes('.png')) {
          mimeType = 'image/png';
        } else if (asset.uri.toLowerCase().includes('.gif')) {
          mimeType = 'image/gif';
        } else if (asset.uri.toLowerCase().includes('.webp')) {
          mimeType = 'image/webp';
        }
        
        const dataUri = `data:${mimeType};base64,${asset.base64}`;
        console.log(`✅ Imagen convertida a data URI: ${dataUri.substring(0, 50)}... (${dataUri.length} chars)`);
        setImagenBase64(dataUri);
      } else {
        console.log('⚠️ ImagePicker no devolvió base64, usando FileSystem');
        // Si no hay base64, intentar leerlo con FileSystem
        try {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          let mimeType = 'image/jpeg';
          const uriLower = asset.uri.toLowerCase();
          if (uriLower.includes('.png')) {
            mimeType = 'image/png';
          } else if (uriLower.includes('.gif')) {
            mimeType = 'image/gif';
          } else if (uriLower.includes('.webp')) {
            mimeType = 'image/webp';
          }
          
          setImagenBase64(`data:${mimeType};base64,${base64}`);
        } catch (error) {
          console.error('Error al leer imagen:', error);
          Alert.alert('Error', 'No se pudo procesar la imagen');
          setImagen(null);
          setImagenBase64(null);
        }
      }
    }
  };

  const crearProducto = async () => {
    if (!formData.nombre || !formData.descripcion || !formData.precio || !formData.stock) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      // Log para debugging
      console.log('📤 Creando producto con datos:', {
        nombre: formData.nombre,
        tieneImagen: !!imagenBase64,
        longitudImagen: imagenBase64 ? imagenBase64.length : 0,
        prefijoImagen: imagenBase64 ? imagenBase64.substring(0, 50) : 'N/A',
      });

      const productoData = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        precio: parseFloat(formData.precio),
        stock: parseInt(formData.stock),
        stock_minimo: parseInt(formData.stockMinimo),
        id_usuario: user.id,
        id_ciudad_origen: formData.id_ciudad_origen,
        unidad_medida: formData.unidadMedida || 'kg',
        disponible: true,
      };
      
      // Solo incluir imagenData si existe y es un string válido
      if (imagenBase64 && typeof imagenBase64 === 'string' && imagenBase64.length > 0) {
        productoData.imagenData = imagenBase64;
      }

      console.log('📤 Enviando productoData al backend:', {
        ...productoData,
        imagenData: imagenBase64 ? `${imagenBase64.substring(0, 50)}... (${imagenBase64.length} chars)` : 'null',
      });

      const response = await productosService.crearProducto(productoData);
      if (response.success) {
        if (response.warning) {
          Alert.alert('Producto creado', response.message, [
            { text: 'OK' }
          ]);
        } else {
          Alert.alert('Éxito', 'Producto creado correctamente');
        }
        resetForm();
        onSuccess && onSuccess();
        onClose();
      } else {
        Alert.alert('Error', response.message || 'No se pudo crear el producto');
      }
    } catch (error) {
      Alert.alert('Error', 'Error al crear el producto');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      precio: '',
      stock: '',
      stockMinimo: '10',
      id_ciudad_origen: user?.id_ciudad || null,
      unidadMedida: 'kg',
      pesoAprox: '',
    });
    setImagen(null);
    setImagenBase64(null);
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
            <Text style={styles.modalTitle}>Crear Producto</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView}>
            <Text style={styles.label}>Nombre del Producto *</Text>
            <TextInput
              style={styles.input}
              value={formData.nombre}
              onChangeText={(text) => setFormData({ ...formData, nombre: text })}
              placeholder="Ej: Tomate rojo"
            />

            <Text style={styles.label}>Descripción *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.descripcion}
              onChangeText={(text) => setFormData({ ...formData, descripcion: text })}
              placeholder="Describe tu producto"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Precio *</Text>
            <TextInput
              style={styles.input}
              value={formData.precio}
              onChangeText={(text) => setFormData({ ...formData, precio: text })}
              placeholder="0"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Stock *</Text>
            <TextInput
              style={styles.input}
              value={formData.stock}
              onChangeText={(text) => setFormData({ ...formData, stock: text })}
              placeholder="0"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Stock Mínimo</Text>
            <TextInput
              style={styles.input}
              value={formData.stockMinimo}
              onChangeText={(text) => setFormData({ ...formData, stockMinimo: text })}
              placeholder="10"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Unidad de Medida</Text>
            <TextInput
              style={styles.input}
              value={formData.unidadMedida}
              onChangeText={(text) => setFormData({ ...formData, unidadMedida: text })}
              placeholder="kg, litros, unidades..."
            />

            <Text style={styles.label}>Peso Aproximado</Text>
            <TextInput
              style={styles.input}
              value={formData.pesoAprox}
              onChangeText={(text) => setFormData({ ...formData, pesoAprox: text })}
              placeholder="0"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Imagen</Text>
            <TouchableOpacity style={styles.imageButton} onPress={seleccionarImagen}>
              {imagen ? (
                <Image source={{ uri: imagen }} style={styles.imagePreview} />
              ) : (
                <Text style={styles.imageButtonText}>Seleccionar Imagen</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={crearProducto}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Creando...' : 'Crear Producto'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
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
    fontSize: 24,
    color: '#666',
  },
  scrollView: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    marginTop: 15,
    color: '#333',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  imageButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    minHeight: 150,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  imageButtonText: {
    color: '#666',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#2e7d32',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

