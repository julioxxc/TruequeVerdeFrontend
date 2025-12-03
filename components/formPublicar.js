import React, { useEffect, useRef, useState } from 'react';
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
import { useIsFocused, useNavigation } from '@react-navigation/native';


const FormPublicar = () => {
  const { user } = useUser();
  const isFocused = useIsFocused();
  const navigation = useNavigation();
  const mapRef = useRef(null);

  // Estados para formulario
  const [producto, setProducto] = useState('');
  const { logout, token: contextToken } = useUser();
  const [descripcion, setDescripcion] = useState('');
  const [cambioPor, setCambioPor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [greenpoints, setGreenpoints] = useState([]);
  const [selectedGreenPointId, setSelectedGreenPointId] = useState(null);
  const [selectionCandidate, setSelectionCandidate] = useState(null);
  const [confirmedLocation, setConfirmedLocation] = useState(null);
  const [confirmedGreenPointId, setConfirmedGreenPointId] = useState(null);

  // Estado para ubicación actual y seleccionada
  const [location, setLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);

  const isSameCoords = (a, b) =>
    !a || !b ? false : a.latitude === b.latitude && a.longitude === b.longitude;

  const fetchCurrentLocation = async () => {
    try {
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
      setConfirmedLocation(coords);
      setSelectionCandidate(null);
      setSelectedGreenPointId(null);
      setConfirmedGreenPointId(null);
    } catch (error) {
      console.log('No se pudo obtener ubicación:', error.message);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchCurrentLocation();
    }
  }, [isFocused]);

  useEffect(() => {
    if (isFocused && selectedLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500
      );
    }
  }, [isFocused, selectedLocation]);

  useEffect(() => {
    const fetchGreenpoints = async () => {
      try {
        const { data } = await api.get('/map/all');
        const points = (data.greenpoints || []).map((point) => ({
          ...point,
          latitude: parseFloat(point.latitude),
          longitude: parseFloat(point.longitude),
        }));
        setGreenpoints(points);
      } catch (error) {
        console.log('Error al obtener puntos verdes:', error.message);
      }
    };

    fetchGreenpoints();
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
    if (!confirmedLocation) {
      alert('No se ha seleccionado ubicación');
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('title', producto);
    formData.append('content', descripcion);
    formData.append('cambiar_por', cambioPor);
    formData.append('latitude', confirmedLocation.latitude.toString());
    formData.append('longitude', confirmedLocation.longitude.toString());
    formData.append('green_point_id', confirmedGreenPointId || 1);
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
          Authorization: `Bearer ${contextToken}`, // AsegA?rate de que el token sea correcto
        },
      });
      Alert.alert('Éxito!', 'Producto publicado con éxito');
      setProducto('');
      setDescripcion('');
      setCambioPor('');
      setCategoria('');
      setImages([]);
      setSelectedLocation(location);
      setConfirmedLocation(location);
      setConfirmedGreenPointId(null);
      setSelectionCandidate(null);
      navigation.navigate('Home', { screen: 'CatalogoMain' });
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
    setSelectedGreenPointId(null);
    setSelectionCandidate({
      coords: { latitude, longitude },
      label: 'Ubicación seleccionada',
      greenPointId: null,
    });
  };

  const onMarkerPress = (coords, label, greenPointId = null, moveMarker = false) => {
    if (moveMarker) {
      setSelectedLocation(coords);
      setSelectedGreenPointId(greenPointId);
    }
    setSelectionCandidate({ coords, label, greenPointId });
  };

  const confirmSelection = (selection) => {
    const chosen = selection || selectionCandidate;
    if (!chosen?.coords) return;
    setConfirmedLocation(chosen.coords);
    setConfirmedGreenPointId(chosen.greenPointId);
    setSelectedLocation(chosen.coords);
    setSelectedGreenPointId(chosen.greenPointId || null);
    setSelectionCandidate(null);
  };

  const fallbackSelection =
    selectedLocation && !selectionCandidate
      ? {
          coords: selectedLocation,
          label: selectedGreenPointId ? 'Punto verde seleccionado' : 'Marcador seleccionado',
          greenPointId: selectedGreenPointId,
        }
      : null;

  const selectionToShow = selectionCandidate || fallbackSelection;

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
          placeholder="Qué deseas recibir a cambio?"
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
            <Picker.Item label="Fruta" value="fruta" />
            <Picker.Item label="Verdura" value="verdura" />
            <Picker.Item label="Cereales y Tuberculos" value="cereales y Tuberculos" />
            <Picker.Item label="Brote" value="brote" />
            <Picker.Item label="Planta" value="planta" />
          </Picker>
        </View>
        <Text style={styles.label}>Ubicación seleccionada</Text>
        <Text style={styles.locationText}>
          {confirmedLocation
            ? `Lat: ${confirmedLocation.latitude?.toFixed(5)}  Lon: ${confirmedLocation.longitude?.toFixed(5)}`
            : 'Sin ubicación confirmada'}
        </Text>
        {/* Mapa con marcador draggable */}
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation>
          {greenpoints.map((point) => (
            <Marker
              key={`green-${point.id}`}
              coordinate={{ latitude: point.latitude, longitude: point.longitude }}
              pinColor="green"
              onPress={() =>
                onMarkerPress(
                  { latitude: point.latitude, longitude: point.longitude },
                  point.name ? point.name : `Punto verde #${point.id}`,
                  point.id,
                  false
                )
              }
            />
          ))}
          {selectedLocation && (
            <Marker
              coordinate={selectedLocation}
              draggable
              onDragEnd={onMarkerDragEnd}
              zIndex={9999}
              onPress={() =>
                onMarkerPress(
                  { latitude: selectedLocation.latitude, longitude: selectedLocation.longitude },
                  'Marcador seleccionado',
                  null,
                  true
                )
              }
            />
          )}
          {selectionCandidate &&
            !isSameCoords(selectionCandidate.coords, selectedLocation) && (
              <Marker
                coordinate={selectionCandidate.coords}
                pinColor={selectionCandidate.greenPointId ? 'green' : 'orange'}
              />
            )}
        </MapView>
        {selectionToShow && (
          <View style={styles.selectionCard}>
            <Text style={styles.selectionTitle}>Usar esta ubicación</Text>
            <Text style={styles.selectionText}>{selectionToShow.label}</Text>
            <Text style={styles.selectionText}>
              Lat: {selectionToShow.coords.latitude.toFixed(5)}  Lon:{' '}
              {selectionToShow.coords.longitude.toFixed(5)}
            </Text>
            <TouchableOpacity style={styles.confirmButton} onPress={() => confirmSelection(selectionToShow)}>
              <Text style={styles.confirmText}>Seleccionar coordenadas</Text>
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity
          style={[styles.submitButton, !user && { backgroundColor: 'gray' }]}
          onPress={submitForm}
          disabled={isSubmitting || !user}>
          <Text style={styles.submitText}>{isSubmitting ? 'Publicando...' : 'Publicar'}</Text>
        </TouchableOpacity>
        <View style={{ height: 60 }} />
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
  selectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    elevation: 4,
    marginBottom: 16,
    borderColor: '#2c5a48',
    borderWidth: 1,
  },
  selectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c5a48',
    marginBottom: 6,
  },
  selectionText: { color: '#333', marginBottom: 4 },
  confirmButton: {
    backgroundColor: '#2c5a48',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  confirmText: { color: 'white', fontWeight: 'bold' },
});

export default FormPublicar;
