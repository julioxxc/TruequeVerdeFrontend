import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import MapView, { MapPressEvent, Marker, MarkerDragEndEvent } from 'react-native-maps';
import { ArrowLeft } from 'phosphor-react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import api from 'services/api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type ActiveBarterBanner = {
  id: number | string;
  offer: string;
  request: string;
  description?: string | null;
  greenpointId?: number | null;
  amount?: number | null;
  unit?: string | null;
  unitId?: number | null;
};

type BarterStackParamList = {
  BarterScreen: { postId: number; conversationId: number };
  Chat: { conversationId: number; activeBarter?: ActiveBarterBanner };
};

type FormularioProps = NativeStackScreenProps<BarterStackParamList, 'BarterScreen'>;

type Coordinates = {
  latitude: number;
  longitude: number;
};

type SelectionCandidate = {
  coords: Coordinates;
  label: string;
  greenPointId?: number | null;
};

const normalizeText = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const FormularioIntercambio: React.FC<FormularioProps> = ({ route, navigation }) => {
  const [producto, setProducto] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [cambioPor, setCambioPor] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedCambioId, setSelectedCambioId] = useState<number | null>(null);
  const { postId, conversationId } = route.params;
  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<{ id: number; name: string; category?: string }[]>([]);
  const [unitId, setUnitId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const unitOptions = [
    { id: 1, label: 'Piezas' },
    { id: 2, label: 'Kilos' },
    { id: 3, label: 'Gramos' },
  ];
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

        const elements = (data.elements || []).map((element: any) => ({
          id: element.element_id,
          name: element.element_name,
          category: element.category_name,
        }));
        setItems(elements);
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
      if (!selectedProductId || !selectedCambioId) {
        Alert.alert('Datos incompletos', 'Selecciona el producto ofrecido y el solicitado.');
        return;
      }

      if (!items.length) {
        Alert.alert('Sin datos', 'No se pudieron cargar los items, intenta nuevamente.');
        return;
      }

      // Preferir ids seleccionados
      const similarOffer = items.find((item) => item.id === selectedProductId) || null;
      const similarRequest = items.find((item) => item.id === selectedCambioId) || null;

      if (!similarOffer) {
        Alert.alert('No encontrado', 'No se encontró el item ofrecido en la base de datos.');
        return;
      }

      if (!similarRequest) {
        Alert.alert('No encontrado', 'No se encontró el item solicitado en la base de datos.');
        return;
      }

      const parsedUnitId = unitId ? Number(unitId) : null;
      const parsedAmount = amount ? Number(amount) : null;
      const coordsToSend = confirmedLocation || selectedLocation || location;

      const response = await axios.post(
        'http://10.138.7.233:8000/api/barters',
        {
          post_id: postId,
          description: descripcion,
          offer_item_id: similarOffer.id,
          request_item_id: similarRequest.id,
          unit_id: parsedUnitId,
          amount: parsedAmount,
          greenpoint_id: selectedGreenPointId,
          status_id: 1,
          latitude: coordsToSend?.latitude ?? null,
          longitude: coordsToSend?.longitude ?? null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const barterBanner: ActiveBarterBanner = {
        id: response?.data?.id ?? Date.now(),
        offer: producto.trim(),
        request: cambioPor.trim(),
        description: descripcion.trim() || null,
        greenpointId: selectedGreenPointId,
        amount: parsedAmount ?? null,
        unitId: parsedUnitId ?? null,
        unit: unitOptions.find((u) => u.id === parsedUnitId)?.label ?? null,
      };

      try {
        await AsyncStorage.setItem(
          'activeBarter:' + conversationId,
          JSON.stringify(barterBanner)
        );
      } catch (storageError) {
        console.log('No se pudo guardar el estado del trueque:', storageError);
      }

      Alert.alert('Éxito', 'Intercambio creado correctamente');
      navigation.replace('Chat', { conversationId, activeBarter: barterBanner });
      console.log('Respuesta:', response.data);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        console.error('Axios error:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers,
        });
        
        // ✅ Manejo específico del error 409 (Conflict)
        if (error.response?.status === 409) {
          Alert.alert(
            'Acción bloqueada',
            'Ya tienes un intercambio activo. Finaliza o cancela el anterior antes de crear uno nuevo.',
            [
              { text: 'Entendido', onPress: () => navigation.goBack() }
            ]
          );
          return;
        }
      } else {
        console.error('Unknown error:', error);
      }

      const mensaje = error.response?.data?.error || 'Error al crear el intercambio';
      Alert.alert('Error', mensaje);
    }
  };

  const Header = () => (
    <View className="flex-row items-center">
      <TouchableOpacity
        className="h-12 w-12 items-center justify-center rounded-full bg-emerald-800"
        onPress={() => navigation.goBack()}>
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
        <View className="mb-4 rounded-full bg-gray-300">
          <Picker
            selectedValue={selectedProductId}
            onValueChange={(val) => {
              setSelectedProductId(val as number | null);
              const sel = items.find((i) => i.id === val);
              setProducto(sel ? sel.name : '');
            }}
            style={{ height: 50, width: '100%' }}>
            <Picker.Item label="Selecciona un producto..." value={null} />
            {items.map((it) => (
              <Picker.Item key={it.id} label={it.name} value={it.id} />
            ))}
          </Picker>
        </View>

        <Text className="mb-1 text-lg font-semibold">Unidad y cantidad</Text>
        <View className="mb-4 flex-row items-center space-x-2">
          <View className="flex-1 flex-row flex-wrap gap-2">
            {[
              { id: 1, label: 'Piezas' },
              { id: 2, label: 'Kilos' },
              { id: 3, label: 'Gramos' },
            ].map((unit) => (
              <TouchableOpacity
                key={unit.id}
                className={`rounded-full px-4 py-2 ${unitId === String(unit.id) ? 'bg-emerald-700' : 'bg-gray-300'}`}
                onPress={() => setUnitId(String(unit.id))}
              >
                <Text className={`text-sm font-semibold ${unitId === String(unit.id) ? 'text-white' : 'text-black'}`}>
                  {unit.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            className="w-24 rounded-full bg-gray-300 p-3 text-lg"
            placeholder="Cantidad"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
        </View>
        
                {/* Descripción */}
        <Text className="mb-1 text-lg font-semibold">Descripción</Text>
        <TextInput
          className="mb-4 rounded-full bg-gray-300 p-3 text-lg"
          placeholder="Descripción del Intercambio"
          value={descripcion}
          onChangeText={setDescripcion}
        />

        {/* Cambio por */}
        <Text className="mb-1 text-lg font-semibold">Cambio por</Text>
        <View className="mb-4 rounded-full bg-gray-300">
          <Picker
            selectedValue={selectedCambioId}
            onValueChange={(val) => {
              setSelectedCambioId(val as number | null);
              const sel = items.find((i) => i.id === val);
              setCambioPor(sel ? sel.name : '');
            }}
            style={{ height: 50, width: '100%' }}>
            <Picker.Item label="Selecciona un producto..." value={null} />
            {items.map((it) => (
              <Picker.Item key={`c-${it.id}`} label={it.name} value={it.id} />
            ))}
          </Picker>
        </View>

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
