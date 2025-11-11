import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

// Screens de Autenticación
import LoginScreen from '../../Screen/Auth/LoginScreen';
import RegisterScreen from '../../Screen/Auth/RegisterScreen';

// Screens de Consumidor
import HomeScreen from '../../Screen/Inicio/HomeScreen';
import ProductosScreen from '../../Screen/Productos/ProductosScreen';
import ProductoDetalleScreen from '../../Screen/Productos/ProductoDetalleScreen';
import CarritoScreen from '../../Screen/Carrito/CarritoScreen';
import PedidosScreen from '../../Screen/Pedidos/PedidosScreen';
import PerfilScreen from '../../Screen/Perfil/PerfilScreen';
import MensajesScreen from '../../Screen/Mensajes/MensajesScreen';

// Screens de Productor
import MisProductosScreen from '../../Screen/Productos/MisProductosScreen';
import PedidosRecibidosScreen from '../../Screen/Pedidos/PedidosRecibidosScreen';
import EstadisticasScreen from '../../Screen/Estadisticas/EstadisticasScreen';
import AlertasStockScreen from '../../Screen/Alertas/AlertasStockScreen';

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

          if (route.name === 'Inicio') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Productos') {
            iconName = focused ? 'storefront' : 'storefront-outline';
          } else if (route.name === 'Carrito') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'Pedidos') {
            iconName = focused ? 'receipt' : 'receipt-outline';
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
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Productos" component={ProductosScreen} />
      <Tab.Screen name="Carrito" component={CarritoScreen} />
      <Tab.Screen name="Pedidos" component={PedidosScreen} />
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

          if (route.name === 'MisProductos') {
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

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        // Usuario no autenticado - Pantalla de inicio pública y autenticación
        <>
          <Stack.Screen name="HomePublic" component={HomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Productos" component={ProductosScreen} />
          <Stack.Screen name="ProductoDetalle" component={ProductoDetalleScreen} options={{ headerShown: true, title: 'Detalle del Producto' }} />
        </>
      ) : user.rol === 'consumidor' ? (
        // Usuario consumidor
        <>
          <Stack.Screen name="ConsumidorMain" component={ConsumidorTabs} />
          <Stack.Screen name="ProductoDetalle" component={ProductoDetalleScreen} options={{ headerShown: true, title: 'Detalle del Producto' }} />
          <Stack.Screen name="Mensajes" component={MensajesScreen} options={{ headerShown: true }} />
        </>
      ) : user.rol === 'productor' ? (
        // Usuario productor
        <>
          <Stack.Screen name="ProductorMain" component={ProductorTabs} />
          <Stack.Screen name="AlertasStock" component={AlertasStockScreen} options={{ headerShown: true, title: 'Alertas de Stock' }} />
        </>
      ) : null}
    </Stack.Navigator>
  );
}



