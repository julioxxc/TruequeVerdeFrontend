import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Button,
  TouchableOpacity,
  Platform,
  ScrollView,
  Image,
  TextInput,
  Modal,
  useColorScheme,
} from 'react-native';
import MapView, { Marker, Region, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import Slider from '@react-native-community/slider';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function capitalizeFirstLetter(str: string) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'fruta':
      return require('../../assets/MapFilter/apple_icon.png');
    case 'verdura':
      return require('../../assets/MapFilter/lettuce_icon.png');
    case 'semilla':
      return require('../../assets/MapFilter/seeds_icon.png');
    case 'brote':
      return require('../../assets/MapFilter/sprout_icon.png');
    case 'planta':
      return require('../../assets/MapFilter/plant_icon.png');
  }
};

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [greenpoints, setGreenpoints] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'posts' | 'greenpoints'>('all');
  const [rangeKm, setRangeKm] = useState<number>(5);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarker, setSelectedMarker] = useState<any>(null);
  const navigation = useNavigation();
  const colorScheme = useColorScheme();

  const getLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permiso para acceder a la ubicación denegado');
        return;
      }
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    } catch (error: any) {
      setErrorMsg('Error al obtener ubicación: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const roundCoord = (numStr: string) => {
    const num = parseFloat(numStr);
    return Math.round(num * 10000) / 10000;
  };

  const fetchGreenpoints = async () => {
    try {
      const response = await fetch('http://192.168.1.72:8000/api/map/all');
      const data = await response.json();

      // Redondear coordenadas en posts
      const postsRounded = (data.posts || []).map((post: any) => ({
        ...post,
        latitude: roundCoord(post.latitude),
        longitude: roundCoord(post.longitude),
      }));
      console.log('Posts redondeados:', postsRounded);

      // Redondear coordenadas en greenpoints
      const greenpointsRounded = (data.greenpoints || []).map((point: any) => ({
        ...point,
        latitude: roundCoord(point.latitude),
        longitude: roundCoord(point.longitude),
      }));
      console.log('Greenpoints redondeados:', greenpointsRounded);

      setPosts(postsRounded);
      setGreenpoints(greenpointsRounded);
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error al obtener greenpoints:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      getLocation();
      fetchGreenpoints();
      // Opcional: resetear filtros si también quieres que se reinicien
      setFilterType('all');
      setRangeKm(5);
      setSelectedCategoryId(null);
      setSearchQuery('');
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#006400" />
        <Text>Cargando ubicación...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.center}>
        <Text>{errorMsg}</Text>
        <Button title="Intentar de nuevo" onPress={getLocation} />
      </View>
    );
  }

  const initialRegion: Region = {
    latitude: location?.coords.latitude || 25.85,
    longitude: location?.coords.longitude || -97.5,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const filteredGreenpoints = greenpoints.filter((point) => {
    if (!location) return false;
    const dist = getDistanceFromLatLonInKm(
      location.coords.latitude,
      location.coords.longitude,
      parseFloat(point.latitude),
      parseFloat(point.longitude)
    );
    return dist <= rangeKm;
  });

  const filteredPosts = posts.filter((post) => {
    if (!location) return false;

    const dist = getDistanceFromLatLonInKm(
      location.coords.latitude,
      location.coords.longitude,
      parseFloat(post.latitude),
      parseFloat(post.longitude)
    );
    //console.log(`Post ${post.id} - Distancia: ${dist} km`);

    const categoryMatch = selectedCategoryId ? post.category_id === selectedCategoryId : true;

    const searchMatch = searchQuery.trim()
      ? post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    return dist <= rangeKm && categoryMatch && searchMatch;
  });

  return (
    <View style={styles.container}>
      <View style={styles.topControls}>
        <TextInput
          placeholder="Buscar por título o descripción"
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
        <TouchableOpacity
          onPress={() => setShowFilters((prev) => !prev)}
          style={styles.dropdownButton}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Filtros</Text>
        </TouchableOpacity>

        {showFilters && (
          <View style={styles.dropdownContent}>
            <Text style={styles.filterTitle}>Tipo de marcador:</Text>
            <View style={styles.buttonsRow}>
              <Button
                title="Todos"
                onPress={() => setFilterType('all')}
                color={filterType === 'all' ? '#006400' : 'gray'}
              />
              <Button
                title="Posts"
                onPress={() => setFilterType('posts')}
                color={filterType === 'posts' ? '#006400' : 'gray'}
              />
              <Button
                title="Greenpoints"
                onPress={() => setFilterType('greenpoints')}
                color={filterType === 'greenpoints' ? '#006400' : 'gray'}
              />
            </View>

            {/* Slider Horizontal de Categorías */}
            <Text style={[styles.filterTitle, { marginTop: 10 }]}>Categorías:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategoryId(cat.id)}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    backgroundColor: selectedCategoryId === cat.id ? '#006400' : '#e0e0e0',
                    borderRadius: 20,
                    marginRight: 8,
                  }}>
                  <Text
                    style={{
                      color: selectedCategoryId === cat.id ? 'white' : '#333',
                      fontWeight: 'bold',
                    }}>
                    {capitalizeFirstLetter(cat.name)}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setSelectedCategoryId(null)}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  backgroundColor: selectedCategoryId === null ? '#006400' : '#e0e0e0',
                  borderRadius: 20,
                }}>
                <Text
                  style={{
                    color: selectedCategoryId === null ? 'white' : '#333',
                    fontWeight: 'bold',
                  }}>
                  Todas
                </Text>
              </TouchableOpacity>
            </ScrollView>
            <Text style={[styles.filterTitle, { marginTop: 10 }]}>Rango: {rangeKm} km</Text>
            <Slider
              style={{ width: 220, height: 40 }}
              minimumValue={1}
              maximumValue={50}
              step={1}
              minimumTrackTintColor="#006400"
              maximumTrackTintColor="#000000"
              thumbTintColor="#006400"
              value={rangeKm}
              onValueChange={setRangeKm}
            />
          </View>
        )}
      </View>
      <MapView style={styles.map} initialRegion={initialRegion} showsUserLocation>
        {filterType !== 'posts' &&
          filteredGreenpoints.map((point) => (
            <Marker
              key={`green-${point.id}`}
              coordinate={{
                latitude: parseFloat(point.latitude),
                longitude: parseFloat(point.longitude),
              }}
              pinColor="green"
              onPress={() => {
                console.log('Punto verde seleccionado:', point);
                setSelectedMarker({ ...point, type: 'greenpoint' });
              }}
            />
          ))}

        {filterType !== 'greenpoints' &&
          filteredPosts.map((post) => (
            <Marker
              key={`user-${post.id}`}
              coordinate={{
                latitude: parseFloat(post.latitude),
                longitude: parseFloat(post.longitude),
              }}
              onPress={() => setSelectedMarker({ ...post, type: 'post' })}
            >
              <View style={{ 
                backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
                borderRadius: 15,
                padding: 4,
                elevation: 3
              }}>
                <Image
                  source={getCategoryIcon(post.category_name)}
                  style={{ width: 22, height: 22 }}
                />
              </View>
            </Marker>
          ))}
      </MapView>

      <View style={styles.buttonContainer}>
        <Button title="Actualizar ubicación" onPress={getLocation} color="#006400" />
      </View>

      {/* Modal personalizado para mostrar info del marcador */}
      <Modal visible={!!selectedMarker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedMarker(null)}>
          <View style={styles.markerInfoBox}>
            {selectedMarker?.type === 'greenpoint' ? (
              <>
                <Text style={styles.markerInfoTitle}>
                  {selectedMarker?.name ? selectedMarker.name : `Punto Verde #${selectedMarker?.id}`}
                </Text>
                {selectedMarker?.description && (
                  <Text style={styles.markerInfoText}>
                    <Text style={{ fontWeight: 'bold' }}>Descripción:</Text> {selectedMarker.description}
                  </Text>
                )}
                <Text style={styles.markerInfoText}>
                  <Text style={{ fontWeight: 'bold' }}>ID:</Text> {selectedMarker?.id}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.markerInfoTitle}>{selectedMarker?.title}</Text>
                <Text style={styles.markerInfoText}>
                  <Text style={{ fontWeight: 'bold' }}>Cambio por:</Text> {selectedMarker?.content}
                </Text>
                <Text style={styles.markerInfoText}>
                  <Text style={{ fontWeight: 'bold' }}>Categoría:</Text> {capitalizeFirstLetter(selectedMarker?.category_name)}
                </Text>
                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={() => {
                    // Navegar al catálogo y pasar el id para que abra la publicación
                    // Navegación anidada: ir a la pestaña 'Home' y al screen 'CatalogoMain'
                    navigation.navigate('Home', { screen: 'CatalogoMain', params: { openPostId: selectedMarker?.id } });
                    setSelectedMarker(null);
                  }}
                >
                  <Text style={styles.closeModalText}>Ver publicación</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setSelectedMarker(null)}>
              <Text style={styles.closeModalText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function toFourDecimals(num: number): number {
  return Math.round(num * 10000) / 10000;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  buttonContainer: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'transparent',
  },
  dropdownContainer: {
    backgroundColor: 'rgba(0,100,0,0.8)',
  },
  dropdownButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#006400',
    borderRadius: 6,
  },
  dropdownContent: {
    position: 'absolute',
    top: 50, // justo debajo del topControls
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    zIndex: 99,
    elevation: 5,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  filterTitle: {
    fontWeight: 'bold',
    marginBottom: 6,
  },
  topControls: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 100,
  },

  searchInput: {
    flex: 1,
    backgroundColor: 'white',
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderRadius: 8,
    fontSize: 16,
  },
  calloutContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    minWidth: 200,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#006400',
    marginBottom: 4,
  },
  calloutText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerInfoBox: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    maxWidth: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  markerInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#006400',
    marginBottom: 12,
  },
  markerInfoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  closeModalButton: {
    backgroundColor: '#006400',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 16,
    alignItems: 'center',
  },
  closeModalText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
