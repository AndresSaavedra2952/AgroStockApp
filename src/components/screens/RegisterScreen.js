import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Picker } from '@react-native-picker/picker';
import ubicacionesService from '../../service/UbicacionesService';

export default function RegisterScreen({ navigation }) {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    telefono: '',
    direccion: '',
    id_ciudad: null,
    rol: 'consumidor',
  });
  const [ciudades, setCiudades] = useState([]);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  React.useEffect(() => {
    cargarCiudades();
  }, []);

  const cargarCiudades = async () => {
    try {
      const response = await ubicacionesService.getCiudades();
      if (response.success) {
        setCiudades(response.data || []);
      }
    } catch (error) {
      console.error('Error al cargar ciudades:', error);
    }
  };

  const handleRegister = async () => {
    if (!formData.nombre || !formData.email || !formData.password || !formData.telefono || !formData.direccion || !formData.id_ciudad) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      const result = await register(formData);
      if (result.success) {
        Alert.alert('Éxito', 'Usuario registrado correctamente. Por favor inicia sesión.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
      } else {
        Alert.alert('Error', result.message || 'Error al registrar usuario');
      }
    } catch (error) {
      Alert.alert('Error', 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>Regístrate en AgroStock</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Nombre completo"
            value={formData.nombre}
            onChangeText={(text) => setFormData({ ...formData, nombre: text })}
          />

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            value={formData.password}
            onChangeText={(text) => setFormData({ ...formData, password: text })}
            secureTextEntry
          />

          <TextInput
            style={styles.input}
            placeholder="Teléfono"
            value={formData.telefono}
            onChangeText={(text) => setFormData({ ...formData, telefono: text })}
            keyboardType="phone-pad"
          />

          <TextInput
            style={styles.input}
            placeholder="Dirección"
            value={formData.direccion}
            onChangeText={(text) => setFormData({ ...formData, direccion: text })}
          />

          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Ciudad:</Text>
            <Picker
              selectedValue={formData.id_ciudad}
              onValueChange={(value) => setFormData({ ...formData, id_ciudad: value })}
              style={styles.picker}
            >
              <Picker.Item label="Selecciona una ciudad" value={null} />
              {ciudades.map((ciudad) => (
                <Picker.Item
                  key={ciudad.id_ciudad}
                  label={ciudad.nombre}
                  value={ciudad.id_ciudad}
                />
              ))}
            </Picker>
          </View>

          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Tipo de cuenta:</Text>
            <Picker
              selectedValue={formData.rol}
              onValueChange={(value) => setFormData({ ...formData, rol: value })}
              style={styles.picker}
            >
              <Picker.Item label="Consumidor" value="consumidor" />
              <Picker.Item label="Productor" value="productor" />
            </Picker>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Registrando...' : 'Registrarse'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>¿Ya tienes cuenta? Inicia sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pickerLabel: {
    padding: 10,
    paddingBottom: 5,
    fontSize: 14,
    color: '#666',
  },
  picker: {
    height: 50,
  },
  button: {
    backgroundColor: '#2e7d32',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#2e7d32',
    fontSize: 16,
  },
});

