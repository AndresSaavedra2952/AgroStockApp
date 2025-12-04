import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import stripeService from '../service/StripeService';

const StripePaymentForm = ({
  monto,
  id_pedido,
  client_secret,
  payment_intent_id,
  onSuccess,
  onError,
  onCancel,
}) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const formatCardNumber = (text) => {
    // Remover todos los espacios
    const cleaned = text.replace(/\s/g, '');
    // Agregar espacios cada 4 dígitos
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted;
  };

  const formatExpiryDate = (text) => {
    // Remover todo excepto números
    const cleaned = text.replace(/\D/g, '');
    // Agregar / después de 2 dígitos
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const handleCardNumberChange = (text) => {
    const formatted = formatCardNumber(text);
    if (formatted.length <= 19) { // 16 dígitos + 3 espacios
      setCardNumber(formatted);
    }
  };

  const handleExpiryDateChange = (text) => {
    const formatted = formatExpiryDate(text);
    if (formatted.length <= 5) { // MM/YY
      setExpiryDate(formatted);
    }
  };

  const handleCvvChange = (text) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 3) {
      setCvv(cleaned);
    }
  };

  const validateForm = () => {
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
      Alert.alert('Error', 'Por favor ingresa un número de tarjeta válido');
      return false;
    }
    if (!expiryDate || expiryDate.length < 5) {
      Alert.alert('Error', 'Por favor ingresa una fecha de expiración válida (MM/YY)');
      return false;
    }
    if (!cvv || cvv.length < 3) {
      Alert.alert('Error', 'Por favor ingresa un CVV válido');
      return false;
    }
    if (!cardholderName || cardholderName.trim().length < 3) {
      Alert.alert('Error', 'Por favor ingresa el nombre del titular de la tarjeta');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);

    try {
      // En un entorno real, aquí usarías el SDK de Stripe para procesar el pago
      // Por ahora, simulamos el proceso confirmando el pago con el backend
      // Nota: En producción, deberías usar @stripe/stripe-react-native para procesar el pago de forma segura
      
      // Simular procesamiento del pago
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Confirmar el pago con el backend
      const response = await stripeService.confirmarPago(
        payment_intent_id,
        'succeeded',
        id_pedido
      );

      if (response.success) {
        Alert.alert(
          'Pago Exitoso',
          'Tu pago ha sido procesado correctamente.',
          [
            {
              text: 'OK',
              onPress: () => {
                if (onSuccess) {
                  onSuccess(payment_intent_id);
                }
              },
            },
          ]
        );
      } else {
        throw new Error(response.error || 'Error al procesar el pago');
      }
    } catch (error) {
      console.error('Error procesando pago:', error);
      const errorMessage = error?.error || error?.message || 'Error desconocido al procesar el pago';
      Alert.alert('Error', errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Pago con Tarjeta</Text>
        <Text style={styles.subtitle}>Monto: ${monto.toLocaleString()}</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Número de Tarjeta</Text>
          <TextInput
            style={styles.input}
            placeholder="1234 5678 9012 3456"
            value={cardNumber}
            onChangeText={handleCardNumberChange}
            keyboardType="numeric"
            maxLength={19}
            editable={!isProcessing}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre del Titular</Text>
          <TextInput
            style={styles.input}
            placeholder="Juan Pérez"
            value={cardholderName}
            onChangeText={setCardholderName}
            autoCapitalize="words"
            editable={!isProcessing}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>Fecha de Expiración</Text>
            <TextInput
              style={styles.input}
              placeholder="MM/YY"
              value={expiryDate}
              onChangeText={handleExpiryDateChange}
              keyboardType="numeric"
              maxLength={5}
              editable={!isProcessing}
            />
          </View>

          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>CVV</Text>
            <TextInput
              style={styles.input}
              placeholder="123"
              value={cvv}
              onChangeText={handleCvvChange}
              keyboardType="numeric"
              maxLength={3}
              secureTextEntry
              editable={!isProcessing}
            />
          </View>
        </View>

        <View style={styles.testCardsBox}>
          <Text style={styles.testCardsTitle}>Tarjetas de Prueba:</Text>
          <Text style={styles.testCardsText}>
            Visa: 4242 4242 4242 4242{'\n'}
            Mastercard: 5555 5555 5555 4444{'\n'}
            Amex: 3782 822463 10005{'\n'}
            CVV: cualquier 3 dígitos{'\n'}
            Fecha: cualquier fecha futura
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
            disabled={isProcessing}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.submitButton, isProcessing && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Pagar ${monto.toLocaleString()}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  infoBox: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  infoText: {
    fontSize: 12,
    color: '#856404',
  },
  testCardsBox: {
    backgroundColor: '#e7f3ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#0d6efd',
  },
  testCardsTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#004085',
    marginBottom: 6,
  },
  testCardsText: {
    fontSize: 12,
    color: '#004085',
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#2e7d32',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default StripePaymentForm;

