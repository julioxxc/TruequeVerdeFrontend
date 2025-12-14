import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Platform, Pressable, KeyboardAvoidingView } from 'react-native';
import { TextInput, Button, RadioButton } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import RegisterStyles from 'components/stylesheet/RegisterStylesheet';
import StateCityPicker from './CiudadEstado';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from 'services/api';
import { Alert } from 'react-native';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import DateTimePicker from '@react-native-community/datetimepicker';

// Implementacion de calendario para campo de fecha de nacimiento (otra vez)


// Navegación tipada
type RootStackParamList = {
  Register: undefined;
  Login: undefined;
};

export default function RegisterScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // Fecha de nacimiento
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

    const showDatePicker = () => {
      setDatePickerVisibility(true);
    };

    const hideDatePicker = () => {
      setDatePickerVisibility(false);
    };

    const handleConfirm = (date) => {
      // Formatea la fecha como desees (aquí usamos YYYY-MM-DD)
      const formattedDate = date.toISOString().split('T')[0];
      handleChange('birthdate', formattedDate);
      hideDatePicker();
    };

  // Datos de formulario
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    password_confirmation: '',
    gender: '',
    birthdate: '',
    phone: '',
    address: '',
    street: '',
    externalNumber: '',
    internalNumber: '',
    neighborhood: '',
    postalCode: '',
    selectedStateId: null,
    selectedCityId: null,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
const [selectedCityId, setSelectedCityId] = useState(null);
const [selectedCityName, setSelectedCityName] = useState('');
const [selectedStateId, setSelectedStateId] = useState<string | null>(null);

const isValidEmail = (email: string) => {
  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(email);
};

const handleLaravelErrors = (errors: any) => {
  let messages: string[] = [];

  Object.keys(errors).forEach((field) => {
    errors[field].forEach((message: string) => {
      messages.push(`• ${message}`);
    });
  });

  Alert.alert(
    'Error en el registro',
    messages.join('\n')
  );
};

