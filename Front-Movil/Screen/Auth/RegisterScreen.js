import React, { useState, useEffect } from 'react';
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
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { Picker } from '@react-native-picker/picker';
import ubicacionesService from '../../src/service/UbicacionesService';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const isTablet = width > 600;

export default function RegisterScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1: Info personal, 2: Info productor
  const [formData, setFormData] = useState({
    // Información personal
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    telefono: '',
    direccion: '',
    id_departamento: null,
    id_ciudad: null,
    rol: 'consumidor',
    // Información productor
    nombre_finca: '',
    vereda: '',
    numero_registro_ica: '',
    anos_experiencia: '',
    certificaciones: '',
    descripcion_actividad: '',
    tipo_productor: 'agricultor',
    direccion_finca: '',
    metodo_produccion: 'tradicional',
    hectareas: '',
    sitio_web: '',
  });
  
  const [departamentos, setDepartamentos] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [loading, setLoading] = useState(false);
  const { register, login } = useAuth();

  useEffect(() => {
    cargarDepartamentos();
  }, []);

  useEffect(() => {
    if (formData.id_departamento) {
      cargarCiudades(formData.id_departamento);
    } else {
      setCiudades([]);
      setFormData(prev => ({ ...prev, id_ciudad: null }));
    }
  }, [formData.id_departamento]);

  const cargarDepartamentos = async () => {
    try {
      const response = await ubicacionesService.getDepartamentos();
      if (response.success) {
        setDepartamentos(response.data || []);
      }
    } catch (error) {
      console.error('Error al cargar departamentos:', error);
    }
  };

  const cargarCiudades = async (idDepartamento) => {
    try {
      const response = await ubicacionesService.getCiudades(idDepartamento);
      if (response.success) {
        setCiudades(response.data || []);
      }
    } catch (error) {
      console.error('Error al cargar ciudades:', error);
    }
  };

  const validateStep1 = () => {
    if (!formData.nombre || !formData.email || !formData.password || 
        !formData.confirmPassword || !formData.telefono || 
        !formData.direccion || !formData.id_departamento || !formData.id_ciudad) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return false;
    }
    if (formData.password.length < 8) {
      Alert.alert('Error', 'La contraseña debe tener al menos 8 caracteres');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    console.log('[RegisterScreen] handleNext - Rol:', formData.rol, 'Step:', step);
    if (!validateStep1()) return;
    
    if (formData.rol === 'productor') {
      console.log('[RegisterScreen] Avanzando al paso 2 para productor');
      setStep(2);
    } else {
      console.log('[RegisterScreen] Registrando consumidor directamente');
      handleRegister();
    }
  };

  const handleRegister = async () => {
    // Validar paso 1 antes de continuar
    if (step === 1) {
      if (!validateStep1()) return;
      
      // Si es productor, ir al paso 2
      if (formData.rol === 'productor') {
        setStep(2);
        return;
      }
    }

    // Si es consumidor, validar y registrar directamente
    if (formData.rol === 'consumidor') {
      if (!validateStep1()) return;
    }

    // Validar paso 2 para productor
    if (formData.rol === 'productor' && step === 2) {
      if (!formData.nombre_finca || formData.nombre_finca.trim() === '') {
        Alert.alert('Error', 'El nombre de la finca es obligatorio para productores');
        return;
      }
    }

    setLoading(true);
    try {
      // Preparar datos para registro
      const registerData = {
        nombre: formData.nombre,
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        telefono: formData.telefono,
        direccion: formData.direccion,
        id_ciudad: formData.id_ciudad,
        rol: formData.rol,
      };

      // Si es productor, agregar datos adicionales del productor
      if (formData.rol === 'productor' && step === 2) {
        registerData.nombre_finca = formData.nombre_finca;
        registerData.tipo_productor = formData.tipo_productor || 'agricultor';
        registerData.vereda = formData.vereda || null;
        registerData.direccion_finca = formData.direccion_finca || null;
        registerData.numero_registro_ica = formData.numero_registro_ica || null;
        registerData.certificaciones = formData.certificaciones || null;
        registerData.descripcion_actividad = formData.descripcion_actividad || null;
        registerData.anos_experiencia = formData.anos_experiencia || null;
        registerData.hectareas = formData.hectareas || null;
        registerData.metodo_produccion = formData.metodo_produccion || 'tradicional';
        registerData.sitio_web = formData.sitio_web || null;
      }

      const result = await register(registerData);
      
      if (result.success) {
        // Registro exitoso - iniciar sesión automáticamente
        const email = formData.email.trim().toLowerCase();
        const password = formData.password;
        
        console.log('✅ Registro exitoso, iniciando sesión automáticamente...');
        
        const loginResult = await login(email, password);
        
        if (loginResult.success) {
          // Login exitoso - la navegación automática redirigirá al panel correspondiente
          // No mostrar Alert para no bloquear la navegación automática
          console.log('✅ Login automático exitoso, redirigiendo al panel...');
        } else {
          // Si el login automático falla, redirigir al login manual
          console.error('❌ Error en login automático:', loginResult.message);
          Alert.alert(
            'Registro exitoso', 
            'Tu cuenta ha sido creada correctamente. Por favor inicia sesión.',
            [
              { text: 'OK', onPress: () => navigation.navigate('Login') },
            ]
          );
        }
      } else {
        Alert.alert('Error', result.message || 'Error al registrar usuario');
      }
    } catch (error) {
      console.error('Error en registro:', error);
      Alert.alert('Error', error.message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../Logo Agrostock.jpeg')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>AGROSTOCK</Text>
            <Text style={styles.slogan}>Únete a AgroStock</Text>
          </View>

          {step === 1 ? (
            <>
              {/* Indicador de Paso */}
              {formData.rol === 'productor' && (
                <View style={styles.stepIndicator}>
                  <Text style={styles.stepText}>Paso 1 de 2: Información Personal</Text>
                </View>
              )}
              
              {/* Tipo de Cuenta */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Tipo de Cuenta *</Text>
                <View style={styles.accountTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.accountTypeButton,
                      formData.rol === 'consumidor' && styles.accountTypeButtonActive
                    ]}
                    onPress={() => {
                      console.log('[RegisterScreen] Cambiando a Consumidor');
                      setFormData({ ...formData, rol: 'consumidor' });
                      setStep(1); // Resetear al paso 1 si cambia de rol
                    }}
                  >
                    <Text style={[
                      styles.accountTypeText,
                      formData.rol === 'consumidor' && styles.accountTypeTextActive
                    ]}>
                      Consumidor
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.accountTypeButton,
                      formData.rol === 'productor' && styles.accountTypeButtonActive
                    ]}
                    onPress={() => {
                      console.log('[RegisterScreen] Cambiando a Productor');
                      setFormData({ ...formData, rol: 'productor' });
                      setStep(1); // Resetear al paso 1 si cambia de rol
                    }}
                  >
                    <Text style={[
                      styles.accountTypeText,
                      formData.rol === 'productor' && styles.accountTypeTextActive
                    ]}>
                      Productor
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Información Personal */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="person-outline" size={20} color="#333" />
                  <Text style={styles.sectionTitle}>Información Personal</Text>
                </View>

                <View style={[styles.formRow, !isTablet && styles.formRowMobile]}>
                  <View style={[styles.formColumn, !isTablet && styles.formColumnFull]}>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Nombre Completo *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Juan Pérez"
                        value={formData.nombre}
                        onChangeText={(text) => setFormData({ ...formData, nombre: text })}
                        placeholderTextColor="#999"
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Contraseña *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        value={formData.password}
                        onChangeText={(text) => setFormData({ ...formData, password: text })}
                        secureTextEntry
                        placeholderTextColor="#999"
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Teléfono *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="3001234567"
                        value={formData.telefono}
                        onChangeText={(text) => setFormData({ ...formData, telefono: text })}
                        keyboardType="phone-pad"
                        placeholderTextColor="#999"
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Departamento *</Text>
                      <View style={styles.pickerWrapper}>
                        <Picker
                          selectedValue={formData.id_departamento}
                          onValueChange={(value) => setFormData({ ...formData, id_departamento: value, id_ciudad: null })}
                          style={styles.picker}
                        >
                          <Picker.Item label="Selecciona un departamento" value={null} />
                          {departamentos.map((dept) => (
                            <Picker.Item
                              key={dept.id_departamento}
                              label={dept.nombre}
                              value={dept.id_departamento}
                            />
                          ))}
                        </Picker>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.formColumn, !isTablet && styles.formColumnFull]}>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Email *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="tu@email.com"
                        value={formData.email}
                        onChangeText={(text) => setFormData({ ...formData, email: text })}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor="#999"
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Confirmar Contraseña *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                        secureTextEntry
                        placeholderTextColor="#999"
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Dirección *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Calle 123 #45-67"
                        value={formData.direccion}
                        onChangeText={(text) => setFormData({ ...formData, direccion: text })}
                        placeholderTextColor="#999"
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Ciudad *</Text>
                      <View style={styles.pickerWrapper}>
                        <Picker
                          selectedValue={formData.id_ciudad}
                          onValueChange={(value) => setFormData({ ...formData, id_ciudad: value })}
                          style={styles.picker}
                          enabled={!!formData.id_departamento}
                        >
                          <Picker.Item 
                            label={formData.id_departamento ? "Selecciona una ciudad" : "Primero selecciona un departamento"} 
                            value={null} 
                          />
                          {ciudades.map((ciudad) => (
                            <Picker.Item
                              key={ciudad.id_ciudad}
                              label={ciudad.nombre}
                              value={ciudad.id_ciudad}
                            />
                          ))}
                        </Picker>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Botón Continuar/Crear Cuenta */}
              <TouchableOpacity
                style={[styles.createButton, loading && styles.buttonDisabled]}
                onPress={handleNext}
                disabled={loading}
              >
                <Ionicons name={formData.rol === 'productor' ? "arrow-forward-outline" : "create-outline"} size={20} color="#fff" />
                <Text style={styles.createButtonText}>
                  {loading ? 'Registrando...' : formData.rol === 'productor' ? 'Continuar' : 'Crear Cuenta'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Indicador de Paso */}
              <View style={styles.stepIndicator}>
                <Text style={styles.stepText}>Paso 2 de 2: Información del Productor</Text>
              </View>
              
              {/* Información del Productor */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="business-outline" size={20} color="#333" />
                  <Text style={styles.sectionTitle}>Información del Productor</Text>
                </View>

                {/* Primera fila: Nombre de la Finca y Tipo de Productor */}
                <View style={[styles.formRow, !isTablet && styles.formRowMobile]}>
                  <View style={[styles.formColumn, !isTablet && styles.formColumnFull]}>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Nombre de la Finca *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Finca El Paraíso"
                        value={formData.nombre_finca}
                        onChangeText={(text) => setFormData({ ...formData, nombre_finca: text })}
                        placeholderTextColor="#999"
                      />
                      <Text style={styles.helperText}>Campo obligatorio para productores</Text>
                    </View>
                  </View>

                  <View style={[styles.formColumn, !isTablet && styles.formColumnFull]}>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Tipo de Productor</Text>
                      <View style={styles.pickerWrapper}>
                        <Picker
                          selectedValue={formData.tipo_productor}
                          onValueChange={(value) => setFormData({ ...formData, tipo_productor: value })}
                          style={styles.picker}
                        >
                          <Picker.Item label="Agricultor" value="agricultor" />
                          <Picker.Item label="Ganadero" value="ganadero" />
                          <Picker.Item label="Apicultor" value="apicultor" />
                          <Picker.Item label="Piscicultor" value="piscicultor" />
                          <Picker.Item label="Avicultor" value="avicultor" />
                          <Picker.Item label="Mixto" value="mixto" />
                          <Picker.Item label="Otro" value="otro" />
                        </Picker>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Segunda fila: Vereda y Dirección de la Finca */}
                <View style={[styles.formRow, !isTablet && styles.formRowMobile]}>
                  <View style={[styles.formColumn, !isTablet && styles.formColumnFull]}>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Vereda</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Vereda La Esperanza"
                        value={formData.vereda}
                        onChangeText={(text) => setFormData({ ...formData, vereda: text })}
                        placeholderTextColor="#999"
                      />
                    </View>
                  </View>

                  <View style={[styles.formColumn, !isTablet && styles.formColumnFull]}>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Dirección de la Finca</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Kilómetro 5 vía principal"
                        value={formData.direccion_finca}
                        onChangeText={(text) => setFormData({ ...formData, direccion_finca: text })}
                        placeholderTextColor="#999"
                      />
                    </View>
                  </View>
                </View>

                {/* Tercera fila: Número de Registro ICA y Método de Producción */}
                <View style={[styles.formRow, !isTablet && styles.formRowMobile]}>
                  <View style={[styles.formColumn, !isTablet && styles.formColumnFull]}>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Número de Registro ICA</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="ICA-123456"
                        value={formData.numero_registro_ica}
                        onChangeText={(text) => setFormData({ ...formData, numero_registro_ica: text })}
                        placeholderTextColor="#999"
                      />
                    </View>
                  </View>

                  <View style={[styles.formColumn, !isTablet && styles.formColumnFull]}>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Método de Producción</Text>
                      <View style={styles.pickerWrapper}>
                        <Picker
                          selectedValue={formData.metodo_produccion}
                          onValueChange={(value) => setFormData({ ...formData, metodo_produccion: value })}
                          style={styles.picker}
                        >
                          <Picker.Item label="Tradicional" value="tradicional" />
                          <Picker.Item label="Orgánico" value="organico" />
                          <Picker.Item label="Convencional" value="convencional" />
                          <Picker.Item label="Mixto" value="mixto" />
                        </Picker>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Cuarta fila: Años de Experiencia y Hectáreas */}
                <View style={[styles.formRow, !isTablet && styles.formRowMobile]}>
                  <View style={[styles.formColumn, !isTablet && styles.formColumnFull]}>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Años de Experiencia</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="5"
                        value={formData.anos_experiencia}
                        onChangeText={(text) => setFormData({ ...formData, anos_experiencia: text })}
                        keyboardType="numeric"
                        placeholderTextColor="#999"
                      />
                    </View>
                  </View>

                  <View style={[styles.formColumn, !isTablet && styles.formColumnFull]}>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Hectáreas</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="10"
                        value={formData.hectareas}
                        onChangeText={(text) => setFormData({ ...formData, hectareas: text })}
                        keyboardType="numeric"
                        placeholderTextColor="#999"
                      />
                    </View>
                  </View>
                </View>

                {/* Quinta fila: Sitio Web (ancho completo) */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Sitio Web</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="https://www.mifinca.com"
                    value={formData.sitio_web}
                    onChangeText={(text) => setFormData({ ...formData, sitio_web: text })}
                    keyboardType="url"
                    autoCapitalize="none"
                    placeholderTextColor="#999"
                  />
                </View>

                {/* Sexta fila: Certificaciones (ancho completo) */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Certificaciones</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Certificaciones orgánicas, ISO, etc."
                    value={formData.certificaciones}
                    onChangeText={(text) => setFormData({ ...formData, certificaciones: text })}
                    multiline
                    numberOfLines={3}
                    placeholderTextColor="#999"
                  />
                </View>

                {/* Séptima fila: Descripción de la Actividad (ancho completo) */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Descripción de la Actividad</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe las actividades principales de tu finca..."
                    value={formData.descripcion_actividad}
                    onChangeText={(text) => setFormData({ ...formData, descripcion_actividad: text })}
                    multiline
                    numberOfLines={3}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              {/* Botones */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setStep(1)}
                >
                  <Text style={styles.backButtonText}>Atrás</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.createButton, loading && styles.buttonDisabled]}
                  onPress={handleRegister}
                  disabled={loading}
                >
                  <Ionicons name="create-outline" size={20} color="#fff" />
                  <Text style={styles.createButtonText}>
                    {loading ? 'Registrando...' : 'Crear Cuenta'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Link Login */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>¿Ya tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Inicia sesión aquí</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 1,
    marginBottom: 5,
  },
  slogan: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginBottom: 25,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  accountTypeContainer: {
    flexDirection: 'row',
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  accountTypeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  accountTypeButtonActive: {
    backgroundColor: '#2e7d32',
  },
  accountTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e7d32',
  },
  accountTypeTextActive: {
    color: '#fff',
  },
  formRow: {
    flexDirection: 'row',
    gap: 15,
  },
  formRowMobile: {
    flexDirection: 'column',
  },
  formColumn: {
    flex: 1,
  },
  formColumnFull: {
    flex: 1,
    width: '100%',
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerWrapper: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputHalf: {
    flex: 1,
  },
  createButton: {
    backgroundColor: '#1976d2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#1976d2',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#1976d2',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  loginText: {
    color: '#666',
    fontSize: 14,
  },
  loginLink: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepIndicator: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
  },
});
