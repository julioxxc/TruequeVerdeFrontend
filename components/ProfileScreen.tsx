import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity, Image, FlatList } from 'react-native';
import styles from 'components/stylesheet/ProfileStylesheet';
import { Avatar } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from 'context/UserContext';
import api from 'services/api';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

const HomeScreen = ({ navigation }) => {
  const { logout, token: contextToken, user } = useUser();
  const [posts, setPosts] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [location, setLocation] = useState(null);

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['userToken', 'userData']);
      await logout();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
      Alert.alert('Sesión cerrada', 'Has salido de tu cuenta correctamente');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      Alert.alert('Error', 'No se pudo cerrar la sesión');
    }
  };

  useEffect(() => {
    const fetchProfileAndPosts = async () => {
      try {
        if (!user?.username) return;
        const response = await api.get(`/profile/${user.username}`);
        const data = response.data || {};
        setProfileData(data);
        setPosts((data.posts || []).filter((post) => post.status_id === 2));
      } catch (error) {
        setProfileData(null);
        setPosts([]);
      } finally {
        setLoadingPosts(false);
      }
    };
    fetchProfileAndPosts();
  }, [user]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocation({
          latitude: 19.4326, // CDMX por defecto
          longitude: -99.1332,
        });
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    })();
  }, []);

  // Obtener la inicial del nombre de usuario
  const userInitial = user?.firstName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || '?';
  const renderRating = () => {
    const data = profileData || user;
    if (!data) return null;
    const avg = Number(
      data.rating_average ??
        (data.reputation_average !== undefined ? Number(data.reputation_average) / 10 : 0)
    );
    const normalized = Math.max(0, Math.min(5, avg));
    const fullStars = Math.floor(normalized);
    const hasHalf = normalized - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

    return (
      <View style={{ marginTop: 8 }}>
        <View style={styles.ratingRow}>
          {[...Array(fullStars)].map((_, idx) => (
            <Icon key={`full-${idx}`} name="star" size={22} color="#f59e0b" style={styles.ratingIcon} />
          ))}
          {hasHalf && <Icon name="star-half-full" size={22} color="#f59e0b" style={styles.ratingIcon} />}
          {[...Array(emptyStars)].map((_, idx) => (
            <Icon key={`empty-${idx}`} name="star-outline" size={22} color="#d1d5db" style={styles.ratingIcon} />
          ))}
          <Text style={styles.ratingValue}>
            {normalized.toFixed(1)} / 5
          </Text>
        </View>
        <Text style={styles.ratingLevel}>
          {data.reputation_level ? `Nivel: ${data.reputation_level}` : 'Sin nivel asignado'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Fondo verde oscuro, foto a la izquierda, info a la derecha */}
        <View style={styles.headerRow}>
          <View style={styles.avatarWrapper}>
            {user?.pfp && user.pfp !== "null" ? (
              <Image source={{ uri: user.pfp }} style={styles.avatar} />
            ) : (
              <Avatar.Text
                size={90}
                label={userInitial}
                style={styles.avatar}
                color="#fff"
              />
            )}
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
            <Text style={styles.name}>{user?.name} {user?.lastname}</Text>
            <Text style={styles.username}>@{user?.username}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Calificación</Text>
          {user ? renderRating() : <Text style={styles.loadingText}>Cargando calificación...</Text>}
        </View>

        {/* Información del usuario */}
        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <Icon name="email" size={22} color="#14532d" style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Correo:</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="phone" size={22} color="#14532d" style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Teléfono:</Text>
            <Text style={styles.infoValue}>{user?.phone}</Text>
          </View>
        </View>

        {/* Mini mapa de ubicación */}
        <Text style={styles.sectionTitle}>Tu ubicación</Text>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          {location ? (
            <MapView
              style={styles.map , { width: '90%', height: 200, borderRadius: 12 }}
              initialRegion={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker coordinate={location} />
            </MapView>
          ) : (
            <Text style={{ color: '#888' }}>Ubicación no disponible</Text>
          )}
        </View>

        {/* Publicaciones */}
        <Text style={styles.sectionTitle}>Tus Publicaciones</Text>
        {loadingPosts ? (
          <Text style={styles.loadingText}>Cargando publicaciones...</Text>
        ) : posts.length === 0 ? (
          <Text style={styles.noPosts}>No tienes publicaciones aún.</Text>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={item => item.id?.toString()}
            renderItem={({ item }) => {
              // Si la imagen ya es una URL completa, úsala. Si no, prepéndele la ruta base.
              const imageUrl = item.image?.startsWith('http')
                ? item.image
                : `http://192.168.1.72:8000/storage/posts/${item.image}`;

              return (
                <View style={styles.postCard}>
                  <Text style={styles.postTitle}>{item.title}</Text>
                  <View style={styles.postRow}>
                    <View style={styles.postImagePlaceholder}>
                      {item.image ? (
                        <Image
                          source={{ uri: imageUrl }}
                          style={{ width: 80, height: 80, borderRadius: 10 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={{ color: '#888' }}>Sin imagen</Text>
                      )}
                    </View>
                    <View style={styles.postInfo}>
                      <Text style={styles.postLabel}>Cambio por:</Text>
                      <Text style={styles.postContent}>
                        {item.cambiar_por || item.cambiarPor || item.content}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            }}
            scrollEnabled={false}
          />
        )}

        {/* Token de autenticación  */}
        <View style={styles.tokenSection}>
          <Text style={styles.tokenLabel}>Token de Autenticación:</Text>
          <Text style={styles.tokenValue} selectable={true}>
            {contextToken || 'No hay token disponible'}
          </Text>
        </View>

        <View style={styles.logoutButtonContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="logout" size={24} color="white" />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
         {/* Espacio para que el botón no quede cubierto */}
        <View style={{ height: 100 }} />
      </View>
       
      </ScrollView>


      
    </View>
  );
};

export default HomeScreen;
