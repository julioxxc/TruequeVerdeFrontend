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
} from 'react-native';
import MapView, { Marker, Region, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import Slider from '@react-native-community/slider';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

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
      const response = await fetch('https://truequeverde.aristoiz.com/api/map/all');
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
              pinColor="green">
              <Callout>
                <View>
                  <Text>{`Punto Verde #${point.id}`}</Text>
                </View>
              </Callout>
            </Marker>
          ))}

        {filterType !== 'greenpoints' &&
          filteredPosts.map((post) => (
            <Marker
              key={`user-${post.id}`}
              coordinate={{
                latitude: parseFloat(post.latitude),
                longitude: parseFloat(post.longitude),
              }}
              image={getCategoryIcon(post.category_name)}>
              <Callout>
                <View>
                  <Text>{post.title}</Text>
                  <Text>{post.content}</Text>
                  <Text style={{ fontStyle: 'italic', marginTop: 4 }}>
                    Categoría: {capitalizeFirstLetter(post.category_name)}
                  </Text>
                </View>
              </Callout>
            </Marker>
          ))}
      </MapView>

      <View style={styles.buttonContainer}>
        <Button title="Actualizar ubicación" onPress={getLocation} color="#006400" />
      </View>
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
});
