import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import moment from 'moment'; // Ejecuta: npm install moment
import api from '../../services/api';
import { useUser } from '../../context/UserContext';

const FINISHED_BARTER_PREFIX = '__TRUEQUE_FINALIZADO__';
const SEEN_STORAGE_KEY = 'seen_conversations';

const getNotificationLabel = (conversation) => {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const lastSeenAtMs = conversation?.lastSeenAt
    ? new Date(conversation.lastSeenAt).getTime()
    : null;
  const getTimestamp = (value) => {
    const date = value ? new Date(value) : null;
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : null;
  };
  const lastMessageMs =
    getTimestamp(conversation?.updated_at) ||
    getTimestamp(conversation?.last_message_at) ||
    getTimestamp(messages[0]?.created_at) ||
    getTimestamp(messages[messages.length - 1]?.created_at) ||
    null;

  const hasNewSinceSeen =
    lastSeenAtMs !== null && lastMessageMs !== null ? lastMessageMs > lastSeenAtMs : false;

  const hasFinishedBarter = messages.some(
    (msg) => typeof msg?.content === 'string' && msg.content.startsWith(FINISHED_BARTER_PREFIX)
  );
  if (hasFinishedBarter) {
    return 'Trueque finalizado';
  }

  const barterStatus =
    conversation?.barter_status_id ??
    conversation?.barter_status ??
    conversation?.barter?.status_id;
  if (barterStatus === 1 || barterStatus === 'active') {
    return 'Trueque establecido';
  }

  const unreadCount = conversation?.unread_messages_count ?? conversation?.unread_count ?? 0;
  const hasUnread =
    hasNewSinceSeen ||
    (lastSeenAtMs === null && (unreadCount > 0 || messages.length > 0));

  if (!messages.length && lastSeenAtMs === null) {
    return 'Nueva conversación';
  }

  if (hasUnread) {
    return 'Mensaje nuevo';
  }

  return '';
};

const ConversationsList = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [seenConversations, setSeenConversations] = useState({});
  const navigation = useNavigation();
  const { user } = useUser();

  const [fontsLoaded] = useFonts({
    'Poppins-Regular': require('../../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
  });

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        navigation.replace('Login');
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
        navigation.replace('Login');
        return;
      }
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    AsyncStorage.getItem(SEEN_STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          setSeenConversations(JSON.parse(stored));
        }
      })
      .catch(() => {});
  }, []);

  const markConversationSeen = useCallback((conversationId) => {
    setSeenConversations((prev) => {
      const next = { ...prev, [conversationId]: new Date().toISOString() };
      AsyncStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
      return () => {};
    }, [fetchConversations])
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

    const productName = item.post?.title || 'Producto sin título';
    const rawName = otherUser
      ? `${otherUser?.name || ''} ${otherUser?.lastname || ''}`.trim()
      : '';
    const counterpartName = rawName || 'Usuario desconocido';
    const notificationLabel = getNotificationLabel({
      ...item,
      lastSeenAt: seenConversations?.[item.id] || null,
    });

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => {
          markConversationSeen(item.id);
          navigation.navigate('Chat', { conversationId: item.id });
        }}
      >
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {otherUser?.name?.[0]}
            {otherUser?.lastname?.[0]}
          </Text>
        </View>

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
            Conversación con:
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
