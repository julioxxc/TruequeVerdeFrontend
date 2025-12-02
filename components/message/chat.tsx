import { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Animated, Alert } from 'react-native';
import { Image } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from 'context/UserContext';
import api from 'services/api';

type ActiveBarterBanner = {
  id: number | string;
  offer: string;
  request: string;
  description?: string | null;
  greenpointId?: number | null;
};

type RootStackParamList = {
  Chat: { conversationId: number; activeBarter?: ActiveBarterBanner };
  BarterScreen: { conversationId: number; postId: number };
  PublicProfile: { userId: number }; // prueba de navegación al perfil público
  Home: { screen: 'CatalogoMain'; params?: { openPostId?: number } };
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
  const [activeBarter, setActiveBarter] = useState<ActiveBarterBanner | null>(null);
  const barterStorageKey = `activeBarter:${conversationId}`;

  const handleUnauthorized = async () => {
    await AsyncStorage.removeItem('userToken');
    navigation.replace('Login');
  };

  const fetchConversation = async (conversationId: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        await handleUnauthorized();
        return;
      }

      const { data } = await api.get(`/conversations/${conversationId}`);
      setChatPartner(data.other_user);
      setConversation(data);
      return data;
    } catch (error: any) {
      if (error?.response?.status === 401) {
        await handleUnauthorized();
        return;
      }
      console.error('Error al obtener conversacion:', error);
    }
  };

  const fetchMessages = async (conversationId: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        await handleUnauthorized();
        setMessages([]);
        return;
      }

      const { data } = await api.get(`/conversations/${conversationId}/messages`);

      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.messages)
        ? data.messages
        : [];

      const formatted = items.map((msg: any) => ({
        id: msg.id,
        text: msg.content,
        isMe: msg.user_id === user?.id,
      }));
      setMessages(formatted);
    } catch (error: any) {
      if (error?.response?.status === 401) {
        await handleUnauthorized();
        return;
      }
      console.error('Error al obtener mensajes:', error);
      setMessages([]);
    }
  };

  const loadActiveBarter = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(barterStorageKey);
      if (stored) {
        setActiveBarter(JSON.parse(stored));
      } else {
        setActiveBarter(null);
      }
    } catch (storageError) {
      console.log('No se pudo cargar el trueque activo:', storageError);
    }
  }, [barterStorageKey]);

  useEffect(() => {
    const fromParams = route.params?.activeBarter;
    if (fromParams) {
      setActiveBarter(fromParams);
      AsyncStorage.setItem(barterStorageKey, JSON.stringify(fromParams)).catch((storageError) =>
        console.log('No se pudo guardar el trueque recibido:', storageError)
      );
    }
  }, [route.params?.activeBarter, barterStorageKey]);

  const clearActiveBarter = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(barterStorageKey);
    } catch (storageError) {
      console.log('No se pudo limpiar el trueque activo:', storageError);
    }
    setActiveBarter(null);
  }, [barterStorageKey]);

  const handleShowBarterDetails = () => {
    if (!activeBarter) return;
    const summary = [
      activeBarter.offer ? `Ofreces: ${activeBarter.offer}` : '',
      activeBarter.request ? `Solicitas: ${activeBarter.request}` : '',
      activeBarter.description ? `Notas: ${activeBarter.description}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    Alert.alert('Trueque en curso', summary || 'Revisa los detalles del intercambio.');
  };

  const handleFinishBarter = () => {
    if (!activeBarter) return;
    Alert.alert('Finalizar trueque', 'Confirma que quieres marcar el trueque como finalizado.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Finalizar', style: 'destructive', onPress: () => clearActiveBarter() },
    ]);
  };

  const sendMessageToApi = async (text: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        await handleUnauthorized();
        return;
      }

      const { data: newMessage } = await api.post(
        `/conversations/${conversationId}/messages`,
        { content: text }
      );
      setMessages((prev) => [
        ...prev,
        {
          id: newMessage.id,
          text: newMessage.content,
          isMe: true,
        },
      ]);
      fetchMessages(conversationId);
    } catch (error: any) {
      if (error?.response?.status === 401) {
        await handleUnauthorized();
        return;
      }
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

  useFocusEffect(
    useCallback(() => {
      fetchConversation(conversationId);
      fetchMessages(conversationId);
      loadActiveBarter();
      const interval = setInterval(() => fetchMessages(conversationId), 2000);
      return () => clearInterval(interval);
    }, [conversationId, loadActiveBarter])
  );

  const isOfferUser =
    user?.id !== undefined &&
    conversation !== null &&
    conversation.post_id !== undefined &&
    user.id === conversation.offer_user_id;

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
        {activeBarter && (
          <View className="mb-4 items-center">
            <View className="w-full rounded-3xl border border-gray-300 bg-white shadow-md">
              <View className="items-center justify-center border-b border-gray-200 px-4 py-3">
                <Text className="text-lg font-bold text-gray-800">Trueque en curso</Text>
                {activeBarter.description ? (
                  <Text className="mt-1 text-center text-sm text-gray-600" numberOfLines={2}>
                    {activeBarter.description}
                  </Text>
                ) : null}
              </View>
              <View className="flex-row">
                <TouchableOpacity
                  className="flex-1 items-center border-r border-gray-200 py-3"
                  onPress={handleShowBarterDetails}>
                  <Text className="font-semibold text-gray-800">Detalles</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 items-center py-3"
                  onPress={handleFinishBarter}>
                  <Text className="font-semibold text-emerald-700">Finalizar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        {messages.map((message) => (
          <View
            key={message.id}
            className={`mb-2 max-w-[70%] rounded-xl p-3 ${
              message.isMe
                ? 'self-end rounded-br-none bg-green-500'
                : 'self-start rounded-bl-none bg-gray-500'
            }`}>
            <Text className="text-white">{message.text}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Menú emergente */}
      {menuVisible && (
        <Animated.View
          style={[
            { transform: [{ translateY: menuTranslateY }] },
            { bottom: 100 }, // eleva el menú emergente por encima de la barra de mensaje
          ]}
          className="w-58 absolute p-6">
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
                  navigation.navigate('Home', {
                    screen: 'CatalogoMain',
                    params: { openPostId: conversation.post_id },
                  });
                  setMenuVisible(false);
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
