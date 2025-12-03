# 🌾 AgroStock - Aplicación Móvil

Aplicación móvil para la plataforma AgroStock, un sistema de comercio electrónico que conecta productores agrícolas con consumidores.

## 📋 Descripción

AgroStock Mobile es una aplicación React Native desarrollada con Expo que permite a:
- **Consumidores**: Explorar productos, realizar pedidos, gestionar carrito de compras
- **Productores**: Gestionar productos, recibir pedidos, ver estadísticas

## 🏗️ Estructura del Proyecto

El proyecto sigue una estructura organizada por módulos, similar al ejemplo proporcionado:

```
Front-Movil/
├── Screen/                    # Pantallas organizadas por módulo
│   ├── Auth/                  # Autenticación
│   │   ├── LoginScreen.js
│   │   └── RegisterScreen.js
│   ├── Inicio/                # Pantalla principal
│   │   └── HomeScreen.js
│   ├── Productos/              # Gestión de productos
│   │   ├── ProductosScreen.js
│   │   ├── ProductoDetalleScreen.js
│   │   └── MisProductosScreen.js
│   ├── Carrito/               # Carrito de compras
│   │   └── CarritoScreen.js
│   ├── Pedidos/               # Gestión de pedidos
│   │   ├── PedidosScreen.js
│   │   └── PedidosRecibidosScreen.js
│   ├── Mensajes/              # Sistema de mensajería
│   │   └── MensajesScreen.js
│   ├── Perfil/                # Perfil de usuario
│   │   └── PerfilScreen.js
│   ├── Estadisticas/          # Estadísticas (productores)
│   │   └── EstadisticasScreen.js
│   └── Alertas/               # Alertas de stock
│       └── AlertasStockScreen.js
│
├── src/
│   ├── components/             # Componentes reutilizables
│   │   ├── LoadingScreen.js
│   │   ├── CrearProductoModal.js
│   │   └── EditarProductoModal.js
│   ├── context/               # Context API
│   │   └── AuthContext.js
│   ├── hooks/                 # Hooks personalizados
│   │   ├── useNotifications.js
│   │   └── useAutoRefresh.js
│   ├── Navigation/            # Navegación
│   │   └── AppNavegacion.js
│   ├── service/               # Servicios de API
│   │   ├── ApiService.js
│   │   ├── AuthService.js
│   │   ├── ProductosService.js
│   │   ├── CartService.js
│   │   ├── PedidosService.js
│   │   ├── MensajesService.js
│   │   ├── ReseñasService.js
│   │   ├── CategoriasService.js
│   │   ├── UbicacionesService.js
│   │   ├── UsuariosService.js
│   │   ├── EstadisticasService.js
│   │   ├── NotificationService.js
│   │   └── conexion.js
│
├── App.js                     # Componente principal
├── app.json                   # Configuración de Expo
├── package.json               # Dependencias
└── README.md                  # Este archivo
```

## 🚀 Características

### Para Consumidores
- 🏠 Pantalla de inicio con productos destacados
- 🛍️ Exploración de productos con búsqueda y filtros
- 🛒 Carrito de compras
- 📦 Gestión de pedidos
- 💬 Sistema de mensajes
- 👤 Perfil de usuario

### Para Productores
- 📦 Gestión de productos (crear, editar, eliminar) con modales
- 📋 Pedidos recibidos
- 📊 Estadísticas de ventas
- 🔔 Alertas de stock bajo
- 💬 Mensajes con consumidores

## 🛠️ Tecnologías

- React Native con Expo
- React Navigation
- Context API para estado global
- AsyncStorage para persistencia local
- Axios para peticiones HTTP
- Expo Notifications para push notifications

## 📦 Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar la URL de la API en `src/service/conexion.js`:
```javascript
const getLocalIP = () => {
  return '172.20.10.7'; // Cambiar por tu IP local
};
const API_PORT = 8000; // Puerto del backend
```

3. Iniciar la aplicación:
```bash
npm start
```

## 🔐 Autenticación

La aplicación utiliza JWT para autenticación. El token se almacena en AsyncStorage y se incluye automáticamente en todas las peticiones.

## 📝 Notas

- Asegúrate de que el backend esté corriendo antes de iniciar la app
- Configura la IP y puerto correctos en `src/service/conexion.js`
- Para iniciar con LAN mode: `npm run start:lan` o `iniciar-lan.bat`
- Para iniciar con Tunnel mode (más confiable): `npm run start:tunnel` o `iniciar-tunnel.bat`
- La estructura sigue el patrón del ejemplo proporcionado con carpetas Screen/ organizadas por módulo

## 📄 Licencia

Este proyecto es parte de AgroStock.
