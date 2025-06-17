import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { useUser } from 'context/UserContext';
import api from 'services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';


const FormPublicar = () => {
  const { user } = useUser();

  // Estados para formulario
  const [producto, setProducto] = useState('');
  const { logout, token: contextToken } = useUser();
  const [descripcion, setDescripcion] = useState('');
  const [cambioPor, setCambioPor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado para ubicación actual y seleccionada
  const [location, setLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se requiere permiso para acceder a la ubicación');
        setLocationPermission(false);
        return;
      }
      setLocationPermission(true);

      let currentLocation = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
      setLocation(coords);
      setSelectedLocation(coords);
    })();
  }, []);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (!result.canceled) {
      setImages([...images, ...result.assets.map((asset) => asset.uri)]);
    }
  };

  const submitForm = async () => {
    if (!user?.id) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para publicar un producto.');
      return;
    }
    if (!producto || !descripcion || !cambioPor || !categoria) {
      alert('Por favor completa todos los campos incluyendo la categoría');
      return;
    }
    if (!selectedLocation) {
      alert('No se ha seleccionado ubicación');
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('title', producto);
    formData.append('content', descripcion);
    formData.append('cambiar_por', cambioPor);
    formData.append('latitude', selectedLocation.latitude.toString());
    formData.append('longitude', selectedLocation.longitude.toString());
    formData.append('green_point_id', 1);
    formData.append('item_id', 1);
    formData.append('status_id', 1);
    formData.append('user_id', user.id);
    formData.append('category_name', categoria);

    images.forEach((uri, index) => {
      formData.append('images[]', {
        uri,
        type: 'image/jpeg',
        name: `image${index}.jpg`,
      });
    });

    try {
      /*No funciono con bearer, dara error por el campo diferente*/
      const response = await api.post('/posts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${contextToken}`, // Asegúrate de que el token sea correcto
        },
      });
      Alert.alert('¡Éxito!', 'Producto publicado con éxito');
      setProducto('');
      setDescripcion('');
      setCambioPor('');
      setCategoria('');
      setImages([]);
      setSelectedLocation(location);
    } catch (error) {
      console.error('Error al publicar:', error.response?.data || error.message);
      console.log("token", contextToken);
      alert('Hubo un error al publicar el producto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onMarkerDragEnd = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
  };

  if (!locationPermission) {
    return (
      <View style={styles.container}>
        <Text style={{ color: 'red', textAlign: 'center', marginTop: 50 }}>
          No se ha concedido permiso para la ubicación.
        </Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 50 }}>Obteniendo ubicación...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {!user && (
          <Text style={{ color: 'red', fontWeight: 'bold', marginBottom: 10 }}>
            Debes iniciar sesión para publicar un producto.
          </Text>
        )}
        <Text style={styles.label}>Nombre del Producto</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Manzanas"
          value={producto}
          onChangeText={setProducto}
        />
        <Text style={styles.label}>Descripción</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder="Describe el producto"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
        />
        <Text style={styles.label}>Fotos</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
          <Text style={styles.uploadText}>Subir Fotos</Text>
        </TouchableOpacity>
        <ScrollView horizontal>
          {images.map((image, index) => (
            <Image key={index} source={{ uri: image }} style={styles.imagePreview} />
          ))}
        </ScrollView>
        <Text style={styles.label}>Cambio por</Text>
        <TextInput
          style={styles.input}
          placeholder="¿Qué deseas recibir a cambio?"
          value={cambioPor}
          onChangeText={setCambioPor}
        />
        <Text style={styles.label}>Categoría</Text>
        <View style={{ backgroundColor: '#fff', borderRadius: 15, marginBottom: 15, elevation: 2 }}>
          <Picker
            selectedValue={categoria}
            onValueChange={setCategoria}
            style={{ height: 50, width: '100%' }}>
            <Picker.Item label="Selecciona una categoría..." value="" />
            <Picker.Item label="Verdura" value="verdura" />
            <Picker.Item label="Fruta" value="fruta" />
            <Picker.Item label="Semilla" value="semilla" />
            <Picker.Item label="Brote" value="brote" />
            <Picker.Item label="Planta" value="planta" />
          </Picker>
        </View>
        <Text style={styles.label}>Ubicación seleccionada</Text>
        <Text style={styles.locationText}></Text>
        {/* Mapa con marcador draggable */}
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}>
          {selectedLocation && (
            <Marker coordinate={selectedLocation} draggable onDragEnd={onMarkerDragEnd} />
          )}
        </MapView>
        <TouchableOpacity
          style={[styles.submitButton, !user && { backgroundColor: 'gray' }]}
          onPress={submitForm}
          disabled={isSubmitting || !user}>
          <Text style={styles.submitText}>{isSubmitting ? 'Publicando...' : 'Publicar'}</Text>
        </TouchableOpacity>
        <View style={{ height: 60 }} />{' '}
        {/*Espacio en blanco para que boton de publicar no quede debajo de navigator*/}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
    fontFamily: 'Poppins-Bold',
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 15,
    fontSize: 16,
    marginBottom: 15,
    elevation: 2,
    fontFamily: 'Poppins-Regular',
  },
  uploadButton: {
    backgroundColor: '#ffa726',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadText: { color: 'white', fontWeight: 'bold', fontFamily: 'Poppins' },
  imagePreview: { width: 100, height: 100, borderRadius: 10, marginRight: 10, marginVertical: 5 },
  locationText: { fontSize: 16, color: '#555', marginBottom: 15, fontFamily: 'Poppins-Regular' },
  submitButton: {
    backgroundColor: '#2c5a48',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 40,
  },
  submitText: { fontSize: 18, fontWeight: 'bold', color: 'white', fontFamily: 'Poppins' },
  map: {
    height: 250,
    borderRadius: 15,
    marginBottom: 20,
  },
});

export default FormPublicar;
