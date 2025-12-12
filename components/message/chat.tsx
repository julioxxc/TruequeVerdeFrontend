import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Animated, Alert } from 'react-native';
import { ArrowLeft, User, Plus, Send, MapPin } from 'lucide-react-native';
import { Image } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from 'context/UserContext';
import * as ImagePicker from 'expo-image-picker';

type RootStackParamList = {
  Chat: { conversationId: number };
  BarterScreen: { conversationId: number; postId: number };
  PublicProfile: { userId: number }; // prueba de navegación al perfil público
};

type Conversation = {
  id: number;
  offer_user_id: number;
  post_id: number;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export default function Chat({ route, navigation }: Props) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<{ id: number; text: string; isMe: boolean }[]>([]);
  const [inputText, setInputText] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const menuAnimation = useState(new Animated.Value(0))[0];
  const { user } = useUser();
  const { conversationId } = route.params;
  const [chatPartner, setChatPartner] = useState<{
    id: number;
    name: string;
    lastname: string;
  } | null>(null);

  const fetchConversation = async (conversationId: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(
        `http://192.168.1.72:8000/api/conversations/${conversationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );
      const data = await response.json();
      setChatPartner(data.other_user);
      setConversation(data);
      return data;
    } catch (error) {
      console.error('Error al obtener conversación:', error);
    }
  };

  const fetchMessages = async (conversationId: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(
        `http://192.168.1.72:8000/api/conversations/${conversationId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );
      const data = await response.json();
      const formatted = data.map((msg: any) => ({
        id: msg.id,
        text: msg.content,
        isMe: msg.user_id === user?.id,
      }));
      setMessages(formatted);
    } catch (error) {
      console.error('Error al obtener mensajes:', error);
    }
  };

  const sendMessageToApi = async (text: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(
        `http://192.168.1.72:8000/api/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ content: text }),
        }
      );

      const newMessage = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          id: newMessage.id,
          text: newMessage.content,
          isMe: true,
        },
      ]);
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
    }
  };

  const handleSend = () => {
    if (inputText.trim()) {
      sendMessageToApi(inputText.trim());
      setInputText('');
    }
  };

  const toggleMenu = () => {
    Animated.timing(menuAnimation, {
      toValue: menuVisible ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setMenuVisible(!menuVisible);
  };

  const menuTranslateY = menuAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  useEffect(() => {
    fetchConversation(conversationId);
    fetchMessages(conversationId);
    const interval = setInterval(() => fetchMessages(conversationId), 1000);
    return () => clearInterval(interval);
  }, []);

  const isOfferUser =
    user?.id !== undefined && 
    conversation !== null && 
    conversation.post_id !== undefined &&
    user.id === conversation.offer_user_id;

  const handleSelectImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        await sendImageMessage(imageUri);
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const sendImageMessage = async (imageUri: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formData = new FormData();
      formData.append('content', '[Imagen compartida]');
      
      // For React Native, we need to use the proper FormData append syntax
      const imageFile = {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'chat-image.jpg',
      } as any;
      formData.append('image', imageFile);

      const response = await fetch(
        `http://192.168.1.72:8000/api/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (response.ok) {
        const newMessage = await response.json();
        setMessages((prev) => [
          ...prev,
          {
            id: newMessage.id,
            text: '[Imagen]',
            isMe: true,
          },
        ]);
        setMenuVisible(false);
      }
    } catch (error) {
      console.error('Error al enviar imagen:', error);
      Alert.alert('Error', 'No se pudo enviar la imagen');
    }
  };

  return (
    <View className="bg-gray-190 flex-1">
      {/* Encabezado */}
      <View className="p-4">
        <View className="flex-row items-center rounded-3xl bg-green-800 p-4 shadow-lg">
          <TouchableOpacity className="p-2" onPress={() => navigation.goBack()}>
            <Image
              source={require('../../assets/back-icon.png')}
              className="h-6 w-6"
              resizeMode="contain"
            />
          </TouchableOpacity>
          <View className="ml-4 flex-1 flex-row items-center rounded-xl p-2">
            <TouchableOpacity
              className="flex-row items-center flex-1"
              onPress={() => {
                if (chatPartner) {
                  navigation.navigate('PublicProfile', { userId: chatPartner.id });
                }
              }}
              activeOpacity={0.7}>
              <View className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white">
                <Image
                  source={require('../../assets/user-icon.png')}
                  className="h-6 w-6"
                  resizeMode="contain"
                />
              </View>
              <Text className="ml-3 text-lg font-bold text-white">
                {chatPartner ? `${chatPartner.name} ${chatPartner.lastname}` : 'Cargando...'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Mensajes */}
      <ScrollView className="flex-1 p-4 pb-40" contentContainerStyle={{ paddingBottom: 100 }}>
        {messages.map((message) => (
          <View
            key={message.id}
            className={`mb-2 max-w-[70%] rounded-xl p-3 ${message.isMe ? 'self-end rounded-br-none bg-green-500' : 'self-start rounded-bl-none bg-gray-300'}`}>
            <Text className="text-white">{message.text}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Menú emergente */}
      {menuVisible && (
        <Animated.View
          style={{ transform: [{ translateY: menuTranslateY }] }}
          className="w-58 absolute bottom-20 p-6">
          <View className="rounded-full bg-white p-3 shadow-lg mb-3">
            <TouchableOpacity
              onPress={handleSelectImage}
              className="flex-row items-center p-2 ">
              <Image
                source={require('../../assets/form-icon.png')}
                className="h-6 w-6"
                resizeMode="contain"
              />
              <Text
                className="ml-4 text-lg font-extrabold text-black"
                style={{ fontFamily: 'Poppins-Black' }}>
                Enviar imagen
              </Text>
            </TouchableOpacity>
          </View>

          {isOfferUser && (
            <View className="rounded-full bg-white p-3 shadow-lg">
              <TouchableOpacity
                onPress={() => {
                  if (conversation && conversation.post_id) {
                    navigation.navigate('BarterScreen', {
                      conversationId,
                      postId: conversation.post_id,
                    });
                  }
                }}
                className="flex-row items-center p-2 ">
                <Image
                  source={require('../../assets/form-icon.png')}
                  className="h-6 w-6"
                  resizeMode="contain"
                />
                <Text
                  className="ml-4 text-lg font-extrabold text-black"
                  style={{ fontFamily: 'Poppins-Black' }}>
                  Solicitar intercambio
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!isOfferUser && conversation && conversation.post_id && (
            <View className="rounded-full bg-white p-3 shadow-lg">
              <TouchableOpacity
                onPress={() => {
                  // Solo ir atrás al Historial, el usuario puede ver la publicación desde allá
                  navigation.goBack();
                }}
                className="flex-row items-center p-2 ">
                <Image
                  source={require('../../assets/form-icon.png')}
                  className="h-6 w-6"
                  resizeMode="contain"
                />
                <Text
                  className="ml-4 text-lg font-extrabold text-black"
                  style={{ fontFamily: 'Poppins-Black' }}>
                  Ver publicación
                </Text>
              </TouchableOpacity>
            </View>
          )}
          
        </Animated.View>
      )}
      {/* Caja de mensaje */}
      <View className="absolute bottom-5 left-0 right-0 flex-row items-center px-5">
        {/* Botón de + */}
        <TouchableOpacity onPress={toggleMenu} className="rounded-2xl bg-gray-300 p-5 mr-2">
          <Image
            source={require('../../assets/plus-icon.png')}
            className="h-6 w-6"
            resizeMode="contain"
          />
        </TouchableOpacity>
        <TextInput
          className="mx-2 flex-1 rounded-2xl bg-gray-200 p-6"
          value={inputText}
          onChangeText={setInputText}
          placeholder="Escribe un mensaje..."
        />
        <TouchableOpacity onPress={handleSend} className="rounded-2xl bg-green-500 p-5">
          <Image
            source={require('../../assets/send-icon.png')}
            className="h-6 w-6"
            resizeMode="contain"
          />
        </TouchableOpacity>
        {/* Espacio en blanco inferior */}
        <View style={{ height: 110 }} />
      </View>
    </View>
  );
}
