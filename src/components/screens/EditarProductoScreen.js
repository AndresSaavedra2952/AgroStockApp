import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import productosService from '../../service/ProductosService';

export default function EditarProductoScreen({ route, navigation }) {
  const { productoId } = route.params;
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    stock: '',
    stockMinimo: '',
    unidadMedida: '',
    pesoAprox: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    cargarProducto();
  }, []);

  const cargarProducto = async () => {
    try {
      const response = await productosService.getProductoPorId(productoId);
      if (response.success && response.data) {
        const producto = response.data;
        setFormData({
          nombre: producto.nombre || '',
          descripcion: producto.descripcion || '',
          precio: producto.precio?.toString() || '',
          stock: producto.stock?.toString() || '',
          stockMinimo: producto.stockMinimo?.toString() || '',
          unidadMedida: producto.unidadMedida || '',
          pesoAprox: producto.pesoAprox?.toString() || '',
        });
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el producto');
    } finally {
      setLoading(false);
    }
  };

  const guardarCambios = async () => {
    if (!formData.nombre || !formData.descripcion || !formData.precio || !formData.stock) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    setSaving(true);
    try {
      const productoData = {
        ...formData,
        precio: parseFloat(formData.precio),
        stock: parseInt(formData.stock),
        stockMinimo: parseInt(formData.stockMinimo),
        pesoAprox: parseFloat(formData.pesoAprox) || 0,
      };

      const response = await productosService.actualizarProducto(productoId, productoData);
      if (response.success) {
        Alert.alert('Éxito', 'Producto actualizado correctamente', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', response.message || 'No se pudo actualizar el producto');
      }
    } catch (error) {
      Alert.alert('Error', 'Error al actualizar el producto');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Nombre del Producto *</Text>
        <TextInput
          style={styles.input}
          value={formData.nombre}
          onChangeText={(text) => setFormData({ ...formData, nombre: text })}
        />

        <Text style={styles.label}>Descripción *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.descripcion}
          onChangeText={(text) => setFormData({ ...formData, descripcion: text })}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Precio *</Text>
        <TextInput
          style={styles.input}
          value={formData.precio}
          onChangeText={(text) => setFormData({ ...formData, precio: text })}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Stock *</Text>
        <TextInput
          style={styles.input}
          value={formData.stock}
          onChangeText={(text) => setFormData({ ...formData, stock: text })}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Stock Mínimo</Text>
        <TextInput
          style={styles.input}
          value={formData.stockMinimo}
          onChangeText={(text) => setFormData({ ...formData, stockMinimo: text })}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Unidad de Medida</Text>
        <TextInput
          style={styles.input}
          value={formData.unidadMedida}
          onChangeText={(text) => setFormData({ ...formData, unidadMedida: text })}
        />

        <TouchableOpacity
          style={[styles.submitButton, saving && styles.submitButtonDisabled]}
          onPress={guardarCambios}
          disabled={saving}
        >
          <Text style={styles.submitButtonText}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
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
    backgroundColor: '#fff',
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
  submitButton: {
    backgroundColor: '#2e7d32',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 30,
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

