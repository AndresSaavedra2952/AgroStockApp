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
  Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import productosService from '../service/ProductosService';
import categoriasService from '../service/CategoriasService';
import ubicacionesService from '../service/UbicacionesService';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../service/conexion';

export default function EditarProductoModal({ visible, onClose, productoId, onSuccess }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    stock: '',
    stockMinimo: '',
    unidadMedida: 'kg',
    id_categoria: null,
    id_ciudad_origen: null,
    disponible: true,
    id_usuario: null,
  });
  const [imagen, setImagen] = useState(null);
  const [imagenBase64, setImagenBase64] = useState(null);
  const [imagenesAdicionales, setImagenesAdicionales] = useState([]);
  const [imagenesAdicionalesBase64, setImagenesAdicionalesBase64] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Selectores
  const [categorias, setCategorias] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState(null);
  const [mostrarSelectorCategoria, setMostrarSelectorCategoria] = useState(false);
  const [mostrarSelectorDepartamento, setMostrarSelectorDepartamento] = useState(false);
  const [mostrarSelectorCiudad, setMostrarSelectorCiudad] = useState(false);

  useEffect(() => {
    if (visible && productoId) {
      cargarDatos();
    }
  }, [visible, productoId]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Cargar producto
      const response = await productosService.getProductoPorId(productoId);
      if (response.success && response.data) {
        const producto = response.data;
        
        // Cargar imagen principal si existe
        if (producto.imagenUrl || producto.imagen_principal) {
          setImagen(producto.imagenUrl || `${API_BASE_URL}/${producto.imagen_principal}`);
        }
        
        // Cargar imágenes adicionales si existen
        if (producto.imagenes_adicionales) {
          let imagenesAdic = [];
          try {
            if (typeof producto.imagenes_adicionales === 'string') {
              imagenesAdic = JSON.parse(producto.imagenes_adicionales);
            } else if (Array.isArray(producto.imagenes_adicionales)) {
              imagenesAdic = producto.imagenes_adicionales;
            }
            
            const imagenesConUrl = imagenesAdic.map(img => {
              if (img.startsWith('http')) return img;
              return `${API_BASE_URL}/${img}`;
            });
            setImagenesAdicionales(imagenesConUrl);
          } catch (e) {
            console.error('Error al parsear imágenes adicionales:', e);
          }
        }
        
        setFormData({
          nombre: producto.nombre || '',
          descripcion: producto.descripcion || '',
          precio: producto.precio?.toString() || '',
          stock: producto.stock?.toString() || '',
          stockMinimo: producto.stock_minimo?.toString() || '',
          unidadMedida: producto.unidad_medida || 'kg',
          id_categoria: producto.id_categoria || null,
          id_ciudad_origen: producto.id_ciudad_origen || null,
          disponible: producto.disponible !== false && producto.disponible !== 0,
          id_usuario: producto.id_usuario || user?.id || null,
        });
        
        // Si tiene ciudad, cargar región y departamento
        if (producto.id_ciudad_origen) {
          await cargarUbicacionCompleta(producto.id_ciudad_origen);
        }
      }
      
      // Cargar listas de selección
      await Promise.all([
        cargarCategorias(),
        cargarDepartamentos(),
      ]);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      Alert.alert('Error', 'No se pudo cargar el producto');
    } finally {
      setLoading(false);
    }
  };

  const cargarUbicacionCompleta = async (idCiudad) => {
    try {
      const ciudadesResponse = await ubicacionesService.getCiudades();
      if (ciudadesResponse.success && ciudadesResponse.data) {
        const ciudad = ciudadesResponse.data.find(c => c.id_ciudad === idCiudad);
        if (ciudad) {
          setDepartamentoSeleccionado(ciudad.id_departamento);
          await cargarDepartamentos();
          await cargarCiudades(ciudad.id_departamento);
        }
      }
    } catch (error) {
      console.error('Error al cargar ubicación completa:', error);
    }
  };

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

  const cargarDepartamentos = async () => {
    try {
      const response = await ubicacionesService.getDepartamentos();
      if (response.success && response.data) {
        setDepartamentos(response.data);
        if (departamentoSeleccionado) {
          await cargarCiudades(departamentoSeleccionado);
        }
      }
    } catch (error) {
      console.error('Error al cargar departamentos:', error);
    }
  };

  const cargarCiudades = async (idDepartamento) => {
    try {
      const response = await ubicacionesService.getCiudades(idDepartamento);
      if (response.success && response.data) {
        setCiudades(response.data);
      }
    } catch (error) {
      console.error('Error al cargar ciudades:', error);
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
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setImagen(asset.uri);
      
      if (asset.base64) {
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
        setImagenBase64(dataUri);
      } else {
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
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const nuevaImagen = asset.uri;
      
      let nuevaImagenBase64 = null;
      if (asset.base64) {
        let mimeType = 'image/jpeg';
        if (asset.type) {
          mimeType = asset.type;
        } else if (asset.uri.toLowerCase().includes('.png')) {
          mimeType = 'image/png';
        }
        nuevaImagenBase64 = `data:${mimeType};base64,${asset.base64}`;
      } else {
        try {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          let mimeType = 'image/jpeg';
          const uriLower = asset.uri.toLowerCase();
          if (uriLower.includes('.png')) {
            mimeType = 'image/png';
          }
          nuevaImagenBase64 = `data:${mimeType};base64,${base64}`;
        } catch (error) {
          console.error('Error al leer imagen:', error);
          Alert.alert('Error', 'No se pudo procesar la imagen');
          return;
        }
      }
      
      setImagenesAdicionales([...imagenesAdicionales, nuevaImagen]);
      setImagenesAdicionalesBase64([...imagenesAdicionalesBase64, nuevaImagenBase64]);
    }
  };

  const eliminarImagenAdicional = (index) => {
    const nuevasImagenes = imagenesAdicionales.filter((_, i) => i !== index);
    const nuevasImagenesBase64 = imagenesAdicionalesBase64.filter((_, i) => i !== index);
    setImagenesAdicionales(nuevasImagenes);
    setImagenesAdicionalesBase64(nuevasImagenesBase64);
  };

  const guardarCambios = async () => {
    if (!formData.nombre || !formData.descripcion || !formData.precio || !formData.stock) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    setSaving(true);
    try {
      const productoData = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        precio: parseFloat(formData.precio),
        stock: parseInt(formData.stock),
        stock_minimo: parseInt(formData.stockMinimo) || 0,
        unidad_medida: formData.unidadMedida || 'kg',
        id_categoria: formData.id_categoria || null,
        id_ciudad_origen: formData.id_ciudad_origen || null,
        disponible: formData.disponible, // Enviar como boolean, no como número
        id_usuario: formData.id_usuario || user?.id, // Incluir id_usuario
      };

      // Incluir imagen principal si se seleccionó una nueva
      if (imagenBase64) {
        productoData.imagenData = imagenBase64;
      }

      // Incluir imágenes adicionales solo si hay nuevas (base64)
      // Las imágenes existentes (URLs) no se envían, solo las nuevas
      if (imagenesAdicionalesBase64.length > 0) {
        productoData.imagenes_adicionales = imagenesAdicionalesBase64;
      }

      const response = await productosService.actualizarProducto(productoId, productoData);
      if (response.success) {
        Alert.alert('Éxito', 'Producto actualizado correctamente');
        onSuccess && onSuccess();
        onClose();
      } else {
        Alert.alert('Error', response.message || 'No se pudo actualizar el producto');
      }
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      Alert.alert('Error', 'Error al actualizar el producto');
    } finally {
      setSaving(false);
    }
  };

  const categoriaSeleccionada = categorias.find(c => c.id_categoria === formData.id_categoria);
  const ciudadSeleccionada = ciudades.find(c => c.id_ciudad === formData.id_ciudad_origen);

  if (loading) {
    return (
      <Modal visible={visible} transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text>Cargando...</Text>
          </View>
        </View>
      </Modal>
    );
  }

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
            <Text style={styles.modalTitle}>Editar Producto</Text>
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
                {categoriaSeleccionada ? categoriaSeleccionada.nombre : 'Seleccionar categoría'}
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

            <Text style={styles.label}>Ciudad de Origen</Text>
            <Text style={styles.label}>Departamento</Text>
            <TouchableOpacity
              style={styles.selectorButton}
              onPress={() => {
                setMostrarSelectorDepartamento(!mostrarSelectorDepartamento);
                if (!mostrarSelectorDepartamento) {
                  cargarDepartamentos();
                }
              }}
            >
              <Text style={styles.selectorText}>
                {departamentoSeleccionado
                  ? departamentos.find(d => d.id_departamento === departamentoSeleccionado)?.nombre || 'Seleccionar departamento'
                  : 'Seleccionar departamento'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
            {mostrarSelectorDepartamento && (
              <View style={styles.selectorListContainer}>
                <ScrollView 
                  style={styles.selectorList}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                >
                  {departamentos.map((depto) => (
                    <TouchableOpacity
                      key={depto.id_departamento}
                      style={styles.selectorItem}
                      onPress={async () => {
                        setDepartamentoSeleccionado(depto.id_departamento);
                        setMostrarSelectorDepartamento(false);
                        await cargarCiudades(depto.id_departamento);
                        setMostrarSelectorCiudad(true);
                      }}
                    >
                      <Text style={styles.selectorItemText} numberOfLines={1}>{depto.nombre}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {departamentoSeleccionado && (
              <>
                <Text style={styles.label}>Ciudad</Text>
                <TouchableOpacity
                  style={styles.selectorButton}
                  onPress={() => setMostrarSelectorCiudad(!mostrarSelectorCiudad)}
                >
                  <Text style={styles.selectorText}>
                    {ciudadSeleccionada ? ciudadSeleccionada.nombre : 'Seleccionar ciudad'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
                {mostrarSelectorCiudad && (
                  <View style={styles.selectorListContainer}>
                    <ScrollView 
                      style={styles.selectorList}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                    >
                      {ciudades.map((ciudad) => (
                        <TouchableOpacity
                          key={ciudad.id_ciudad}
                          style={styles.selectorItem}
                          onPress={() => {
                            setFormData({ ...formData, id_ciudad_origen: ciudad.id_ciudad });
                            setMostrarSelectorCiudad(false);
                          }}
                        >
                          <Text style={styles.selectorItemText} numberOfLines={1}>{ciudad.nombre}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            )}

            <View style={styles.switchContainer}>
              <Text style={styles.label}>Disponible</Text>
              <Switch
                value={formData.disponible}
                onValueChange={(value) => setFormData({ ...formData, disponible: value })}
                trackColor={{ false: '#d32f2f', true: '#2e7d32' }}
                thumbColor={formData.disponible ? '#fff' : '#fff'}
              />
            </View>

            <Text style={styles.label}>Imagen Principal</Text>
            <TouchableOpacity style={styles.imageButton} onPress={seleccionarImagen}>
              {imagen ? (
                <Image source={{ uri: imagen }} style={styles.imagePreview} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={40} color="#ccc" />
                  <Text style={styles.imageButtonText}>Cambiar Imagen</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Imágenes Adicionales</Text>
            <View style={styles.imagenesAdicionalesContainer}>
              {imagenesAdicionales.map((img, index) => (
                <View key={index} style={styles.imagenAdicionalItem}>
                  <Image source={{ uri: img }} style={styles.imagenAdicionalPreview} />
                  <TouchableOpacity
                    style={styles.eliminarImagenButton}
                    onPress={() => eliminarImagenAdicional(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#d32f2f" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={styles.agregarImagenButton}
                onPress={seleccionarImagenAdicional}
              >
                <Ionicons name="add-circle" size={40} color="#2e7d32" />
                <Text style={styles.agregarImagenText}>Agregar Imagen</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, saving && styles.submitButtonDisabled]}
              onPress={guardarCambios}
              disabled={saving}
            >
              <Text style={styles.submitButtonText}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
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
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 5,
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
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageButtonText: {
    color: '#666',
    fontSize: 16,
    marginTop: 10,
  },
  imagenesAdicionalesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  imagenAdicionalItem: {
    position: 'relative',
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  imagenAdicionalPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  eliminarImagenButton: {
    position: 'absolute',
    top: -8,
    right: -8,
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
    fontSize: 12,
    color: '#666',
    marginTop: 5,
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