const validateForm = () => {
  //if (!form.firstName.trim()) {
  //  Alert.alert('Error', 'El nombre es obligatorio');
  //  return false;
  //}

  //if (!form.email.trim()) {
  //  Alert.alert('Error', 'El correo electrónico es obligatorio');
  //  return false;
  //}

  //if (!isValidEmail(form.email)) {
  //  Alert.alert(
  //    'Correo inválido',
  //    'Ingresa un correo electrónico con un formato válido\nEjemplo: usuario@correo.com'
  //  );
  // return false;
  //}

  //if (form.password.length < 8) {
  //  Alert.alert('Error', 'La contraseña debe tener al menos 8 caracteres');
  //  return false;
  //}

  //if (form.password !== form.password_confirmation) {
  //  Alert.alert('Error', 'Las contraseñas no coinciden');
  //  return false;
  //}

  //if (!form.birthdate) {
  //  Alert.alert('Error', 'Selecciona tu fecha de nacimiento');
  //  return false;
  //}

  //if (!selectedCityId) {
  // Alert.alert('Error', 'Selecciona un estado y una ciudad');
  //  return false;
  //}

  return true;
};


  const handleChange = (field: string, value: string | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      console.log('Datos a enviar:', form); // <-- Agrega esto para depurar
      const response = await api.post('/register', {
        name: form.firstName,
        lastname: form.lastName,
        username: form.username,
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
        gender: form.gender,
        birthdate: form.birthdate,
        phone: form.phone,
        address: form.address,
        street: form.street,
        external_number: form.externalNumber,
        internal_number: form.internalNumber,
        neighborhood: form.neighborhood,
        postal_code: form.postalCode,
        latitude: "0.0",
        longitude: "0.0",
        pfp: "null",
        city_id: Number(selectedCityId),
      city: String(selectedCityId), 
      state: form.selectedStateId, // Assuming 'state' refers to the selected state ID
        is_active: true,
        verified: false,
      });

      console.log('Registro exitoso:', response.data);
      navigation.navigate('Login');
    } catch (error: any) {
      if (error.response?.status === 422) {
        handleLaravelErrors(error.response.data.errors);
      } else {
        Alert.alert('Error', 'Ocurrió un error inesperado');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={110}
    >
      <ScrollView contentContainerStyle={RegisterStyles.container}>
        <View style={RegisterStyles.formContainer}>
        <Image source={require('../images/logocorregido.png')} style={RegisterStyles.logoImage} resizeMode="contain" />
        <Text style={RegisterStyles.title}>CREA UNA CUENTA</Text>
        <Text style={RegisterStyles.subtitle}>Ingresa tus datos para registrarte</Text>

        {currentStep === 0 && (
          <View>
            <TextInput
              label="Nombre"
              value={form.firstName}
              onChangeText={(text) => handleChange('firstName', text)}
              style={RegisterStyles.input}
            />
            <TextInput
              label="Apellido"
              value={form.lastName}
              onChangeText={(text) => handleChange('lastName', text)}
              style={RegisterStyles.input}
            />
            <TextInput
              label="Nombre de usuario"
              value={form.username}
              onChangeText={(text) => handleChange('username', text)}
              style={RegisterStyles.input}
            />
            <TextInput
              label="Correo Electrónico"
              value={form.email}
              onChangeText={(text) => handleChange('email', text)}
              style={RegisterStyles.input}
              keyboardType="email-address"
            />
            <TextInput
              label="Contraseña"
              value={form.password}
              onChangeText={(text) => handleChange('password', text)}
              style={RegisterStyles.input}
              secureTextEntry={!showPassword}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />
            <TextInput
              label="Confirmar Contraseña"
              value={form.password_confirmation}
              onChangeText={(text) => handleChange('password_confirmation', text)}
              style={RegisterStyles.input}
              secureTextEntry={!showConfirmPassword}
              right={
                <TextInput.Icon
                  icon={showConfirmPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              }
            />
            <Button mode="contained" onPress={() => setCurrentStep(1)} style={RegisterStyles.button}>
              Siguiente
            </Button>

             <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={RegisterStyles.loginText}>¿Ya tienes una cuenta? <Text style={RegisterStyles.loginLink}>Inicia Sesión</Text></Text>
            </TouchableOpacity>
            <View style={{ height: 100 }} />
          </View>
        )}

        {currentStep === 1 && (
  <View>
    <RadioButton.Group onValueChange={(value) => handleChange('gender', value)} value={form.gender}>
      <Text>Género</Text>
      <RadioButton.Item label="Masculino" value="0" />
      <RadioButton.Item label="Femenino" value="1" />
      <RadioButton.Item label="Otro" value="2" />
    </RadioButton.Group>
    
    <Pressable onPress={showDatePicker}>
      <TextInput
        label="Fecha de nacimiento"
        value={form.birthdate}
        style={RegisterStyles.input}
        editable={false}
        pointerEvents="none" // Esto ayuda a que el Pressable reciba el toque
      />
    </Pressable>

    {/* Picker para Android */}
    {Platform.OS === 'android' && (
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirm}
        onCancel={hideDatePicker}
        maximumDate={new Date()}
        display="spinner"
      />
    )}

    {/* Picker para iOS: SIEMPRE renderizado, pero visible solo cuando isDatePickerVisible */}
    {Platform.OS === 'ios' && (
      isDatePickerVisible && (
        <DateTimePicker
          value={form.birthdate ? new Date(form.birthdate) : new Date()}
          mode="date"
          display="spinner"
          maximumDate={new Date()}
          onChange={(event, selectedDate) => {
            if (event.type === "set" && selectedDate) {
              const formattedDate = selectedDate.toISOString().split('T')[0];
              handleChange('birthdate', formattedDate);
            }
            hideDatePicker();
          }}
        />
      )
    )}
    
    <TextInput label="Teléfono" value={form.phone} onChangeText={(text) => handleChange('phone', text)} style={RegisterStyles.input} keyboardType="phone-pad" />
    <Button mode="contained" onPress={() => setCurrentStep(0)} style={RegisterStyles.button}>Anterior</Button>
    <Button mode="contained" onPress={() => setCurrentStep(2)} style={RegisterStyles.button}>Siguiente</Button>

    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
      <Text style={RegisterStyles.loginText}>¿Ya tienes una cuenta? <Text style={RegisterStyles.loginLink}>Inicia Sesión</Text></Text>
    </TouchableOpacity>
    <View style={{ height: 100 }} />
  </View>
)}

        {currentStep === 2 && (
          <View>
            <TextInput label="Calle" value={form.street} onChangeText={(text) => handleChange('street', text)} style={RegisterStyles.input} />
            <TextInput label="Número Exterior" value={form.externalNumber} onChangeText={(text) => handleChange('externalNumber', text)} style={RegisterStyles.input} />
            <TextInput label="Número Interior" value={form.internalNumber} onChangeText={(text) => handleChange('internalNumber', text)} style={RegisterStyles.input} />
            <TextInput label="Colonia" value={form.neighborhood} onChangeText={(text) => handleChange('neighborhood', text)} style={RegisterStyles.input} />
            <TextInput label="Código Postal" value={form.postalCode} onChangeText={(text) => handleChange('postalCode', text)} style={RegisterStyles.input} keyboardType="number-pad" />
            <StateCityPicker
  onStateChange={setSelectedStateId}
  onCityChange={(id, name) => {
    setSelectedCityId(id);
    setSelectedCityName(name);
  }}

/>
            <Button mode="contained" onPress={() => setCurrentStep(1)} style={RegisterStyles.button}>Anterior</Button>
            <Button mode="contained" onPress={handleSubmit} style={RegisterStyles.button}>Crear Cuenta</Button>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={RegisterStyles.loginText}>¿Ya tienes una cuenta? <Text style={RegisterStyles.loginLink}>Inicia Sesión</Text></Text>
          </TouchableOpacity>
          <View style={{ height: 100 }} />
          </View>
        )}

       
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}