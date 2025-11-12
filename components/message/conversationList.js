import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import moment from 'moment'; // Ejecuta: npm install moment

const ConversationsList = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();
  
  const [fontsLoaded] = useFonts({
    'Poppins-Regular': require('../../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
  });

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const response = await axios.get('http://192.168.1.72:8000/api/conversations', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        });
        // Normalizar la respuesta para garantizar un array (evita errores si la API devuelve
        // { data: [...] } o un objeto inesperado).
        const items = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.data)
          ? response.data.data
          : [];
        setConversations(items);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  const renderConversationItem = ({ item }) => {
    // Obtener usuario opuesto
    const currentUserId = item.request_user_id;
    const otherUser = currentUserId === item.request_user?.id 
      ? item.offer_user 
      : item.request_user;
      
    // Obtener último mensaje
    const lastMessage = item.messages?.[0];

    return (
      <TouchableOpacity 
        style={styles.conversationItem}
        onPress={() => navigation.navigate('Chat', { conversationId: item.id })}
      >
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {otherUser?.name?.[0]}{otherUser?.lastname?.[0]}
          </Text>
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.userName, { fontFamily: 'Poppins-Bold' }]}>
            {otherUser?.name} {otherUser?.lastname}
          </Text>
          <Text 
            style={[styles.lastMessage, { fontFamily: 'Poppins-Regular' }]}
            numberOfLines={1}
          >
            {lastMessage?.content || 'Nueva conversación'}
          </Text>
          <Text style={[styles.productTitle, { fontFamily: 'Poppins-Regular' }]}>
            {item.post?.title || 'Producto sin título'}
          </Text>
        </View>

        <Text style={[styles.time, { fontFamily: 'Poppins-Regular' }]}>
          {moment(item.created_at).format('LT')}
        </Text>
      </TouchableOpacity>
    );
  };

  if (!fontsLoaded) return <Text>Cargando fuentes...</Text>;
  if (loading) return <ActivityIndicator size="large" color="#66aa4f" style={styles.center} />;
  if (error) return <Text style={styles.error}>Error: {error}</Text>;

  return (
    <FlatList
      data={conversations}
      renderItem={renderConversationItem}
      keyExtractor={(item, index) => (item && item.id != null ? item.id.toString() : index.toString())}
      ListEmptyComponent={
        <Text style={styles.empty}>No hay conversaciones activas</Text>
      }
      contentContainerStyle={styles.listContent}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    paddingVertical: 10,
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
  userName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  productTitle: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  time: {
    fontSize: 12,
    color: '#666',
  },
});

export default ConversationsList;