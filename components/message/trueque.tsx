import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import MapView, { MapPressEvent, Marker, MarkerDragEndEvent } from 'react-native-maps';
import { ArrowLeft } from 'phosphor-react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import api from 'services/api';

type FormularioProps = {
  route: { params: { postId: number } };
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type SelectionCandidate = {
  coords: Coordinates;
  label: string;
  greenPointId?: number | null;
};

const FormularioIntercambio: React.FC<FormularioProps> = ({ route }) => {
  const [producto, setProducto] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [cambioPor, setCambioPor] = useState<string>('');
  const { postId } = route.params;
  const [token, setToken] = useState<string | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Coordinates | null>(null);
  const [selectionCandidate, setSelectionCandidate] = useState<SelectionCandidate | null>(null);
  const [confirmedLocation, setConfirmedLocation] = useState<Coordinates | null>(null);
  const [greenpoints, setGreenpoints] = useState<any[]>([]);
  const [selectedGreenPointId, setSelectedGreenPointId] = useState<number | null>(null);

  const isSameCoords = (a: Coordinates | null, b: Coordinates | null) =>
    !a || !b ? false : a.latitude === b.latitude && a.longitude === b.longitude;

  // Al montar, carga el token
  useEffect(() => {
    AsyncStorage.getItem('userToken').then((t) => setToken(t));
  }, []);

  const fetchCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se requiere permiso para acceder a la ubicación');
        setLocationPermission(false);
        return;
      }
      setLocationPermission(true);
      const currentLocation = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
      setLocation(coords);
      setSelectedLocation(coords);
      setConfirmedLocation(coords);
      setSelectionCandidate(null);
    } catch (error: any) {
      console.log('No se pudo obtener ubicación:', error.message);
      Alert.alert('Sin ubicación', 'No se pudo obtener tu ubicación actual.');
    }
  };

  useEffect(() => {
    fetchCurrentLocation();
  }, []);

  useEffect(() => {
    const fetchGreenpoints = async () => {
      try {
        const { data } = await api.get('/map/all');
        const points = (data.greenpoints || []).map((point: any) => ({
          ...point,
          latitude: parseFloat(point.latitude),
          longitude: parseFloat(point.longitude),
        }));
        setGreenpoints(points);
      } catch (error: any) {
        console.log('Error al obtener puntos verdes:', error.message);
      }
    };

    fetchGreenpoints();
  }, []);

  useEffect(() => {
    if (selectedLocation && mapRef.current) {
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
  }, [selectedLocation]);

  const onMarkerDragEnd = (event: MarkerDragEndEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
    setSelectedGreenPointId(null);
    setSelectionCandidate({
      coords: { latitude, longitude },
      label: 'Ubicación seleccionada',
      greenPointId: null,
    });
  };

  const onMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
    setSelectedGreenPointId(null);
    setSelectionCandidate({
      coords: { latitude, longitude },
      label: 'Ubicación seleccionada',
      greenPointId: null,
    });
  };

  const onMarkerPress = (
    coords: Coordinates,
    label: string,
    greenPointId: number | null = null,
    moveMarker = false
  ) => {
    if (moveMarker) {
      setSelectedLocation(coords);
      setSelectedGreenPointId(greenPointId);
    }
    setSelectionCandidate({ coords, label, greenPointId });
  };

  const confirmSelection = (selection?: SelectionCandidate) => {
    const chosen = selection || selectionCandidate;
    if (!chosen) return;
    setConfirmedLocation(chosen.coords);
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

  const Header = () => (
    <View className="flex-row items-center">
      <TouchableOpacity className="h-12 w-12 items-center justify-center rounded-full bg-emerald-800">
        <ArrowLeft size={28} color="white" />
      </TouchableOpacity>

      <Text className="ml-4 text-2xl font-bold">Intercambio</Text>
    </View>
  );

  if (!locationPermission) {
    return (
      <View className="flex-1 bg-white p-4">
        <Header />
        <View className="mt-10">
          <Text className="text-center text-red-500">
            No se ha concedido permiso para la ubicación.
          </Text>
        </View>
      </View>
    );
  }

  if (!location) {
    return (
      <View className="flex-1 bg-white p-4">
        <Header />
        <View className="mt-10">
          <Text className="text-center">Obteniendo ubicación...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white p-4">
      <Header />

      <ScrollView className="mt-9" contentContainerStyle={{ paddingBottom: 56 }}>
        {/* Producto a Cambiar */}
        <Text className="mb-1 text-lg font-semibold">Producto a Cambiar</Text>
        <TextInput
          className="mb-4 rounded-full bg-gray-300 p-3 text-lg"
          placeholder="Nombre del producto"
          value={producto}
          onChangeText={setProducto}
        />

        {/* Cambio por */}
        <Text className="mb-1 text-lg font-semibold">Cambio por</Text>
        <TextInput
          className="mb-4 rounded-full bg-gray-300 p-3 text-lg"
          placeholder="Que deseas cambiar por el producto"
          value={cambioPor}
          onChangeText={setCambioPor}
        />

                {/* Descripción */}
        <Text className="mb-1 text-lg font-semibold">Descripción</Text>
        <TextInput
          className="mb-4 rounded-full bg-gray-300 p-3 text-lg"
          placeholder="Descripción del Intercambio"
          value={descripcion}
          onChangeText={setDescripcion}
        />

        {/* Ubicación seleccionada */}
        <Text className="mb-1 text-lg font-semibold">Ubicación seleccionada</Text>
        <Text className="mb-3 text-base text-gray-700">
          {confirmedLocation
            ? `Lat: ${confirmedLocation.latitude.toFixed(5)}  Lon: ${confirmedLocation.longitude.toFixed(5)}`
            : 'Sin ubicación confirmada'}
        </Text>

        {/* Mapa */}
        <Text className="mb-2 text-lg font-semibold">Mapa</Text>
        <MapView
          ref={mapRef}
          style={{ height: 250, width: '100%', borderRadius: 12 }}
          initialRegion={{
            latitude: selectedLocation?.latitude ?? location.latitude,
            longitude: selectedLocation?.longitude ?? location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation
          onPress={onMapPress}>
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
              title="Ubicación seleccionada"
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
          {selectionCandidate && !isSameCoords(selectionCandidate.coords, selectedLocation) && (
            <Marker coordinate={selectionCandidate.coords} pinColor="orange" />
          )}
        </MapView>

        {selectionToShow && (
          <View className="mt-3 rounded-xl border border-emerald-800 bg-white p-3 shadow">
            <Text className="text-base font-semibold text-emerald-800">Usar esta ubicación</Text>
            <Text className="text-sm text-gray-700">{selectionToShow.label}</Text>
            <Text className="text-sm text-gray-700">
              {`Lat: ${selectionToShow.coords.latitude.toFixed(5)}  Lon: ${selectionToShow.coords.longitude.toFixed(5)}`}
            </Text>
            <TouchableOpacity
              className="mt-2 rounded-lg bg-emerald-700 py-2"
              onPress={() => confirmSelection(selectionToShow)}>
              <Text className="text-center font-semibold text-white">Seleccionar coordenadas</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Botón Enviar */}
        <TouchableOpacity
          className="mt-4 mb-4 rounded-full bg-emerald-800 py-2 px-4"
          onPress={enviarFormulario}>
          <Text className="text-center text-white font-semibold" >Enviar Formulario</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default FormularioIntercambio;
