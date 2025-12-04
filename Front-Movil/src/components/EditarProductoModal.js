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
  const [imagenesAdicionales, setImagenesAdicionales] = useState([]); // URLs de imágenes existentes
  const [imagenesAdicionalesNuevas, setImagenesAdicionalesNuevas] = useState([]); // URIs locales de nuevas imágenes con IDs únicos
  const [imagenesAdicionalesBase64, setImagenesAdicionalesBase64] = useState([]); // Base64 de nuevas imágenes con IDs únicos
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
      // Limpiar estados al abrir el modal para evitar duplicados
      setImagenesAdicionales([]);
      setImagenesAdicionalesNuevas([]);
      setImagenesAdicionalesBase64([]);
      setImagen(null);
      setImagenBase64(null);
      cargarDatos();
    }
  }, [visible, productoId]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Cargar producto - usar getProductoDetallado para obtener todas las imágenes
      const response = await productosService.getProductoDetallado(productoId);
      if (response.success && response.data) {
        const producto = response.data;
        
        console.log(`[EditarProductoModal] Producto cargado:`, {
          id: producto.id_producto,
          nombre: producto.nombre,
          imagenes_adicionales_tipo: typeof producto.imagenes_adicionales,
          imagenes_adicionales_valor: producto.imagenes_adicionales,
        });
        
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
            
            console.log(`[EditarProductoModal.cargarDatos] Imágenes adicionales parseadas desde BD:`, {
              cantidad: imagenesAdic.length,
              contenido: imagenesAdic.map((img, idx) => ({ indice: idx, ruta: img?.substring(0, 80) }))
            });
            
            const imagenesConUrl = imagenesAdic.map(img => {
              if (!img) return null;
              if (img.startsWith('http')) {
                console.log(`[EditarProductoModal.cargarDatos] Imagen ya tiene URL completa: ${img.substring(0, 80)}`);
                return img;
              }
              // Normalizar la ruta: eliminar barras iniciales y backslashes
              let rutaLimpia = img.replace(/\\/g, '/').replace(/^\/+/, '');
              // Si la ruta ya incluye 'uploads', no duplicar
              if (!rutaLimpia.startsWith('uploads/')) {
                rutaLimpia = 'uploads/' + rutaLimpia;
              }
              const urlCompleta = `${API_BASE_URL.replace(/\/+$/, '')}/${rutaLimpia}`;
              console.log(`[EditarProductoModal.cargarDatos] Construyendo URL: ${img} -> ${urlCompleta}`);
              return urlCompleta;
            }).filter(img => img !== null);
            
            console.log(`[EditarProductoModal.cargarDatos] ✅ ${imagenesConUrl.length} imágenes adicionales cargadas como existentes`);
            setImagenesAdicionales(imagenesConUrl);
          } catch (e) {
            console.error('Error al parsear imágenes adicionales:', e);
            console.error('Valor que causó el error:', producto.imagenes_adicionales);
          }
        } else {
          console.log(`[EditarProductoModal] No hay imágenes adicionales para este producto`);
          setImagenesAdicionales([]);
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
      allowsMultipleSelection: true, // Permitir seleccionar múltiples imágenes
      allowsEditing: false, // Desactivar edición para múltiples imágenes
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
          nuevasImagenes.push({ id: Date.now() + Math.random(), uri: nuevaImagen });
          nuevasImagenesBase64.push({ id: Date.now() + Math.random(), base64: nuevaImagenBase64 });
        }
      }
      
      if (nuevasImagenes.length > 0) {
        console.log(`[EditarProductoModal.seleccionarImagenAdicional] Agregando ${nuevasImagenes.length} nuevas imágenes`);
        console.log(`[EditarProductoModal.seleccionarImagenAdicional] Estado ANTES de agregar:`, {
          existentes: imagenesAdicionales.length,
          nuevas: imagenesAdicionalesNuevas.length,
          nuevasBase64: imagenesAdicionalesBase64.length
        });
        
        // Agregar las nuevas imágenes SIN modificar las existentes
        setImagenesAdicionalesNuevas(prev => {
          const nuevoEstado = [...prev, ...nuevasImagenes];
          console.log(`[EditarProductoModal.seleccionarImagenAdicional] Nuevo estado de nuevas imágenes: ${nuevoEstado.length}`);
          return nuevoEstado;
        });
        
        setImagenesAdicionalesBase64(prev => {
          const nuevoEstado = [...prev, ...nuevasImagenesBase64];
          console.log(`[EditarProductoModal.seleccionarImagenAdicional] Nuevo estado de nuevas imágenes base64: ${nuevoEstado.length}`);
          return nuevoEstado;
        });
        
        console.log(`[EditarProductoModal.seleccionarImagenAdicional] Estado DESPUÉS de agregar:`, {
          existentes: imagenesAdicionales.length, // No debería cambiar
          nuevas: imagenesAdicionalesNuevas.length + nuevasImagenes.length,
          nuevasBase64: imagenesAdicionalesBase64.length + nuevasImagenesBase64.length
        });
      }
    }
  };

  const eliminarImagenAdicional = (index, esExistente, idUnico = null) => {
    console.log(`[EditarProductoModal] ========== ELIMINANDO IMAGEN ADICIONAL ==========`);
    console.log(`[EditarProductoModal] Parámetros:`, { index, esExistente, idUnico });
    console.log(`[EditarProductoModal] Estado ANTES de eliminar:`, {
      existentes: imagenesAdicionales.length,
      existentesArray: imagenesAdicionales.map((img, i) => ({ indice: i, url: img?.substring(0, 80) })),
      nuevas: imagenesAdicionalesNuevas.length,
      nuevasBase64: imagenesAdicionalesBase64.length,
    });
    
    if (esExistente) {
      // Eliminar imagen existente (solo del estado local, se eliminará del servidor al guardar)
      const imagenAEliminar = imagenesAdicionales[index];
      console.log(`[EditarProductoModal] Imagen existente a eliminar (índice ${index}):`, imagenAEliminar?.substring(0, 80));
      
      // Crear una copia del array y eliminar el elemento en el índice especificado
      const nuevasImagenes = [...imagenesAdicionales];
      nuevasImagenes.splice(index, 1);
      
      console.log(`[EditarProductoModal] Estado DESPUÉS de eliminar existente:`, {
        antes: imagenesAdicionales.length,
        después: nuevasImagenes.length,
        nuevasImagenes: nuevasImagenes.map((img, i) => ({ indice: i, url: img?.substring(0, 80) }))
      });
      
      setImagenesAdicionales(nuevasImagenes);
    } else {
      // Eliminar imagen nueva (aún no guardada) usando ID único si está disponible
      let nuevasImagenes, nuevasImagenesBase64;
      
      if (idUnico) {
        // Usar ID único para eliminar (más seguro)
        nuevasImagenes = imagenesAdicionalesNuevas.filter(img => img.id !== idUnico);
        nuevasImagenesBase64 = imagenesAdicionalesBase64.filter(img => img.id !== idUnico);
      } else {
        // Fallback a índice si no hay ID único
        nuevasImagenes = imagenesAdicionalesNuevas.filter((_, i) => i !== index);
        nuevasImagenesBase64 = imagenesAdicionalesBase64.filter((_, i) => i !== index);
      }
      
      console.log(`[EditarProductoModal] Antes de eliminar nueva: ${imagenesAdicionalesNuevas.length}, después: ${nuevasImagenes.length}`);
      setImagenesAdicionalesNuevas(nuevasImagenes);
      setImagenesAdicionalesBase64(nuevasImagenesBase64);
    }
  };

  const guardarCambios = async () => {
    if (!formData.nombre || !formData.descripcion || !formData.precio || !formData.stock) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    console.log(`[EditarProductoModal.guardarCambios] ========== INICIANDO GUARDADO ==========`);
    console.log(`[EditarProductoModal.guardarCambios] Estado actual de imágenes:`, {
      existentes: imagenesAdicionales.length,
      existentesUrls: imagenesAdicionales.map((img, i) => ({ indice: i, url: img?.substring(0, 80) })),
      nuevas: imagenesAdicionalesNuevas.length,
      nuevasBase64: imagenesAdicionalesBase64.length,
    });

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

      // Incluir imágenes adicionales: las existentes que se mantienen + las nuevas
      // Necesitamos enviar las rutas de las imágenes existentes que se mantienen
      // y las nuevas imágenes en base64
      console.log(`[EditarProductoModal.guardarCambios] Preparando imágenes adicionales para enviar:`, {
        existentes: imagenesAdicionales.length,
        nuevas: imagenesAdicionalesNuevas.length,
        nuevasBase64: imagenesAdicionalesBase64.length,
      });
      
      const imagenesParaEnviar = [];
      
      // Agregar las imágenes existentes que se mantienen (extraer la ruta relativa de la URL)
      // Usar un Set para evitar duplicados
      const rutasExistentes = new Set();
      
      console.log(`[EditarProductoModal.guardarCambios] Procesando ${imagenesAdicionales.length} imágenes existentes`);
      console.log(`[EditarProductoModal.guardarCambios] API_BASE_URL: ${API_BASE_URL}`);
      
      imagenesAdicionales.forEach((imgUrl, idx) => {
        if (!imgUrl) {
          console.warn(`[EditarProductoModal.guardarCambios] ⚠️ Imagen existente ${idx + 1} es null/undefined, omitiendo`);
          return;
        }
        
        console.log(`[EditarProductoModal.guardarCambios] Procesando imagen existente ${idx + 1}:`, imgUrl.substring(0, 100));
        
        let rutaRelativa = null;
        
        // Normalizar la URL base para comparación (sin barra final)
        const apiBaseNormalized = API_BASE_URL.replace(/\/+$/, '');
        const imgUrlNormalized = imgUrl.trim();
        
        // Caso 1: URL completa que empieza con API_BASE_URL
        if (imgUrlNormalized.startsWith(apiBaseNormalized)) {
          rutaRelativa = imgUrlNormalized.replace(apiBaseNormalized, '').replace(/^\/+/, '');
          console.log(`[EditarProductoModal.guardarCambios] ✅ Ruta extraída desde URL completa: ${rutaRelativa}`);
        }
        // Caso 2: Ya es una ruta relativa (no empieza con http)
        else if (!imgUrlNormalized.startsWith('http://') && !imgUrlNormalized.startsWith('https://')) {
          rutaRelativa = imgUrlNormalized.replace(/^\/+/, '');
          console.log(`[EditarProductoModal.guardarCambios] ✅ Ruta relativa directa: ${rutaRelativa}`);
        }
        // Caso 3: URL completa de otro origen, intentar extraer ruta si contiene "uploads"
        else if (imgUrlNormalized.includes('uploads/')) {
          const match = imgUrlNormalized.match(/uploads\/.+$/);
          if (match) {
            rutaRelativa = match[0];
            console.log(`[EditarProductoModal.guardarCambios] ✅ Ruta extraída mediante regex (URL externa): ${rutaRelativa}`);
          }
        }
        
        // Validar que la ruta extraída sea válida
        if (!rutaRelativa || rutaRelativa.trim().length === 0) {
          console.error(`[EditarProductoModal.guardarCambios] ❌ No se pudo extraer ruta válida de imagen existente ${idx + 1}: ${imgUrl.substring(0, 100)}`);
          return;
        }
        
        // Normalizar la ruta (reemplazar backslashes por forward slashes)
        rutaRelativa = rutaRelativa.replace(/\\/g, '/');
        
        // Verificar que no sea duplicada
        if (rutasExistentes.has(rutaRelativa)) {
          console.warn(`[EditarProductoModal.guardarCambios] ⚠️ Imagen existente ${idx + 1} duplicada, omitiendo: ${rutaRelativa}`);
          return;
        }
        
        // Agregar a la lista
        rutasExistentes.add(rutaRelativa);
        imagenesParaEnviar.push(rutaRelativa);
        console.log(`[EditarProductoModal.guardarCambios] ✅ Agregada imagen existente ${idx + 1} a imagenesParaEnviar: ${rutaRelativa}`);
      });
      
      console.log(`[EditarProductoModal.guardarCambios] Total de imágenes existentes agregadas: ${imagenesParaEnviar.length}`);
      console.log(`[EditarProductoModal.guardarCambios] Rutas de imágenes existentes que se enviarán:`, imagenesParaEnviar.map((ruta, idx) => ({ indice: idx, ruta: ruta.substring(0, 80) })));
      
      console.log(`[EditarProductoModal.guardarCambios] Las ${imagenesAdicionalesBase64.length} imágenes nuevas se subirán después de actualizar el producto`);
      
      console.log(`[EditarProductoModal.guardarCambios] ========== RESUMEN FINAL ANTES DE ENVIAR ==========`);
      console.log(`[EditarProductoModal.guardarCambios] Estado de arrays:`, {
        imagenesAdicionales: imagenesAdicionales.length,
        imagenesAdicionalesNuevas: imagenesAdicionalesNuevas.length,
        imagenesAdicionalesBase64: imagenesAdicionalesBase64.length,
        imagenesParaEnviar: imagenesParaEnviar.length,
        desgloseImagenesParaEnviar: {
          rutasExistentes: imagenesParaEnviar.filter(img => typeof img === 'string' && !img.startsWith('data:image/')).length,
          base64Nuevas: imagenesParaEnviar.filter(img => typeof img === 'string' && img.startsWith('data:image/')).length
        }
      });
      console.log(`[EditarProductoModal.guardarCambios] Contenido completo de imagenesParaEnviar:`, imagenesParaEnviar.map((img, idx) => ({
        indice: idx,
        tipo: typeof img,
        esBase64: typeof img === 'string' && img.startsWith('data:image/'),
        esRuta: typeof img === 'string' && !img.startsWith('data:image/'),
        preview: typeof img === 'string' ? (img.startsWith('data:image/') ? 'base64...' : img.substring(0, 80)) : String(img)
      })));
      console.log(`[EditarProductoModal.guardarCambios] Contenido de imagenesParaEnviar:`, imagenesParaEnviar.map((img, idx) => ({
        indice: idx,
        tipo: typeof img,
        esBase64: typeof img === 'string' && img.startsWith('data:image/'),
        esRuta: typeof img === 'string' && !img.startsWith('data:image/'),
        preview: typeof img === 'string' ? (img.startsWith('data:image/') ? img.substring(0, 50) + '...' : img.substring(0, 80)) : String(img)
      })));
      
      // VALIDACIÓN CRÍTICA: Asegurar que siempre se envíen las imágenes existentes + nuevas
      if (imagenesParaEnviar.length === 0 && imagenesAdicionales.length > 0) {
        console.error(`[EditarProductoModal.guardarCambios] ❌❌❌ ERROR CRÍTICO: Hay ${imagenesAdicionales.length} imágenes existentes pero imagenesParaEnviar está vacío!`);
        console.error(`[EditarProductoModal.guardarCambios] Esto NO debería pasar. Reintentando extracción de rutas...`);
        
        // Reintentar extraer rutas de las imágenes existentes
        imagenesAdicionales.forEach((imgUrl, idx) => {
          if (!imgUrl) return;
          
          const apiBaseNormalized = API_BASE_URL.replace(/\/+$/, '');
          const imgUrlNormalized = imgUrl.trim();
          let rutaRelativa = null;
          
          if (imgUrlNormalized.startsWith(apiBaseNormalized)) {
            rutaRelativa = imgUrlNormalized.replace(apiBaseNormalized, '').replace(/^\/+/, '');
          } else if (!imgUrlNormalized.startsWith('http://') && !imgUrlNormalized.startsWith('https://')) {
            rutaRelativa = imgUrlNormalized.replace(/^\/+/, '');
          } else if (imgUrlNormalized.includes('uploads/')) {
            const match = imgUrlNormalized.match(/uploads\/.+$/);
            if (match) rutaRelativa = match[0];
          }
          
          if (rutaRelativa) {
            rutaRelativa = rutaRelativa.replace(/\\/g, '/');
            if (!imagenesParaEnviar.includes(rutaRelativa)) {
              imagenesParaEnviar.push(rutaRelativa);
              console.log(`[EditarProductoModal.guardarCambios] ✅ Recuperada imagen existente ${idx + 1}: ${rutaRelativa}`);
            }
          }
        });
      }
      
      if (imagenesParaEnviar.length > 0) {
        productoData.imagenes_adicionales = imagenesParaEnviar;
        console.log(`[EditarProductoModal.guardarCambios] ✅ Enviando ${imagenesParaEnviar.length} rutas de imágenes existentes`);
      } else {
        productoData.imagenes_adicionales = [];
        console.log(`[EditarProductoModal.guardarCambios] ⚠️ Enviando array vacío (no hay imágenes existentes para mantener)`);
      }

      console.log(`[EditarProductoModal.guardarCambios] ========== ENVIANDO AL BACKEND ==========`);
      console.log(`[EditarProductoModal.guardarCambios] Resumen final:`, {
        imagenesExistentes: imagenesAdicionales.length,
        imagenesNuevas: imagenesAdicionalesNuevas.length,
        totalParaEnviar: imagenesParaEnviar.length,
        desglose: {
          rutasExistentes: imagenesParaEnviar.filter(img => !img.startsWith('data:image/')).length,
          base64Nuevas: imagenesParaEnviar.filter(img => img.startsWith('data:image/')).length
        }
      });
      
      console.log(`[EditarProductoModal.guardarCambios] ========== ENVIANDO AL BACKEND ==========`);
      console.log(`[EditarProductoModal.guardarCambios] Resumen final ANTES de enviar:`, {
        imagenesExistentes: imagenesAdicionales.length,
        imagenesNuevas: imagenesAdicionalesNuevas.length,
        totalParaEnviar: imagenesParaEnviar.length,
        desglose: {
          rutasExistentes: imagenesParaEnviar.filter(img => typeof img === 'string' && !img.startsWith('data:image/')).length,
          base64Nuevas: imagenesParaEnviar.filter(img => typeof img === 'string' && img.startsWith('data:image/')).length
        },
        contenidoCompleto: imagenesParaEnviar.map((img, idx) => ({
          indice: idx,
          tipo: typeof img,
          esBase64: typeof img === 'string' && img.startsWith('data:image/'),
          esRuta: typeof img === 'string' && !img.startsWith('data:image/'),
          preview: typeof img === 'string' ? (img.startsWith('data:image/') ? 'base64...' : img.substring(0, 80)) : String(img)
        }))
      });
      
      const response = await productosService.actualizarProducto(productoId, productoData);
      if (response.success) {
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
              'Producto actualizado',
              `El producto se actualizó correctamente, pero ${imagenesFallidas} de ${imagenesAdicionalesBase64.length} imágenes adicionales no se pudieron subir.`,
              [
                {
                  text: 'OK',
                  onPress: () => {
                    onSuccess && onSuccess();
                    onClose();
                  }
                }
              ]
            );
            return;
          }
        }
        
        try {
          const productoResponse = await productosService.getProductoDetallado(productoId);
          if (productoResponse.success && productoResponse.data) {
            const producto = productoResponse.data;
            
            if (producto.imagenes_adicionales) {
              let imagenesAdic = [];
              try {
                if (typeof producto.imagenes_adicionales === 'string') {
                  imagenesAdic = JSON.parse(producto.imagenes_adicionales);
                } else if (Array.isArray(producto.imagenes_adicionales)) {
                  imagenesAdic = producto.imagenes_adicionales;
                }
                
                const imagenesConUrl = imagenesAdic.map(img => {
                  if (!img) return null;
                  if (img.startsWith('http')) return img;
                  let rutaLimpia = img.replace(/\\/g, '/').replace(/^\/+/, '');
                  if (!rutaLimpia.startsWith('uploads/')) {
                    rutaLimpia = 'uploads/' + rutaLimpia;
                  }
                  const urlCompleta = `${API_BASE_URL.replace(/\/+$/, '')}/${rutaLimpia}`;
                  return urlCompleta;
                }).filter(img => img !== null);
                
                setImagenesAdicionales(imagenesConUrl);
              } catch (e) {
                console.error('Error al recargar imágenes adicionales:', e);
              }
            } else {
              setImagenesAdicionales([]);
            }
          }
        } catch (reloadError) {
          console.error('Error al recargar producto después de guardar:', reloadError);
        }
        
        setImagenesAdicionalesNuevas([]);
        setImagenesAdicionalesBase64([]);
        
        // Esperar un momento para que el servidor procese todo
        await new Promise(resolve => setTimeout(resolve, 500));
        
        Alert.alert('Éxito', 'Producto actualizado correctamente', [
          {
            text: 'OK',
            onPress: () => {
              onSuccess && onSuccess();
              onClose();
            }
          }
        ]);
      } else {
        console.error(`[EditarProductoModal.guardarCambios] ❌ Error al actualizar producto:`, response);
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
              {/* Mostrar imágenes existentes */}
              {imagenesAdicionales.map((img, index) => {
                // Usar la URL como key para evitar problemas con índices
                const imgKey = img ? `existente-${img.substring(img.length - 50)}` : `existente-${index}`;
                return (
                  <View key={imgKey} style={styles.imagenAdicionalItem}>
                    <Image source={{ uri: img }} style={styles.imagenAdicionalPreview} />
                    <TouchableOpacity
                      style={styles.eliminarImagenButton}
                      onPress={() => {
                        console.log(`[EditarProductoModal] Eliminando imagen existente en índice ${index}`);
                        eliminarImagenAdicional(index, true);
                      }}
                    >
                      <Ionicons name="close-circle" size={24} color="#d32f2f" />
                    </TouchableOpacity>
                  </View>
                );
              })}
              
              {/* Mostrar imágenes nuevas */}
              {imagenesAdicionalesNuevas.map((imgObj, index) => {
                const imgUri = typeof imgObj === 'object' && imgObj.uri ? imgObj.uri : imgObj;
                const imgId = typeof imgObj === 'object' && imgObj.id ? imgObj.id : null;
                return (
                  <View key={`nueva-${imgId || index}`} style={styles.imagenAdicionalItem}>
                    <Image source={{ uri: imgUri }} style={styles.imagenAdicionalPreview} />
                    <TouchableOpacity
                      style={styles.eliminarImagenButton}
                      onPress={() => eliminarImagenAdicional(index, false, imgId)}
                    >
                      <Ionicons name="close-circle" size={24} color="#d32f2f" />
                    </TouchableOpacity>
                  </View>
                );
              })}
              
              {/* Botón para agregar más imágenes */}
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
    marginRight: 10,
  },
  imagenAdicionalPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  eliminarImagenButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  agregarImagenButton: {
    width: 100,
    height: 100,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2e7d32',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  agregarImagenText: {
    fontSize: 12,
    color: '#2e7d32',
    marginTop: 5,
    fontWeight: '600',
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
