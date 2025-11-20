import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { TextInput, Button, Checkbox } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { loginUser, validateToken } from 'services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginStyles from 'components/stylesheet/LoginStylesheet';
import { validateTokenWith } from 'services/api';
import { useUser } from 'context/UserContext';
type RootStackParamList = {
  Register: undefined;
  Login: undefined;
  Home:  { user: any; token: string };
  Profile: { userId: number }; // Ruta perfil publico 

};

export default function LoginScreen() {
  const { login } = useUser();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const Stack = createNativeStackNavigator<RootStackParamList>();

  // Verificar token al cargar el componente
  useEffect(() => {
    const checkTokenAndRedirect = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const isValid = await validateToken();
          if (isValid) {
            const storedUser = await AsyncStorage.getItem('userData');
            const parsedUser = storedUser ? JSON.parse(storedUser) : null;
            navigation.replace('Home', {
              user: parsedUser,
              token: token,
            });
            return;
          }
          await AsyncStorage.removeItem('userToken');
        }
      } catch (error) {
        console.error('Error validating token:', error);
      } finally {
        setIsCheckingToken(false);
      }
    };

    checkTokenAndRedirect();
  }, []);

  // Cargar credenciales guardadas si "Recuérdame" estaba activado
  useEffect(() => {
    const loadSavedCredentials = async () => {
      const savedUsername = await AsyncStorage.getItem('savedUsername');
      const savedRememberMe = await AsyncStorage.getItem('rememberMe');
      
      if (savedUsername && savedRememberMe === 'true') {
        setUsername(savedUsername);
        setRememberMe(true);
      }
    };

    loadSavedCredentials();
  }, []);
  //SECCION HANDLE LOGIN
  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Por favor ingresa tus credenciales');
      return;
    }

    setIsLoading(true);

    try {
      

      const response = await loginUser({
        username: username.trim(),
        password: password,
      });

      // Imprime la respuesta del backend
      console.log('Respuesta del login:', response);

      if (!response.token) {
        throw new Error('No se recibió token en la respuesta');
      }

      // Siempre guarda el usuario y token en contexto (memoria)
      await login(response.user, response.token);
      // Siempre persiste el token y usuario; "Recuerdame" solo guarda el usuario para autocompletar
      await AsyncStorage.setItem('userToken', response.token);
      await AsyncStorage.setItem('userData', JSON.stringify(response.user));
      if (rememberMe) {
        await AsyncStorage.setItem('savedUsername', username);
        await AsyncStorage.setItem('rememberMe', 'true');
      } else {
        await AsyncStorage.removeItem('savedUsername');
        await AsyncStorage.setItem('rememberMe', 'false');
      }

      // Validar el token antes de redirigir
      const isValid = await validateTokenWith(response.token);
      if (!isValid) {
        throw new Error('Token no válido');
      }
      navigation.replace('Home', {
        user: response.user,
        token: response.token,
      });

    } catch (error) {
      // Manejo de errores
    } finally {
      setIsLoading(false);
    }
  };



  if (isCheckingToken) {
    return (
      <View style={LoginStyles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={LoginStyles.loadingText}>Verificando sesión...</Text>
      </View>
    );
  }

  return (
    <View style={LoginStyles.container}>
      <View style={LoginStyles.formContainer}>
      <Image source={require('../images/logocorregido.png')} style={LoginStyles.logoImage} resizeMode="contain"/>
        <Text style={LoginStyles.title}>INICIAR SESIÓN</Text>
        
        <TextInput
          label="Usuario"
          value={username}
          onChangeText={setUsername}
          style={LoginStyles.input} // Asegúrate que sea igual a RegisterStyles.input
          autoCapitalize="none"
          disabled={isLoading}
        />
        
        <TextInput
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          style={LoginStyles.input} // Igual que en registro
          secureTextEntry={!showPassword}
          disabled={isLoading}
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowPassword(!showPassword)}
              forceTextInputFocus={false}
              disabled={isLoading}
            />
          }
        />

        <View style={LoginStyles.rememberContainer}>
          <Checkbox
            status={rememberMe ? 'checked' : 'unchecked'}
            onPress={() => !isLoading && setRememberMe(!rememberMe)}
            color="#4CAF50"
            disabled={isLoading}
          />
          <Text style={[
            LoginStyles.rememberText,
            isLoading && { color: '#ccc' }
          ]}>
            Recuérdame
          </Text>
        </View>

        <Button 
          mode="contained" 
          onPress={handleLogin} 
          style={LoginStyles.button}
          loading={isLoading}
          disabled={isLoading}
          labelStyle={LoginStyles.buttonText}
        >
          {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
        </Button>

        <TouchableOpacity 
          onPress={() => !isLoading && navigation.navigate('Register')}
          disabled={isLoading}
        >
          <Text style={[
            LoginStyles.registerText,
            isLoading && { color: '#ccc' }
          ]}>
            ¿No tienes cuenta? <Text style={LoginStyles.registerLink}>Regístrate</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

