import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Button,
  TouchableOpacity,
  Platform,
  FlatList,
  Image,
  TextInput,
  Modal,
  useColorScheme,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import Slider from '@react-native-community/slider';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';

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
      const response = await fetch('http://10.138.7.233:8000/api/map/all');
      const data = await response.json();

      const postsRounded = (data.posts || []).map((post: any) => ({
        ...post,
        latitude: roundCoord(post.latitude),
        longitude: roundCoord(post.longitude),
      }));

      const greenpointsRounded = (data.greenpoints || []).map((point: any) => ({
        ...point,
        latitude: roundCoord(point.latitude),
        longitude: roundCoord(point.longitude),
      }));

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

    const categoryMatch = selectedCategoryId ? post.category_id === selectedCategoryId : true;

    const searchMatch = searchQuery.trim()
      ? post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    return dist <= rangeKm && categoryMatch && searchMatch;
  });

  const categoryItems: { id: number | null; name: string }[] = [
    ...categories.map((cat) => ({ id: cat.id, name: cat.name })),
    { id: null, name: 'Todas' },
  ];

  const renderCategoryPill = ({ item }: { item: { id: number | null; name: string } }) => {
    const isSelected = selectedCategoryId === item.id;

    return (
      <TouchableOpacity
        onPress={() => setSelectedCategoryId(item.id)}
        style={[
          styles.categoryPill,
          { backgroundColor: isSelected ? '#006400' : '#e0e0e0' },
        ]}>
        <Text
          style={[styles.categoryPillText, { color: isSelected ? 'white' : '#333' }]}>
          {item.id === null ? item.name : capitalizeFirstLetter(item.name)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topControls} pointerEvents="box-none">
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
      </View>

      {showFilters && (
        <View style={styles.filtersOverlay} pointerEvents="box-none">
          <View style={styles.dropdownContent} pointerEvents="auto">
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

            <Text style={[styles.filterTitle, { marginTop: 10 }]}>Categorías:</Text>
            <View style={styles.categoryScrollWrapper}>
              <FlatList
                data={categoryItems}
                renderItem={renderCategoryPill}
                keyExtractor={(item) => (item.id === null ? 'all' : item.id?.toString())}
                horizontal
                scrollEnabled
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryList}
                style={styles.categoryListContainer}
              />
            </View>

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
        </View>
      )}

      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        pointerEvents={showFilters ? 'none' : 'auto'}
        scrollEnabled={!showFilters}
        zoomEnabled={!showFilters}>
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
              onPress={() => setSelectedMarker({ ...post, type: 'post' })}>
              <View
                style={{
                  backgroundColor:
                    colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
                  borderRadius: 15,
                  padding: 4,
                  elevation: 3,
                }}>
                <Image source={getCategoryIcon(post.category_name)} style={{ width: 22, height: 22 }} />
              </View>
            </Marker>
          ))}
      </MapView>

      <View style={styles.buttonContainer}>
        <Button title="Actualizar ubicación" onPress={getLocation} color="#006400" />
      </View>

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
                    navigation.navigate('Home', {
                      screen: 'CatalogoMain',
                      params: { openPostId: selectedMarker?.id },
                    });
                    setSelectedMarker(null);
                  }}>
                  <Text style={styles.closeModalText}>Ver publicación</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setSelectedMarker(null)}>
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
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    zIndex: 150,
    elevation: 5,
    marginHorizontal: 20,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  filtersOverlay: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 150,
    elevation: 10,
    paddingBottom: 10,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  filterTitle: {
    fontWeight: 'bold',
    marginBottom: 6,
  },
  categoryScrollWrapper: {
    marginBottom: 10,
  },
  categoryList: {
    paddingVertical: 6,
    paddingRight: 12,
    paddingLeft: 2,
  },
  categoryListContainer: {
    width: '100%',
  },
  categoryPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryPillText: {
    fontWeight: 'bold',
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
    elevation: 6,
    overflow: 'visible',
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
