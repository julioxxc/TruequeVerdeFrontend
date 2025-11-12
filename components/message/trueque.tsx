import React, { useEffect, useState } from 'react';
import { View, TextInput, Button, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { ArrowLeft } from 'phosphor-react-native'; 
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

type FormularioProps = {
    route: { params: { postId: number } };
  };
  
const FormularioIntercambio: React.FC<FormularioProps> = ({route}) => {
  const [producto, setProducto] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [cambioPor, setCambioPor] = useState<string>('');
  const [ubicacion, setUbicacion] = useState<string>('');
  const [region, setRegion] = useState({
    latitude: 25.8437966,
    longitude: -97.4555196,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const { postId } = route.params;
  const [token, setToken] = useState<string|null>(null);

  // Al montar, carga el token
  useEffect(() => {
    AsyncStorage.getItem('userToken').then(t => setToken(t));
  }, []);

  const enviarFormulario = async () => {
    try {
        const response = await axios.post(
          'http://192.168.1.72:8000/api/barters',
          {
            post_id: postId,
            description: descripcion,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
  
        Alert.alert('Éxito', 'Intercambio creado correctamente');
        console.log('Respuesta:', response.data);
      } catch (error: any) {
        if (axios.isAxiosError(error)) {
            console.error('Axios error:', {
              message: error.message,
              status: error.response?.status,
              data: error.response?.data,
              headers: error.response?.headers,
            });
          } else {
            console.error('Unknown error:', error);
          }
        
          const mensaje = error.response?.data?.error || 'Error al crear el intercambio';
          Alert.alert('Error', mensaje);
      }
  };

  return (
    <View className="flex-1 bg-white p-4">
      <View className="flex-row items-center">
        <TouchableOpacity className="h-12 w-12 items-center justify-center rounded-full bg-lime-400">
          <ArrowLeft size={28} color="black" />
        </TouchableOpacity>

        <Text className="ml-4 text-2xl font-bold">Formulario de intercambio</Text>
      </View>

      <ScrollView className="mt-9">
        {/* Producto a Cambiar */}
        <Text className="mb-1 text-lg font-semibold">Producto a Cambiar</Text>
        <TextInput
          className="mb-4 rounded-full bg-gray-300 p-3 text-lg"
          placeholder="Nombre del producto"
          value={producto}
          onChangeText={setProducto}
        />

        {/* Descripción */}
        <Text className="mb-1 text-lg font-semibold">Descripción</Text>
        <TextInput
          className="mb-4 rounded-full bg-gray-300 p-3 text-lg"
          placeholder="Descripción del producto"
          value={descripcion}
          onChangeText={setDescripcion}
        />

        {/* Cambio por */}
        <Text className="mb-1 text-lg font-semibold">Cambio por</Text>
        <TextInput
          className="mb-4 rounded-full bg-gray-300 p-3 text-lg"
          placeholder="Que deseas cambiar por el producto"
          value={cambioPor}
          onChangeText={setCambioPor}
        />

        {/* Ubicación */}
        <Text className="mb-1 text-lg font-semibold">Ubicación</Text>
        <TextInput
          className="mb-4 rounded-full bg-gray-300 p-3 text-lg"
          placeholder="Ubicación"
          value={ubicacion}
          onChangeText={setUbicacion}
        />

        {/* Mapa */}
        <Text className="mb-2 text-lg font-semibold">Mapa</Text>
        <MapView
          style={{ height: 200, width: '100%', borderRadius: 10 }}
          region={region}
          onRegionChangeComplete={setRegion}>
          <Marker coordinate={region} title="Ubicación Actual" />
        </MapView>

        {/* Botón Enviar */}
        <TouchableOpacity 
          className="mt-4 rounded-full bg-lime-400 py-2 px-4" 
          onPress={enviarFormulario}>
          <Text className="text-center text-black font-semibold">Enviar Formulario</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default FormularioIntercambio;