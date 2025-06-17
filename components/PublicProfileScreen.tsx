import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity, Image, FlatList } from 'react-native';
import styles from 'components/stylesheet/ProfileStylesheet';
import { Avatar } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import api from 'services/api';
import MapView, { Marker } from 'react-native-maps';

const PublicProfileScreen = ({ route, navigation }) => {
  const userId = route.params?.userId;
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    // Cargar datos del usuario
    const fetchUser = async () => {
      try {
        const response = await api.get(`/profileinfo/${userId}`);
        console.log('Usuario cargado:', response.data); // <-- LOG
        setUser(response.data);
        if (response.data.latitude && response.data.longitude) {
          setLocation({
            latitude: parseFloat(response.data.latitude),
            longitude: parseFloat(response.data.longitude),
          });
        }
      } catch (error) {
        console.log('Error al cargar usuario:', error); // <-- LOG
        Alert.alert('Error', 'No se pudo cargar el perfil del usuario');
      }
    };
    fetchUser();
  }, [userId]);

  useEffect(() => {
    // Cargar publicaciones del usuario
    const fetchPosts = async () => {
      if (!user?.username) return;
      try {
        const response = await api.get(`/profile/${user.username}`);
        console.log('Posts cargados:', response.data); // <-- LOG
        setPosts(response.data.posts); // <-- ¡Aquí el cambio!
      } catch (error) {
        setPosts([]);
      } finally {
        setLoadingPosts(false);
      }
    };
    fetchPosts();
  }, [user]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Botón para volver al chat */}
        <TouchableOpacity
          style={{ marginTop: 10, marginBottom: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center' }}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#14532d" />
          <Text style={{ marginLeft: 6, color: '#14532d', fontWeight: 'bold', fontSize: 16 }}>Volver al chat</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.avatarWrapper}>
            {user?.pfp && user.pfp !== "null" ? (
              <Image source={{ uri: user.pfp }} style={styles.avatar} />
            ) : (
              <Avatar.Text
                size={90}
                label={user ? (user.firstName?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || '?') : '?'}
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

        {/* Aqui puede ir la reputacion IDK */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Calificacion IDK</Text>
        </View>

        {/* Publicaciones */}
        <Text style={styles.sectionTitle}>Publicaciones</Text>
        {!user ? (
          <Text style={styles.loadingText}>Cargando perfil...</Text>
        ) : loadingPosts ? (
          <Text style={styles.loadingText}>Cargando publicaciones...</Text>
        ) : posts.length === 0 ? (
          <Text style={styles.noPosts}>No tiene publicaciones aún.</Text>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={item => item.id?.toString()}
            renderItem={({ item }) => {
              // Si la imagen ya es una URL completa, úsala. Si no, prepéndele la ruta base.
              const imageUrl = item.image?.startsWith('http')
                ? item.image
                : `https://truequeverde.aristoiz.com/storage/posts/${item.image}`;

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
                      <Text style={styles.postContent}>{item.content}</Text>
                    </View>
                  </View>
                </View>
              );
            }}
            scrollEnabled={false}
          />
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

export default PublicProfileScreen;