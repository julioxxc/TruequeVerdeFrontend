import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  IconButton,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import moment from 'moment'; // Ejecuta: npm install moment
import api from '../../services/api';
import { useUser } from '../../context/UserContext';
import { useConversationContext } from '../../context/ConversationContext';

const FINISHED_BARTER_PREFIX = '__TRUEQUE_FINALIZADO__';

const getNotificationLabel = (conversation) => {
  // Sistema de notificaciones mejorado - usando datos del backend como fuente principal
  const isNew = conversation?.is_new;
  const isUnreadFromBackend = conversation?.is_unread;
  
  // Notificaciones del backend (prioridad alta)
  const newNotifications = conversation?.notifications;
  if (newNotifications) {
    if (newNotifications.has_pending_rating) return 'Calificación pendiente';
    if (newNotifications.has_trade_established) return 'Trueque establecido';
  }

  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];

  // Calificación pendiente: buscar mensaje especial o bandera
  const hasPendingRating = messages.some(
    (msg) =>
      typeof msg?.content === 'string' &&
      msg.content.startsWith(FINISHED_BARTER_PREFIX)
  ) || conversation?.has_pending_rating;
  if (hasPendingRating) {
    return 'Calificación pendiente';
  }

  // Trueque finalizado
  const hasFinishedBarter = messages.some(
    (msg) => typeof msg?.content === 'string' && msg.content.startsWith(FINISHED_BARTER_PREFIX)
  );
  if (hasFinishedBarter) {
    return 'Trueque finalizado';
  }

  // Trueque activo
  const barterStatus =
    conversation?.barter_status_id ??
    conversation?.barter_status ??
    conversation?.barter?.status_id;
  if (barterStatus === 1 || barterStatus === 'active') {
    return 'Trueque establecido';
  }

  // Nueva conversación: nunca vista por ningún usuario y tiene contenido
  if (isNew && (messages.length > 0 || isUnreadFromBackend)) {
    return 'Nueva conversacion';
  }

  // Mostrar "Mensaje nuevo" si el backend dice que hay unread
  if (isUnreadFromBackend) {
    return 'Mensaje nuevo';
  }

  return '';
};

