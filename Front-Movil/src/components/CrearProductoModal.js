import React, { useState, useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import productosService from '../service/ProductosService';
import categoriasService from '../service/CategoriasService';
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
    id_categoria: null,
  });
  const [imagen, setImagen] = useState(null);
  const [imagenBase64, setImagenBase64] = useState(null);
  const [imagenesAdicionalesNuevas, setImagenesAdicionalesNuevas] = useState([]);
  const [imagenesAdicionalesBase64, setImagenesAdicionalesBase64] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [mostrarSelectorCategoria, setMostrarSelectorCategoria] = useState(false);

  useEffect(() => {
    if (visible) {
      cargarCategorias();
    }
  }, [visible]);

  const cargarCategorias = async () => {
    try {
      const response = await categoriasService.getCategorias();
      if (response.success && response.categorias) {
        setCategorias(response.categorias);
      }
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

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

  const seleccionarImagenAdicional = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos', 'Se necesitan permisos para acceder a las imágenes');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const nuevasImagenes = [];
      const nuevasImagenesBase64 = [];
      
      for (const asset of result.assets) {
        const nuevaImagen = asset.uri;
        
        let nuevaImagenBase64 = null;
        if (asset.base64) {
          let mimeType = 'jpeg';
          if (asset.type) {
            if (asset.type.startsWith('image/')) {
              mimeType = asset.type.replace('image/', '');
            } else {
              mimeType = asset.type;
            }
          } else if (asset.uri.toLowerCase().includes('.png')) {
            mimeType = 'png';
          } else if (asset.uri.toLowerCase().includes('.gif')) {
            mimeType = 'gif';
          } else if (asset.uri.toLowerCase().includes('.webp')) {
            mimeType = 'webp';
          }
          nuevaImagenBase64 = `data:image/${mimeType};base64,${asset.base64}`;
        } else {
          try {
            const base64 = await FileSystem.readAsStringAsync(asset.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            let mimeType = 'jpeg';
            const uriLower = asset.uri.toLowerCase();
            if (uriLower.includes('.png')) {
              mimeType = 'png';
            } else if (uriLower.includes('.gif')) {
              mimeType = 'gif';
            } else if (uriLower.includes('.webp')) {
              mimeType = 'webp';
            }
            nuevaImagenBase64 = `data:image/${mimeType};base64,${base64}`;
          } catch (error) {
            console.error('Error al leer imagen:', error);
            continue;
          }
        }
        
        if (nuevaImagenBase64) {
          const idUnico = Date.now() + Math.random();
          nuevasImagenes.push({ id: idUnico, uri: nuevaImagen });
          nuevasImagenesBase64.push({ id: idUnico, base64: nuevaImagenBase64 });
        }
      }
      
      if (nuevasImagenes.length > 0) {
        setImagenesAdicionalesNuevas(prev => [...prev, ...nuevasImagenes]);
        setImagenesAdicionalesBase64(prev => [...prev, ...nuevasImagenesBase64]);
      }
    }
  };

  const eliminarImagenAdicional = (idUnico) => {
    setImagenesAdicionalesNuevas(prev => prev.filter(img => img.id !== idUnico));
    setImagenesAdicionalesBase64(prev => prev.filter(img => img.id !== idUnico));
  };

  const crearProducto = async () => {
    if (!formData.nombre || !formData.descripcion || !formData.precio || !formData.stock) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    // Verificar que tenemos imagenBase64 antes de continuar
    if (!imagenBase64) {
      console.log('⚠️ ADVERTENCIA: No hay imagen seleccionada');
      Alert.alert(
        'Advertencia', 
        'No has seleccionado una imagen. El producto se creará sin imagen.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar sin imagen', onPress: () => crearProductoSinImagen() }
        ]
      );
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

      // Verificar que imagenBase64 es válido
      if (!imagenBase64 || typeof imagenBase64 !== 'string' || imagenBase64.length === 0) {
        console.error('❌ imagenBase64 no es válido:', {
          existe: !!imagenBase64,
          tipo: typeof imagenBase64,
          longitud: imagenBase64 ? imagenBase64.length : 0
        });
        Alert.alert('Error', 'La imagen no es válida. Por favor selecciona otra imagen.');
        setLoading(false);
        return;
      }

      const productoData = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        precio: parseFloat(formData.precio),
        stock: parseInt(formData.stock),
        stock_minimo: parseInt(formData.stockMinimo),
        id_usuario: user.id,
        id_ciudad_origen: formData.id_ciudad_origen,
        id_categoria: formData.id_categoria || null,
        unidad_medida: formData.unidadMedida || 'kg',
        disponible: true,
        imagenData: imagenBase64,
      };
      
      console.log('✅ imagenData incluido en productoData:', {
        longitud: imagenBase64.length,
        prefijo: imagenBase64.substring(0, 50),
        tienePrefijoData: imagenBase64.startsWith('data:image/'),
        tipo: typeof imagenBase64,
        imagenDataEnProductoData: productoData.imagenData ? 'SÍ' : 'NO'
      });

      // Verificar que imagenData esté en productoData antes de enviar
      const tieneImagenData = 'imagenData' in productoData && productoData.imagenData;
      if (!tieneImagenData) {
        console.error('❌ ERROR CRÍTICO: imagenData no está en productoData antes de enviar!');
        console.error('Claves en productoData:', Object.keys(productoData));
        Alert.alert('Error', 'Error al preparar la imagen. Por favor intenta de nuevo.');
        setLoading(false);
        return;
      }

      console.log('📤 Verificación antes de enviar:', {
        tieneImagenData,
        claves: Object.keys(productoData),
        tamañoProductoData: JSON.stringify(productoData).length,
        imagenDataEnProductoData: tieneImagenData ? 
          `${productoData.imagenData.substring(0, 50)}... (${productoData.imagenData.length} chars)` : 
          'NO PRESENTE'
      });

      console.log('📤 Enviando productoData al backend:', {
        nombre: productoData.nombre,
        precio: productoData.precio,
        stock: productoData.stock,
        tieneImagenData: !!productoData.imagenData,
        imagenDataSize: productoData.imagenData ? productoData.imagenData.length : 0,
        imagenDataPrefijo: productoData.imagenData ? productoData.imagenData.substring(0, 50) : 'N/A'
      });

      const response = await productosService.crearProducto(productoData);
      
      console.log('📥 Respuesta del backend:', {
        success: response.success,
        message: response.message,
        tieneProducto: !!response.data,
        imagenPrincipal: response.data?.imagen_principal || 'NO HAY',
        productoId: response.data?.id_producto || 'NO HAY'
      });
      
      if (response.success && response.data?.id_producto) {
        const productoId = response.data.id_producto;
        
        if (imagenesAdicionalesBase64.length > 0) {
          let imagenesSubidas = 0;
          let imagenesFallidas = 0;
          
          for (const imgObj of imagenesAdicionalesBase64) {
            try {
              let base64Data = imgObj.base64 || imgObj;
              
              if (!base64Data || typeof base64Data !== 'string') {
                console.error('Error: base64Data no es válido:', typeof base64Data);
                imagenesFallidas++;
                continue;
              }
              
              base64Data = base64Data.trim();
              
              if (!base64Data.startsWith('data:image/')) {
                console.error('Error: base64Data no tiene el formato correcto. Prefijo:', base64Data.substring(0, 50));
                imagenesFallidas++;
                continue;
              }
              
              console.log('📤 Subiendo imagen adicional:', {
                productoId,
                longitud: base64Data.length,
                prefijo: base64Data.substring(0, 50),
                tieneDataImage: base64Data.startsWith('data:image/')
              });
              
              await productosService.subirImagenAdicional(productoId, {
                imageData: base64Data
              });
              imagenesSubidas++;
            } catch (error) {
              console.error('Error subiendo imagen adicional:', error);
              imagenesFallidas++;
            }
          }
          
          if (imagenesFallidas > 0) {
            Alert.alert(
              'Producto creado',
              `El producto se creó correctamente, pero ${imagenesFallidas} de ${imagenesAdicionalesBase64.length} imágenes adicionales no se pudieron subir.`,
              [{ text: 'OK' }]
            );
          }
        }
        
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
      console.error('❌ Error al crear producto:', error);
      console.error('Error completo:', JSON.stringify(error, null, 2));
      Alert.alert('Error', error.message || 'Error al crear el producto');
    } finally {
      setLoading(false);
    }
  };

  // Función para crear producto sin imagen (fallback)
  const crearProductoSinImagen = async () => {
    setLoading(true);
    try {
      const productoData = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        precio: parseFloat(formData.precio),
        stock: parseInt(formData.stock),
        stock_minimo: parseInt(formData.stockMinimo),
        id_usuario: user.id,
        id_ciudad_origen: formData.id_ciudad_origen,
        id_categoria: formData.id_categoria || null,
        unidad_medida: formData.unidadMedida || 'kg',
        disponible: true,
      };

      const response = await productosService.crearProducto(productoData);
      if (response.success) {
        Alert.alert('Éxito', 'Producto creado correctamente (sin imagen)');
        resetForm();
        onSuccess && onSuccess();
        onClose();
      } else {
        Alert.alert('Error', response.message || 'No se pudo crear el producto');
      }
    } catch (error) {
      console.error('Error al crear producto sin imagen:', error);
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
      id_categoria: null,
    });
    setImagen(null);
    setImagenBase64(null);
    setImagenesAdicionalesNuevas([]);
    setImagenesAdicionalesBase64([]);
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

            <Text style={styles.label}>Categoría</Text>
            <TouchableOpacity
              style={styles.selectorButton}
              onPress={() => setMostrarSelectorCategoria(!mostrarSelectorCategoria)}
            >
              <Text style={styles.selectorText}>
                {formData.id_categoria
                  ? categorias.find(c => c.id_categoria === formData.id_categoria)?.nombre || 'Seleccionar categoría'
                  : 'Seleccionar categoría'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
            {mostrarSelectorCategoria && (
              <View style={styles.selectorListContainer}>
                <ScrollView 
                  style={styles.selectorList}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                >
                  <TouchableOpacity
                    style={styles.selectorItem}
                    onPress={() => {
                      setFormData({ ...formData, id_categoria: null });
                      setMostrarSelectorCategoria(false);
                    }}
                  >
                    <Text style={styles.selectorItemText}>Sin categoría</Text>
                  </TouchableOpacity>
                  {categorias.map((cat) => (
                    <TouchableOpacity
                      key={cat.id_categoria}
                      style={styles.selectorItem}
                      onPress={() => {
                        setFormData({ ...formData, id_categoria: cat.id_categoria });
                        setMostrarSelectorCategoria(false);
                      }}
                    >
                      <Text style={styles.selectorItemText} numberOfLines={1}>{cat.nombre}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text style={styles.label}>Peso Aproximado</Text>
            <TextInput
              style={styles.input}
              value={formData.pesoAprox}
              onChangeText={(text) => setFormData({ ...formData, pesoAprox: text })}
              placeholder="0"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Imagen Principal</Text>
            <TouchableOpacity style={styles.imageButton} onPress={seleccionarImagen}>
              {imagen ? (
                <Image source={{ uri: imagen }} style={styles.imagePreview} />
              ) : (
                <Text style={styles.imageButtonText}>Seleccionar Imagen</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Imágenes Adicionales</Text>
            <View style={styles.imagenesAdicionalesContainer}>
              {imagenesAdicionalesNuevas.map((imgObj) => {
                const imgUri = typeof imgObj === 'object' && imgObj.uri ? imgObj.uri : imgObj;
                const imgId = typeof imgObj === 'object' && imgObj.id ? imgObj.id : null;
                return (
                  <View key={`nueva-${imgId}`} style={styles.imagenAdicionalItem}>
                    <Image source={{ uri: imgUri }} style={styles.imagenAdicionalPreview} />
                    <TouchableOpacity
                      style={styles.eliminarImagenButton}
                      onPress={() => eliminarImagenAdicional(imgId)}
                    >
                      <Ionicons name="close-circle" size={24} color="#d32f2f" />
                    </TouchableOpacity>
                  </View>
                );
              })}
              
              <TouchableOpacity
                style={styles.agregarImagenButton}
                onPress={seleccionarImagenAdicional}
              >
                <Ionicons name="add-circle-outline" size={40} color="#2e7d32" />
                <Text style={styles.agregarImagenText}>Agregar Imagen</Text>
              </TouchableOpacity>
            </View>

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
  selectorButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorText: {
    fontSize: 16,
    color: '#333',
  },
  selectorListContainer: {
    marginTop: 5,
    maxHeight: 200,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  selectorList: {
    maxHeight: 200,
  },
  selectorItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectorItemText: {
    fontSize: 16,
    color: '#333',
  },
  imagenesAdicionalesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  imagenAdicionalItem: {
    width: 100,
    height: 100,
    borderRadius: 10,
    position: 'relative',
    marginBottom: 10,
  },
  imagenAdicionalPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  eliminarImagenButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  agregarImagenButton: {
    width: 100,
    height: 100,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  agregarImagenText: {
    marginTop: 5,
    fontSize: 12,
    color: '#2e7d32',
    textAlign: 'center',
  },
});

