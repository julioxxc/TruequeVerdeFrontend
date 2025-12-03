import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
  Modal,
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  PublicProfile: { userId: number };
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
  const pendingRatingStorageKey = `pendingRating:${conversationId}`;
  const finishedBarterPrefix = '__TRUEQUE_FINALIZADO__';
  const isPostOwner = conversation?.offer_user_id === user?.id;
  const keyboardVerticalOffset = Platform.OS === 'ios' ? 0 : 0;
  const insets = useSafeAreaInsets();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardOpen(true);
      setKeyboardHeight(e.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardOpen(false);
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [pendingRating, setPendingRating] = useState<ActiveBarterBanner | null>(null);
  const [counterpartRatingModalVisible, setCounterpartRatingModalVisible] = useState(false);
  const [counterpartRating, setCounterpartRating] = useState(0);
  const [isSubmittingCounterpartRating, setIsSubmittingCounterpartRating] = useState(false);

  const handleUnauthorized = async () => {
    await AsyncStorage.removeItem('userToken');
    navigation.replace('Login');
  };

  const ratedBarterKey = useCallback(
    (barterId: number | string) => `ratedBarter:${conversationId}:${barterId}`,
    [conversationId]
  );

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

  const detectFinishedBarterFromMessages = useCallback(
    async (items: any[]) => {
      if (!user) return;

      // Si la conversacion ya esta cargada y somos el dueA�o del post, no mostramos bloque
      const isOwner = conversation ? conversation.offer_user_id === user.id : false;
      if (isOwner) return;

      const finishMsg = [...items]
        .reverse()
        .find(
          (msg: any) =>
            msg?.user_id !== user.id &&
            typeof msg?.content === 'string' &&
            msg.content.startsWith(finishedBarterPrefix)
        );

      if (!finishMsg) return;

      const rawPayload = finishMsg.content.slice(finishedBarterPrefix.length);
      try {
        const parsed = JSON.parse(rawPayload);
        if (!parsed?.id) return;

        const alreadyRated = await AsyncStorage.getItem(ratedBarterKey(parsed.id));
        if (alreadyRated) return;

        const pending: ActiveBarterBanner = {
          id: parsed.id,
          offer: parsed.offer || '',
          request: parsed.request || '',
          description: parsed.description || null,
          greenpointId: parsed.greenpointId ?? null,
        };

        if (pendingRating?.id === pending.id) return;

        setPendingRating(pending);
        await AsyncStorage.setItem(pendingRatingStorageKey, JSON.stringify(pending));
      } catch (parseError) {
        console.log('No se pudo interpretar el trueque finalizado:', parseError);
      }
    },
    [conversation, user, ratedBarterKey, pendingRatingStorageKey, pendingRating]
  );

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

      await detectFinishedBarterFromMessages(items);

      const filteredMessages = items.filter(
        (msg: any) =>
          !(
            typeof msg?.content === 'string' &&
            msg.content.startsWith(finishedBarterPrefix)
          )
      );

      const formatted = filteredMessages.map((msg: any) => ({
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
    if (!isPostOwner) {
      setActiveBarter(null);
      return;
    }
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
  }, [barterStorageKey, isPostOwner]);

  const loadPendingCounterpartRating = useCallback(async () => {
    if (isPostOwner) {
      setPendingRating(null);
      try {
        await AsyncStorage.removeItem(pendingRatingStorageKey);
      } catch (storageError) {
        console.log('No se pudo limpiar la calificacion pendiente:', storageError);
      }
      return;
    }
    try {
      const stored = await AsyncStorage.getItem(pendingRatingStorageKey);
      if (stored) {
        setPendingRating(JSON.parse(stored));
      }
    } catch (storageError) {
      console.log('No se pudo cargar la calificacion pendiente:', storageError);
    }
  }, [isPostOwner, pendingRatingStorageKey]);

  const clearPendingRatingData = useCallback(async () => {
    setPendingRating(null);
    setCounterpartRating(0);
    try {
      await AsyncStorage.removeItem(pendingRatingStorageKey);
    } catch (storageError) {
      console.log('No se pudo limpiar la calificacion pendiente:', storageError);
    }
  }, [pendingRatingStorageKey]);

  useEffect(() => {
    const fromParams = route.params?.activeBarter;
    if (fromParams && isPostOwner) {
      setActiveBarter(fromParams);
      AsyncStorage.setItem(barterStorageKey, JSON.stringify(fromParams)).catch((storageError) =>
        console.log('No se pudo guardar el trueque recibido:', storageError)
      );
    } else if (!isPostOwner) {
      setActiveBarter(null);
    }
  }, [route.params?.activeBarter, barterStorageKey, isPostOwner]);

  useEffect(() => {
    loadPendingCounterpartRating();
  }, [loadPendingCounterpartRating]);

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

  const handleShowPendingRatingDetails = () => {
    if (!pendingRating) return;
    const summary = [
      pendingRating.offer ? `Ofrecido: ${pendingRating.offer}` : '',
      pendingRating.request ? `Solicitado: ${pendingRating.request}` : '',
      pendingRating.description ? `Notas: ${pendingRating.description}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    Alert.alert('Trueque finalizado', summary || 'Revisa los detalles del intercambio.');
  };

  const handleFinishBarter = () => {
    if (!activeBarter || !isPostOwner) return;
    const barterId = activeBarter.id;
    if (!barterId) {
      clearActiveBarter();
      return;
    }

    setSelectedRating(0);
    setRatingModalVisible(true);
  };

  const handleSelectRating = (value: number) => {
    setSelectedRating((prev) => (prev === value ? 0 : value));
  };

  const notifyCounterpartBarterFinished = useCallback(
    async (barter: ActiveBarterBanner) => {
      if (!barter?.id) return;
      try {
        const content = `${finishedBarterPrefix}${JSON.stringify(barter)}`;
        await api.post(`/conversations/${conversationId}/messages`, { content });
      } catch (notifyError) {
        console.log('No se pudo notificar a la contraparte del cierre:', notifyError);
      }
    },
    [conversationId]
  );

  const submitRatingAndFinish = async () => {
    if (!activeBarter?.id) {
      setRatingModalVisible(false);
      await clearActiveBarter();
      return;
    }

    setIsSubmittingRating(true);
    try {
      await api.put(`/barters/${activeBarter.id}`, { status_id: 2, rating: selectedRating });
      await notifyCounterpartBarterFinished(activeBarter);
      await clearActiveBarter();
      Alert.alert('Listo', 'El trueque se marcó como finalizado.');
    } catch (finishError) {
      console.log('No se pudo finalizar el trueque:', finishError);
      Alert.alert('Error', 'No se pudo finalizar el trueque. Intenta nuevamente.');
    } finally {
      setIsSubmittingRating(false);
      setRatingModalVisible(false);
    }
  };

  const submitCounterpartRating = async () => {
    if (!pendingRating?.id || !conversation?.offer_user_id) {
      setCounterpartRatingModalVisible(false);
      return;
    }
    if (counterpartRating <= 0) {
      Alert.alert('Calificacion', 'Selecciona una calificacion para continuar.');
      return;
    }

    setIsSubmittingCounterpartRating(true);
    const targetUserId = conversation.offer_user_id;
    const ratedKey = ratedBarterKey(pendingRating.id);

    try {
      await api.put(`/barters/${pendingRating.id}`, {
        status_id: 2,
        rating: counterpartRating,
        evaluado_id: targetUserId,
      });
      await AsyncStorage.setItem(ratedKey, 'done');
      await clearPendingRatingData();
      Alert.alert('Gracias', 'Tu calificacion se envio.');
    } catch (error: any) {
      if (error?.response?.status === 401) {
        await handleUnauthorized();
        return;
      }
      console.log('No se pudo enviar la calificacion via trueque:', error);
      try {
        await api.post('/reputacion/encuesta', {
          barter_id: pendingRating.id,
          evaluado_id: targetUserId,
          ratings: [counterpartRating],
          comentario: null,
        });
        await AsyncStorage.setItem(ratedKey, 'done');
        await clearPendingRatingData();
        Alert.alert('Gracias', 'Tu calificacion se envio.');
      } catch (surveyError) {
        console.log('No se pudo enviar la calificacion via encuesta:', surveyError);
        Alert.alert('Error', 'No se pudo guardar tu calificacion. Intenta nuevamente.');
      }
    } finally {
      setIsSubmittingCounterpartRating(false);
      setCounterpartRatingModalVisible(false);
    }
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
       loadPendingCounterpartRating();
      const interval = setInterval(() => fetchMessages(conversationId), 2000);
      return () => clearInterval(interval);
    }, [conversationId, loadActiveBarter, loadPendingCounterpartRating])
  );

  const isOfferUser =
    user?.id !== undefined &&
    conversation !== null &&
    conversation.post_id !== undefined &&
    user.id === conversation.offer_user_id;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}>
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
      <View className="flex-1">
        <ScrollView
          className="flex-1 p-4"
          contentContainerStyle={{
            paddingBottom: keyboardOpen ? keyboardHeight + 60 : 80,
          }}
          keyboardShouldPersistTaps="handled">
          {isPostOwner && activeBarter && (
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
          {!isPostOwner && pendingRating && (
            <View className="mb-4 items-center">
              <View className="w-full rounded-3xl border border-gray-300 bg-white shadow-md">
                <View className="items-center justify-center border-b border-gray-200 px-4 py-3">
                  <Text className="text-lg font-bold text-gray-800">Calificacion pendiente</Text>
                  {pendingRating.description ? (
                    <Text className="mt-1 text-center text-sm text-gray-600" numberOfLines={2}>
                      {pendingRating.description}
                    </Text>
                  ) : null}
                </View>
                <View className="flex-row">
                  <TouchableOpacity
                    className="flex-1 items-center border-r border-gray-200 py-3"
                    onPress={handleShowPendingRatingDetails}>
                    <Text className="font-semibold text-gray-800">Detalles</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 items-center py-3"
                    onPress={() => {
                      setCounterpartRating(0);
                      setCounterpartRatingModalVisible(true);
                    }}>
                    <Text className="font-semibold text-emerald-700">Calificar</Text>
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
      </View>

      {/* Menú emergente */}
      {menuVisible && (
        <Animated.View
          style={[
            { transform: [{ translateY: menuTranslateY }] },
            { bottom: 100 },
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
      <View
        className="bg-transparent px-5 pb-6 pt-3 flex-row items-center"
        style={{
          marginBottom: Math.max(insets.bottom, 12) + (keyboardOpen ? keyboardHeight : 0),
        }}>
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
          multiline
        />
        <TouchableOpacity onPress={handleSend} className="rounded-2xl bg-green-500 p-5">
          <Image
            source={require('../../assets/send-icon.png')}
            className="h-6 w-6"
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      <Modal
        visible={counterpartRatingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCounterpartRatingModalVisible(false)}>
        <View
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <View className="w-full rounded-3xl bg-white p-6">
            <Text className="text-center text-xl font-bold text-gray-900">Califica tu experiencia</Text>
            <Text className="mt-2 text-center text-gray-700">
              El dueño del post ya cerró el trueque. Deja tu calificacion sobre el intercambio.
            </Text>
            <View className="mt-4 flex-row items-center justify-center">
              {[1, 2, 3, 4, 5].map((value) => (
                <TouchableOpacity
                  key={`counter-${value}`}
                  className="mx-1 p-2"
                  onPress={() =>
                    setCounterpartRating((prev) => (prev === value ? 0 : value))
                  }
                  activeOpacity={0.7}>
                  <Text
                    className={`text-3xl font-bold ${
                      value <= counterpartRating ? 'text-emerald-700' : 'text-gray-400'
                    }`}>
                    {value <= counterpartRating ? '★' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text className="mt-2 text-center text-sm text-gray-600">
              {`Calificacion seleccionada: ${counterpartRating} estrella${
                counterpartRating === 1 ? '' : 's'
              }`}
            </Text>
            <View className="mt-6 flex-row">
              <TouchableOpacity
                onPress={() => setCounterpartRatingModalVisible(false)}
                className="mr-3 flex-1 rounded-2xl border border-gray-300 py-3"
                activeOpacity={0.8}>
                <Text className="text-center font-semibold text-gray-800">Seguir conversando</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitCounterpartRating}
                className={`flex-1 rounded-2xl bg-emerald-700 py-3 ${
                  isSubmittingCounterpartRating ? 'opacity-60' : ''
                }`}
                disabled={isSubmittingCounterpartRating}
                activeOpacity={0.8}>
                <Text className="text-center font-semibold text-white">
                  {isSubmittingCounterpartRating ? 'Enviando...' : 'Enviar calificacion'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={ratingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRatingModalVisible(false)}>
        <View
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <View className="w-full rounded-3xl bg-white p-6">
            <Text className="text-center text-xl font-bold text-gray-900">Califica el trueque</Text>
            <Text className="mt-2 text-center text-gray-700">
              Elige de 0 a 5 estrellas y confirma la finalización del intercambio.
            </Text>
            <View className="mt-4 flex-row items-center justify-center">
              {[1, 2, 3, 4, 5].map((value) => (
                <TouchableOpacity
                  key={value}
                  className="mx-1 p-2"
                  onPress={() => handleSelectRating(value)}
                  activeOpacity={0.7}>
                  <Text
                    className={`text-3xl font-bold ${
                      value <= selectedRating ? 'text-emerald-700' : 'text-gray-400'
                    }`}>
                    {value <= selectedRating ? '★' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text className="mt-2 text-center text-sm text-gray-600">
              {`Calificación seleccionada: ${selectedRating} estrella${
                selectedRating === 1 ? '' : 's'
              }`}
            </Text>
            <View className="mt-6 flex-row">
              <TouchableOpacity
                onPress={() => setRatingModalVisible(false)}
                className="mr-3 flex-1 rounded-2xl border border-gray-300 py-3"
                activeOpacity={0.8}>
                <Text className="text-center font-semibold text-gray-800">Seguir conversando</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitRatingAndFinish}
                className={`flex-1 rounded-2xl bg-emerald-700 py-3 ${
                  isSubmittingRating ? 'opacity-60' : ''
                }`}
                disabled={isSubmittingRating}
                activeOpacity={0.8}>
                <Text className="text-center font-semibold text-white">
                  {isSubmittingRating ? 'Guardando...' : 'Calificar y finalizar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
    </KeyboardAvoidingView>
  );
}
