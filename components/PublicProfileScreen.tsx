import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  Animated,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import styles from 'components/stylesheet/ProfileStylesheet';
import { Avatar } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUser } from 'context/UserContext';
import api from 'services/api';
import MapView, { Marker } from 'react-native-maps';

const PublicProfileScreen = ({ route, navigation }) => {
  const userId = route.params?.userId;
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [location, setLocation] = useState(null);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const { user: currentUser } = useUser();
  const optionsAnimation = useState(new Animated.Value(0))[0];
  const optionsTranslateY = optionsAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 0],
  });


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
        // Asegurar que posts sea siempre un array para evitar errores al usar .length
        setPosts((response.data.posts || []).filter((post) => post.status_id === 2));
      } catch (error) {
        setPosts([]);
      } finally {
        setLoadingPosts(false);
      }
    };
    fetchPosts();
  }, [user]);

  const showOptionsMenu = () => {
    setOptionsVisible(true);
    Animated.timing(optionsAnimation, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  const hideOptionsMenu = () => {
    Animated.timing(optionsAnimation, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setOptionsVisible(false);
    });
  };

  const toggleOptionsMenu = () => {
    if (optionsVisible) {
      hideOptionsMenu();
    } else {
      showOptionsMenu();
    }
  };

  const handleSendMessage = () => {
    hideOptionsMenu();
    navigation.navigate('Chat', { userId });
  };

  const closeReportModal = () => {
    setReportModalVisible(false);
    setReportReason('');
  };

  const handleReportUser = () => {
    hideOptionsMenu();
    if (!currentUser?.id) {
      Alert.alert('Inicia sesion', 'Debes iniciar sesion para reportar usuarios.');
      return;
    }
    setReportModalVisible(true);
  };

  const handleSubmitReport = async () => {
    if (!currentUser?.id) {
      Alert.alert('Inicia sesion', 'Debes iniciar sesion para reportar usuarios.');
      closeReportModal();
      return;
    }
    if (!reportReason.trim()) {
      Alert.alert('Razon requerida', 'Por favor escribe la razon del reporte.');
      return;
    }
    const reportedUserId = Number(user?.id ?? userId);
    if (!reportedUserId || Number.isNaN(reportedUserId)) {
      Alert.alert('Error', 'No se pudo identificar al usuario a reportar.');
      return;
    }

    try {
      setSubmittingReport(true);
      const payload = {
        reported_user_id: reportedUserId,
        reporting_user_id: Number(currentUser.id),
        reason: reportReason.trim(),
      };
      const response = await api.post('/reports', payload);

      if (response.status === 201) {
        Alert.alert('Reporte enviado', 'Gracias por tu ayuda. Revisaremos tu reporte.');
        closeReportModal();
      } else {
        Alert.alert('No se pudo enviar', 'Intentalo nuevamente en unos minutos.');
      }
    } catch (error) {
      console.log('Error al reportar usuario:', error);
      Alert.alert('Error', 'No se pudo enviar el reporte. Intentalo nuevamente.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const renderRating = () => {
    if (!user) return null;
    const avg = Number(
      user.rating_average ??
        (user.reputation_average !== undefined ? Number(user.reputation_average) / 10 : 0)
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
          {user.reputation_level ? `Nivel: ${user.reputation_level}` : 'Sin nivel asignado'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeReportModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reportar usuario</Text>
            <Text style={styles.modalDescription}>Cuentanos brevemente la razon del reporte.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Escribe la razon"
              value={reportReason}
              onChangeText={setReportReason}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalSecondaryButton} onPress={closeReportModal}>
                <Text style={styles.modalSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalPrimaryButton, submittingReport && { opacity: 0.8 }]}
                onPress={handleSubmitReport}
                disabled={submittingReport}
              >
                {submittingReport ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalPrimaryText}>Enviar reporte</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
          <TouchableOpacity style={styles.optionsButton} onPress={toggleOptionsMenu}>
            <Icon name="dots-vertical" size={28} color="#fff" />
          </TouchableOpacity>
          {optionsVisible && (
            <Animated.View
              style={[
                styles.optionsMenu,
                { opacity: optionsAnimation, transform: [{ translateY: optionsTranslateY }] },
              ]}
            >
            
              <TouchableOpacity style={styles.optionsItem} onPress={handleReportUser}>
                <Icon name="alert-circle-outline" size={20} color="#b91c1c" style={styles.optionsIcon} />
                <Text style={[styles.optionsItemText, { color: '#b91c1c' }]}>Reportar usuario</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        {/* Aqui puede ir la reputacion IDK */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Calificación</Text>
          {user ? renderRating() : <Text style={styles.loadingText}>Cargando calificación...</Text>}
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
                : `http://10.138.7.233:8000/storage/posts/${item.image}`;

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

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

export default PublicProfileScreen;
