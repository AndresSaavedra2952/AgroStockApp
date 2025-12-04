import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

// Screens de Autenticación
import LoginScreen from '../../Screen/Auth/LoginScreen';
import RegisterScreen from '../../Screen/Auth/RegisterScreen';

// Screens de Inicio
import HomeScreen from '../../Screen/Inicio/HomeScreen';

// Screens de Consumidor
import ProductosScreen from '../../Screen/Productos/ProductosScreen';
import ProductoDetalleScreen from '../../Screen/Productos/ProductoDetalleScreen';
import CarritoScreen from '../../Screen/Carrito/CarritoScreen';
import PedidosScreen from '../../Screen/Pedidos/PedidosScreen';
import PedidoDetalleScreen from '../../Screen/Pedidos/PedidoDetalleScreen';
import PerfilScreen from '../../Screen/Perfil/PerfilScreen';
import MensajesScreen from '../../Screen/Mensajes/MensajesScreen';
import ChatIndividualScreen from '../../Screen/Mensajes/ChatIndividualScreen';
import ListaDeseosScreen from '../../Screen/Productos/ListaDeseosScreen';
import NotificacionesScreen from '../../Screen/Notificaciones/NotificacionesScreen';

// Screens de Productor
import MisProductosScreen from '../../Screen/Productos/MisProductosScreen';
import PedidosRecibidosScreen from '../../Screen/Pedidos/PedidosRecibidosScreen';
import EstadisticasScreen from '../../Screen/Estadisticas/EstadisticasScreen';
import AlertasStockScreen from '../../Screen/Alertas/AlertasStockScreen';
import HomeProductorScreen from '../../Screen/Inicio/HomeProductorScreen';

// Componentes comunes
import LoadingScreen from '../components/LoadingScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Navegación principal para Consumidor
function ConsumidorTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;


          if (route.name === 'Productos') {
            iconName = focused ? 'storefront' : 'storefront-outline';
          } else if (route.name === 'Mensajes') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else           if (route.name === 'Pedidos') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'ListaDeseos') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === 'Perfil') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2e7d32',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Productos" component={ProductosScreen} />
      <Tab.Screen name="Mensajes" component={MensajesScreen} options={{ title: 'Mensajes' }} />
      <Tab.Screen name="Pedidos" component={PedidosScreen} />
      <Tab.Screen name="ListaDeseos" component={ListaDeseosScreen} options={{ title: 'Deseos' }} />
      <Tab.Screen name="Perfil" component={PerfilScreen} />
    </Tab.Navigator>
  );
}

// Navegación principal para Productor
function ProductorTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;


          if (route.name === 'InicioProd') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'MisProductos') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'PedidosRecibidos') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Estadisticas') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'Mensajes') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'PerfilProd') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2e7d32',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="InicioProd" component={HomeProductorScreen} options={{ title: 'Inicio' }} />
      <Tab.Screen name="MisProductos" component={MisProductosScreen} options={{ title: 'Mis Productos' }} />
      <Tab.Screen name="PedidosRecibidos" component={PedidosRecibidosScreen} options={{ title: 'Pedidos' }} />
      <Tab.Screen name="Estadisticas" component={EstadisticasScreen} options={{ title: 'Estadísticas' }} />
      <Tab.Screen name="Mensajes" component={MensajesScreen} />
      <Tab.Screen name="PerfilProd" component={PerfilScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}

// Navegación principal de la app
export default function AppNavegacion() {
  const { user, loading } = useAuth();
  const [hasError, setHasError] = React.useState(false);

  // Mostrar pantalla de carga mientras se verifica la sesión
  if (loading) {
    return <LoadingScreen />;
  }

  // Validar que user sea válido si existe
  const isValidUser = user && user.id_usuario && user.rol;
  const userRol = isValidUser ? user.rol : null;

  // Si hay error, mostrar login
  if (hasError) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  // Determinar la ruta inicial según el estado del usuario
  const getInitialRouteName = () => {
    if (!isValidUser) {
      return 'HomePublic';
    } else if (userRol === 'consumidor') {
      return 'ConsumidorMain';
    } else if (userRol === 'productor') {
      return 'ProductorMain';
    } else {
      return 'Login';
    }
  };

  try {
    return (
      <Stack.Navigator 
        initialRouteName={getInitialRouteName()}
        screenOptions={{ headerShown: false }}
        onError={(error) => {
          console.error('❌ Error en Stack.Navigator:', error);
          setHasError(true);
        }}
      >
        {!isValidUser ? (
          // Usuario no autenticado - Pantalla de inicio pública y autenticación
          <>
            <Stack.Screen name="HomePublic" component={HomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Productos" component={ProductosScreen} />
            <Stack.Screen name="ProductoDetalle" component={ProductoDetalleScreen} options={{ headerShown: true, title: 'Detalle del Producto' }} />
          </>
        ) : userRol === 'consumidor' ? (
          // Usuario consumidor
          <>
            <Stack.Screen name="ConsumidorMain" component={ConsumidorTabs} />
            <Stack.Screen name="ProductoDetalle" component={ProductoDetalleScreen} options={{ headerShown: true, title: 'Detalle del Producto' }} />
            <Stack.Screen name="Carrito" component={CarritoScreen} options={{ headerShown: true, title: 'Carrito de Compras' }} />
            <Stack.Screen name="ListaDeseos" component={ListaDeseosScreen} options={{ headerShown: true, title: 'Mi Lista de Deseos' }} />
            <Stack.Screen name="Notificaciones" component={NotificacionesScreen} options={{ headerShown: true, title: 'Notificaciones' }} />
            <Stack.Screen name="PedidoDetalle" component={PedidoDetalleScreen} options={{ headerShown: true, title: 'Detalle del Pedido' }} />
            <Stack.Screen name="ChatIndividual" component={ChatIndividualScreen} options={{ headerShown: false }} />
          </>
        ) : userRol === 'productor' ? (
          // Usuario productor
          <>
            <Stack.Screen name="ProductorMain" component={ProductorTabs} />
            <Stack.Screen name="ProductoDetalle" component={ProductoDetalleScreen} options={{ headerShown: true, title: 'Detalle del Producto' }} />
            <Stack.Screen name="Productos" component={ProductosScreen} options={{ headerShown: true, title: 'Todos los Productos' }} />
            <Stack.Screen name="AlertasStock" component={AlertasStockScreen} options={{ headerShown: true, title: 'Alertas de Stock' }} />
            <Stack.Screen name="Notificaciones" component={NotificacionesScreen} options={{ headerShown: true, title: 'Notificaciones' }} />
            <Stack.Screen name="ChatIndividual" component={ChatIndividualScreen} options={{ headerShown: false }} />
          </>
        ) : (
          // Rol no reconocido - mostrar login
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    );
  } catch (error) {
    console.error('❌ Error en AppNavegacion:', error);
    setHasError(true);
    // En caso de error, mostrar login
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }
}



