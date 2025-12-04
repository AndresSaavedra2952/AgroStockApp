import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import EditarPerfilModal from '../../src/components/EditarPerfilModal';
import CambiarContraseñaModal from '../../src/components/CambiarContraseñaModal';
import { API_BASE_URL } from '../../src/service/conexion';

export default function PerfilScreen({ navigation }) {
  const { user, logout, isProductor, isConsumidor } = useAuth();
  const [modalEditarVisible, setModalEditarVisible] = useState(false);
  const [modalContraseñaVisible, setModalContraseñaVisible] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handlePerfilActualizado = () => {
    // El modal ya actualiza el contexto, solo necesitamos cerrar
    setModalEditarVisible(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
        <View style={styles.avatar}>
          {user?.foto_perfil ? (() => {
            const construirUrlImagen = (path) => {
              if (!path) return null;
              if (path.startsWith('http://') || path.startsWith('https://')) {
                return path;
              }
              let normalizedPath = path.replace(/\\/g, '/').replace(/\/+/g, '/');
              if (normalizedPath.startsWith('/uploads')) {
                return `${API_BASE_URL}${normalizedPath}`;
              }
              if (normalizedPath.startsWith('uploads')) {
                return `${API_BASE_URL}/${normalizedPath}`;
              }
              normalizedPath = normalizedPath.startsWith('/') 
                ? normalizedPath.substring(1) 
                : normalizedPath;
              return `${API_BASE_URL}/uploads/${normalizedPath}`;
            };
            return (
              <Image 
                source={{ uri: construirUrlImagen(user.foto_perfil) }} 
                style={styles.avatarImage}
              />
            );
          })() : (
            <Text style={styles.avatarText}>{user?.nombre?.charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <Text style={styles.nombre}>{user?.nombre}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.rolBadge}>
          <Text style={styles.rolText}>
            {user?.rol === 'productor' ? '👨‍🌾 Productor' : '🛒 Consumidor'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Teléfono:</Text>
          <Text style={styles.infoValue}>{user?.telefono || 'No registrado'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Dirección:</Text>
          <Text style={styles.infoValue}>{user?.direccion || 'No registrada'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setModalEditarVisible(true)}
        >
          <View style={styles.menuItemContent}>
            <Ionicons name="create-outline" size={20} color="#2e7d32" />
            <Text style={styles.menuItemText}>Editar Perfil</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setModalContraseñaVisible(true)}
        >
          <View style={styles.menuItemContent}>
            <Ionicons name="lock-closed-outline" size={20} color="#2e7d32" />
            <Text style={styles.menuItemText}>Cambiar Contraseña</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        {isProductor() && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('AlertasStock')}
          >
            <View style={styles.menuItemContent}>
              <Ionicons name="notifications-outline" size={20} color="#2e7d32" />
              <Text style={styles.menuItemText}>Alertas de Stock</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Modales */}
      <EditarPerfilModal
        visible={modalEditarVisible}
        onClose={() => setModalEditarVisible(false)}
        onSuccess={handlePerfilActualizado}
      />
      <CambiarContraseñaModal
        visible={modalContraseñaVisible}
        onClose={() => setModalContraseñaVisible(false)}
      />

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
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
  header: {
    backgroundColor: '#2e7d32',
    padding: 30,
    paddingTop: 40,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  nombre: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 15,
  },
  rolBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
  },
  rolText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  menuItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#d32f2f',
    margin: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});



