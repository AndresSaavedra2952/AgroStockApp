import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import productosService from '../../src/service/ProductosService';
import categoriasService from '../../src/service/CategoriasService';
import { useAutoRefresh } from '../../src/hooks/useAutoRefresh';

const { width } = Dimensions.get('window');

// Iconos para categorías
const categoriaIcons = {
  'Frutas': 'nutrition',
  'Verduras': 'leaf',
  'Carnes': 'restaurant',
  'Lácteos': 'water',
  'Granos': 'cube',
  'Artesanías': 'brush',
};

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [categorias, setCategorias] = useState([]);
  const [productosDestacados, setProductosDestacados] = useState([]);
  const [rateLimited, setRateLimited] = useState(false);
  
  // NO redirigir aquí - la navegación se maneja en AppNavegacion.js
  // Si el usuario está autenticado, AppNavegacion.js ya lo redirige automáticamente

  // Solo hacer peticiones si NO hay rate limiting y el usuario NO está autenticado
  // (porque si está autenticado, no debería estar en esta pantalla)
  const shouldFetch = !user && !rateLimited;
  
  const { data: productosData, loading, refresh, error } = useAutoRefresh(
    () => productosService.getProductos({ limite: 6, orden: 'precio_asc' }),
    60000,
    shouldFetch
  );

  // Detectar errores 429 y deshabilitar auto-refresh
  React.useEffect(() => {
    if (error && (error.status === 429 || error.error === 'Demasiadas solicitudes')) {
      console.warn('⚠️ Rate limit detectado, deshabilitando auto-refresh');
      setRateLimited(true);
      // Re-habilitar después de 10 minutos
      setTimeout(() => {
        setRateLimited(false);
      }, 10 * 60 * 1000);
    }
  }, [error]);

  useEffect(() => {
    // Solo cargar categorías si no hay rate limiting y el usuario no está autenticado
    if (!user && !rateLimited) {
      cargarCategorias();
    }
  }, [user, rateLimited]);

  useEffect(() => {
    if (productosData?.data) {
      setProductosDestacados(productosData.data.slice(0, 6));
    }
  }, [productosData]);

  const cargarCategorias = async () => {
    try {
      const response = await categoriasService.getCategorias();
      if (response.success) {
        setCategorias(response.data || []);
      }
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const getCategoriaIcon = (nombre) => {
    const nombreLower = nombre?.toLowerCase() || '';
    for (const [key, icon] of Object.entries(categoriaIcons)) {
      if (nombreLower.includes(key.toLowerCase())) {
        return icon;
      }
    }
    return 'cube-outline';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header con botones de Login/Registro si no está autenticado */}
      {!user && (
        <View style={styles.headerContainer}>
          <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="leaf" size={24} color="#2e7d32" />
            <Text style={styles.headerTitle}>AgroStock</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.headerButtonText}>Iniciar Sesión</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButtonPrimary}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.headerButtonPrimaryText}>Registrarse</Text>
            </TouchableOpacity>
          </View>
          </View>
        </View>
      )}
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
      <View style={styles.heroSection}>
        <LinearGradient
          colors={['#2e7d32', '#1b5e20']}
          style={styles.heroGradient}
        >
          <View style={styles.heroContent}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Plataforma #1 en Agricultura</Text>
            </View>
            <Text style={styles.heroTitle}>
              Conectamos el Campo{'\n'}
              <Text style={styles.heroTitleAccent}>con tu Mesa</Text>
            </Text>
            <Text style={styles.heroDescription}>
              Productos frescos directamente de productores locales. Apoya la agricultura colombiana mientras disfrutas de la mejor calidad.
            </Text>
            <View style={styles.heroButtons}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => {
                  if (user) {
                    navigation.navigate('Productos');
                  } else {
                    navigation.navigate('Register');
                  }
                }}
              >
                <Text style={styles.primaryButtonText}>Comenzar Ahora</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  if (user) {
                    navigation.navigate('Productos');
                  } else {
                    navigation.navigate('Productos');
                  }
                }}
              >
                <Text style={styles.secondaryButtonText}>Explorar Productos</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Ver Todos los Productos Button */}
      <View style={styles.viewAllSection}>
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => navigation.navigate('Productos')}
        >
          <Text style={styles.viewAllText}>Ver Todos los Productos</Text>
          <Ionicons name="arrow-forward" size={20} color="#1976d2" />
        </TouchableOpacity>
      </View>

      {/* Categorías Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="grid" size={24} color="#333" />
          <Text style={styles.sectionTitle}>Explora por Categorías</Text>
        </View>
        <Text style={styles.sectionSubtitle}>Encuentra productos organizados por tipo</Text>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriasContainer}
        >
          {categorias.slice(0, 6).map((categoria) => (
            <TouchableOpacity
              key={categoria.id_categoria}
              style={styles.categoriaCard}
              onPress={() => navigation.navigate('Productos', { categoriaId: categoria.id_categoria })}
            >
              <View style={styles.categoriaIconContainer}>
                <Ionicons
                  name={getCategoriaIcon(categoria.nombre)}
                  size={32}
                  color="#2e7d32"
                />
              </View>
              <Text style={styles.categoriaNombre}>{categoria.nombre}</Text>
              <Text style={styles.categoriaDescripcion} numberOfLines={2}>
                {categoria.descripcion || 'Productos frescos'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#999" style={styles.categoriaArrow} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Beneficios Section */}
      <View style={styles.beneficiosSection}>
        <Text style={styles.beneficiosTitle}>
          Beneficios que te <Text style={styles.beneficiosTitleAccent}>impulsan</Text>
        </Text>
        
        <View style={styles.beneficiosGrid}>
          <View style={styles.beneficioCard}>
            <View style={styles.beneficioIcon}>
              <Ionicons name="flash" size={24} color="#2e7d32" />
            </View>
            <Text style={styles.beneficioTitle}>Envío Rápido</Text>
            <Text style={styles.beneficioDescription}>
              Recibe tus productos frescos en tiempo récord
            </Text>
          </View>

          <View style={styles.beneficioCard}>
            <View style={styles.beneficioIcon}>
              <Ionicons name="checkmark-circle" size={24} color="#2e7d32" />
            </View>
            <Text style={styles.beneficioTitle}>Calidad Garantizada</Text>
            <Text style={styles.beneficioDescription}>
              Productos verificados directamente del productor
            </Text>
          </View>

          <View style={styles.beneficioCard}>
            <View style={styles.beneficioIcon}>
              <Ionicons name="cash" size={24} color="#2e7d32" />
            </View>
            <Text style={styles.beneficioTitle}>Precios Justos</Text>
            <Text style={styles.beneficioDescription}>
              Sin intermediarios, precios directos del campo
            </Text>
          </View>

          <View style={styles.beneficioCard}>
            <View style={styles.beneficioIcon}>
              <Ionicons name="headset" size={24} color="#2e7d32" />
            </View>
            <Text style={styles.beneficioTitle}>Soporte 24/7</Text>
            <Text style={styles.beneficioDescription}>
              Estamos aquí para ayudarte cuando lo necesites
            </Text>
          </View>
        </View>
      </View>

      {/* Productos Destacados */}
      {productosDestacados.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Productos Destacados</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Productos')}>
              <Text style={styles.verTodos}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productosContainer}
          >
            {productosDestacados.map((producto) => (
              <TouchableOpacity
                key={producto.id_producto}
                style={styles.productoCard}
                onPress={() => navigation.navigate('ProductoDetalle', { productoId: producto.id_producto })}
              >
                {producto.imagen_url || producto.imagenUrl ? (
                  <Image
                    source={{ uri: producto.imagen_url || producto.imagenUrl }}
                    style={styles.productoImagen}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.productoImagen, styles.productoImagenPlaceholder]}>
                    <Ionicons name="image-outline" size={40} color="#ccc" />
                  </View>
                )}
                <View style={styles.productoInfo}>
                  <Text style={styles.productoNombre} numberOfLines={2}>
                    {producto.nombre}
                  </Text>
                  <Text style={styles.productoPrecio}>
                    ${producto.precio?.toLocaleString('es-CO')}
                  </Text>
                  <Text style={styles.productoStock}>
                    Stock: {producto.stock || 0}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerContent}>
          <View style={styles.footerSection}>
            <Text style={styles.footerTitle}>AgroStock</Text>
            <Text style={styles.footerDescription}>
              Conectamos productores agrícolas con consumidores. Productos frescos del campo directamente a tu mesa.
            </Text>
          </View>
          
          <View style={styles.footerSection}>
            <Text style={styles.footerTitle}>Contacto</Text>
            <View style={styles.footerContact}>
              <Ionicons name="mail" size={16} color="#fff" />
              <Text style={styles.footerText}>contacto@agrostock.com</Text>
            </View>
            <View style={styles.footerContact}>
              <Ionicons name="call" size={16} color="#fff" />
              <Text style={styles.footerText}>+57 (1) 234 5678</Text>
            </View>
            <View style={styles.footerContact}>
              <Ionicons name="location" size={16} color="#fff" />
              <Text style={styles.footerText}>Boyacá, Colombia</Text>
            </View>
          </View>
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerButtonText: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '600',
  },
  headerButtonPrimary: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  headerButtonPrimaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  heroSection: {
    height: 400,
  },
  heroGradient: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  heroContent: {
    alignItems: 'center',
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 40,
  },
  heroTitleAccent: {
    color: '#ffd700',
  },
  heroDescription: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
    opacity: 0.9,
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  heroButtons: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#1976d2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#fff',
    paddingVertical: 15,
    borderRadius: 10,
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  viewAllSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1976d2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  viewAllText: {
    color: '#1976d2',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  categoriasContainer: {
    paddingRight: 20,
  },
  categoriaCard: {
    width: 160,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoriaIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  categoriaNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  categoriaDescripcion: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    minHeight: 32,
  },
  categoriaArrow: {
    alignSelf: 'flex-end',
  },
  beneficiosSection: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: '#fff',
  },
  beneficiosTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  beneficiosTitleAccent: {
    color: '#2e7d32',
  },
  beneficiosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  beneficioCard: {
    width: (width - 60) / 2,
    alignItems: 'center',
    padding: 16,
  },
  beneficioIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  beneficioTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  beneficioDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  productosContainer: {
    paddingRight: 20,
  },
  productoCard: {
    width: 180,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productoImagen: {
    width: '100%',
    height: 140,
    backgroundColor: '#f0f0f0',
  },
  productoImagenPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productoInfo: {
    padding: 12,
  },
  productoNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    minHeight: 36,
  },
  productoPrecio: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 4,
  },
  productoStock: {
    fontSize: 12,
    color: '#666',
  },
  verTodos: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    backgroundColor: '#2e7d32',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  footerContent: {
    gap: 24,
  },
  footerSection: {
    marginBottom: 20,
  },
  footerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  footerDescription: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    lineHeight: 20,
  },
  footerContact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
});