const ConversationsList = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authAlertShown, setAuthAlertShown] = useState(false);
  const navigation = useNavigation();
  const { user } = useUser();
  const { subscribeToRatingChange } = useConversationContext();

  const [fontsLoaded] = useFonts({
    'Poppins-Regular': require('../../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
  });

  const redirectToLogin = useCallback(() => {
    const parentNav = navigation.getParent ? navigation.getParent() : null;
    if (parentNav?.navigate) {
      parentNav.navigate('Perfil', { screen: 'Login' });
      return;
    }
    navigation.navigate('Perfil', { screen: 'Login' });
  }, [navigation]);

  const showLoginAlert = useCallback(() => {
    Alert.alert(
      'Sesion requerida',
      'Necesitas iniciar sesion para acceder a esta funcion.',
      [
        { text: 'Iniciar sesion', onPress: redirectToLogin },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  }, [redirectToLogin]);

  const handleNoSession = useCallback(() => {
    setConversations([]);
    setError(null);
    setLoading(false);
    if (!authAlertShown) {
      setAuthAlertShown(true);
      showLoginAlert();
    }
  }, [authAlertShown, showLoginAlert]);

  useEffect(() => {
    if (user) {
      setAuthAlertShown(false);
    }
  }, [user]);

  // Escuchar cuando se califica en otra pantalla para refrescar
  useEffect(() => {
    const unsubscribe = subscribeToRatingChange(() => {
      refreshConversations();
    });
    return unsubscribe;
  }, [subscribeToRatingChange]);

  const fetchConversations = useCallback(async () => {
    if (!user) {
      handleNoSession();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        handleNoSession();
        return;
      }

      const response = await api.get('/conversations');
      const items = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
        ? response.data.data
        : [];
      setConversations(items);
    } catch (err) {
      if (err?.response?.status === 401) {
        await AsyncStorage.removeItem('userToken');
        handleNoSession();
        return;
      }
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [handleNoSession, navigation, user]);

  const markConversationSeen = useCallback((conversationId) => {
    // Sincronizar con el backend
    api.post(`/conversations/${conversationId}/mark-as-viewed`)
      .then(() => {
        // Actualizar estado local después de confirmación
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId
              ? { ...conv, is_new: false, is_unread: false }
              : conv
          )
        );
      })
      .catch((err) => {
        console.error('Error al marcar conversación como vista:', err);
      });
  }, []);

  // Función para recargar conversaciones desde el backend
  const refreshConversations = useCallback(async () => {
    if (!user) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const response = await api.get('/conversations');
      const items = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
        ? response.data.data
        : [];
      setConversations(items);
    } catch (err) {
      console.error('Error al refrescar conversaciones:', err);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
      
      // Refrescar conversaciones cada 5 segundos para detectar cambios
      // (ej: cuando el otro usuario califica)
      const refreshInterval = setInterval(() => {
        refreshConversations();
      }, 5000);
      
      return () => clearInterval(refreshInterval);
    }, [fetchConversations, refreshConversations])
  );

  const renderConversationItem = ({ item }) => {
    const currentUserId = user?.id ?? item.auth_user_id ?? item.current_user_id ?? null;
    const requestUser = item.request_user;
    const offerUser = item.offer_user;
    const otherUser =
      item.other_user ||
      (currentUserId && requestUser?.id === currentUserId && offerUser ? offerUser : null) ||
      (currentUserId && offerUser?.id === currentUserId && requestUser ? requestUser : null) ||
      (item.request_user_id === requestUser?.id ? offerUser : requestUser) ||
      offerUser ||
      requestUser ||
      null;

    const productName = item.post?.title || 'Producto sin titulo';
    const rawName = otherUser
      ? `${otherUser?.name || ''} ${otherUser?.lastname || ''}`.trim()
      : '';
    const counterpartName = rawName || 'Usuario desconocido';
    const notificationLabel = getNotificationLabel(item);

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => {
          markConversationSeen(item.id);
          navigation.navigate('Chat', { conversationId: item.id });
        }}
      >
  <Pressable
    onPress={(e) => {
      e.stopPropagation();
      navigation.navigate('PublicProfile', { userId: otherUser?.id });
    }}
    style={styles.avatarContainer}
  >
    <Text style={styles.avatarText}>
      {otherUser?.name?.[0]}
      {otherUser?.lastname?.[0]}
    </Text>
  </Pressable>

        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text
              style={[styles.productName, { fontFamily: 'Poppins-Bold' }]}
              numberOfLines={1}
            >
              {productName}
            </Text>
            <Text style={[styles.time, { fontFamily: 'Poppins-Regular' }]}>
              {moment(item.created_at).format('LT')}
            </Text>
          </View>
          <Text style={[styles.conversationLabel, { fontFamily: 'Poppins-Regular' }]}>
            Conversacion con:
          </Text>
          <Text
            style={[styles.counterpartName, { fontFamily: 'Poppins-Regular' }]}
            numberOfLines={1}
          >
            {counterpartName || 'Sin nombre'}
          </Text>
          {notificationLabel ? (
            <Text style={[styles.notificationText, { fontFamily: 'Poppins-Bold' }]}>
              {notificationLabel}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  if (!fontsLoaded) return <Text>Cargando fuentes...</Text>;
  if (loading) return <ActivityIndicator size="large" color="#66aa4f" style={styles.center} />;
  if (error) return <Text style={styles.error}>Error: {error}</Text>;

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={renderConversationItem}
        keyExtractor={(item, index) =>
          item && item.id != null ? item.id.toString() : index.toString()
        }
        ListEmptyComponent={<Text style={styles.empty}>No hay conversaciones activas</Text>}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingVertical: 10,
    paddingBottom: 90,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
  empty: {
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 10,
    elevation: 2,
  },
  avatarContainer: {
    backgroundColor: '#66aa4f',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  textContainer: {
    flex: 1,
    marginRight: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginRight: 8,
  },
  conversationLabel: {
    fontSize: 14,
    color: '#666',
  },
  counterpartName: {
    fontSize: 14,
    color: '#444',
    marginTop: 2,
  },
  notificationText: {
    marginTop: 6,
    fontSize: 14,
    color: '#2f855a',
  },
  time: {
    fontSize: 12,
    color: '#666',
  },
});

export default ConversationsList;
