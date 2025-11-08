# 🌾 AgroStock - Aplicación Móvil

Aplicación móvil para la plataforma AgroStock, un sistema de comercio electrónico que conecta productores agrícolas con consumidores.

## 📋 Descripción

AgroStock Mobile es una aplicación React Native desarrollada con Expo que permite a:
- **Consumidores**: Explorar productos, realizar pedidos, gestionar carrito de compras
- **Productores**: Gestionar productos, recibir pedidos, ver estadísticas

## 🚀 Características

### Para Consumidores
- 🏠 Pantalla de inicio con productos destacados
- 🛍️ Exploración de productos con búsqueda y filtros
- 🛒 Carrito de compras
- 📦 Gestión de pedidos
- 💬 Sistema de mensajes
- 👤 Perfil de usuario

### Para Productores
- 📦 Gestión de productos (crear, editar, eliminar)
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

2. Configurar la URL de la API en `src/service/ApiService.js`:
```javascript
const API_BASE_URL = 'http://tu-servidor-api:5000';
```

3. Iniciar la aplicación:
```bash
npm start
```

## 📱 Estructura del Proyecto

```
Front-Movil/
├── src/
│   ├── components/
│   │   ├── screens/          # Pantallas de la aplicación
│   │   └── LoadingScreen.js  # Componente de carga
│   ├── context/
│   │   └── AuthContext.js    # Contexto de autenticación
│   ├── hooks/
│   │   ├── useNotifications.js  # Hook para notificaciones
│   │   └── useAutoRefresh.js    # Hook para auto-refresh
│   ├── Navigation/
│   │   └── AppNavegacion.js     # Navegación principal
│   ├── service/
│   │   ├── ApiService.js         # Configuración de axios
│   │   ├── AuthService.js        # Servicios de autenticación
│   │   ├── ProductosService.js   # Servicios de productos
│   │   ├── CartService.js        # Servicios de carrito
│   │   ├── PedidosService.js     # Servicios de pedidos
│   │   ├── MensajesService.js    # Servicios de mensajes
│   │   └── ...                    # Otros servicios
│   └── utils/
│       └── debugAuth.js           # Utilidades de debug
├── App.js
├── package.json
└── README.md
```

## 🔐 Autenticación

La aplicación utiliza JWT para autenticación. El token se almacena en AsyncStorage y se incluye automáticamente en todas las peticiones.

## 📝 Notas

- Asegúrate de que el backend esté corriendo antes de iniciar la app
- Configura la URL correcta de la API en `ApiService.js`
- Para producción, configura las variables de entorno apropiadas

## 📄 Licencia

Este proyecto es parte de AgroStock.

