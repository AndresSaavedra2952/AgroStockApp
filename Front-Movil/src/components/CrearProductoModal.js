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
import { useAuth } from '../context/AuthContext';
import productosService from '../service/ProductosService';
import ubicacionesService from '../service/UbicacionesService';
import * as ImagePicker from 'expo-image-picker';

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
    });

    if (!result.canceled) {
      setImagen(result.assets[0].uri);
    }
  };

  const convertirImagenABase64 = async (uri) => {
    return null; // El backend manejará la imagen
  };

  const crearProducto = async () => {
    if (!formData.nombre || !formData.descripcion || !formData.precio || !formData.stock) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      const imagenData = await convertirImagenABase64(imagen);
      const productoData = {
        ...formData,
        id_usuario: user.id,
        precio: parseFloat(formData.precio),
        stock: parseInt(formData.stock),
        stockMinimo: parseInt(formData.stockMinimo),
        pesoAprox: parseFloat(formData.pesoAprox) || 0,
        imagenData: imagenData,
      };

      const response = await productosService.crearProducto(productoData);
      if (response.success) {
        Alert.alert('Éxito', 'Producto creado correctamente');
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

