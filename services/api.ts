import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: 'https://truequeverde.aristoiz.com/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interceptor para añadir el token
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token inválido o expirado
      await AsyncStorage.removeItem('userToken');
    }
    return Promise.reject(error);
  }
);

// Métodos de autenticación
export const validateToken = async () => {
  try {
    console.log('Validating token...');
    const response = await api.get('/validateToken');
    console.log('Token validd response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Token validation failed:', error);
    return false;
  }
};

export const loginUser = async (credentials: { email?: string; username?: string; password: string }) => {
  try {
    const response = await api.post('/login', credentials);
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await api.post('/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    await AsyncStorage.removeItem('userToken');
  }
};

// Método para obtener el token de autenticación
export const getAuthToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem('userToken');
};


export const validateTokenWith = async (token: string) => {
  try {
    const response = await api.get('/validateToken', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Token validation failed:', error);
    return false;
  }
};

// Métodos de datos
export const getStates = () => api.get('/states');
export const getCities = (stateId: string) => api.get(`/cities/${stateId}`);
export const registerUser = (userData: any) => api.post('/register', userData);

export default api;