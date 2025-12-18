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
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from 'context/UserContext';
import api from 'services/api';
import { Icon } from 'react-native-paper';

type ActiveBarterBanner = {
  id: number | string;
  offer: string;
  request: string;
  description?: string | null;
  greenpointId?: number | null;
  amount?: number | null;
  unit?: string | null;
  unitId?: number | null;
};

type RootStackParamList = {
  HistoryChat: undefined;
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
  const [units, setUnits] = useState<{ id: number; name: string }[]>([]);
  const [isCancellingBarter, setIsCancellingBarter] = useState(false);
  const [editBarterModalVisible, setEditBarterModalVisible] = useState(false);
  const [editProduct, setEditProduct] = useState<string>('');
  const [editCambio, setEditCambio] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editUnitId, setEditUnitId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [selectedProductIdEdit, setSelectedProductIdEdit] = useState<number | null>(null);
  const [selectedCambioIdEdit, setSelectedCambioIdEdit] = useState<number | null>(null);
  const [items, setItems] = useState<{ id: number; name: string; category?: string }[]>([]);

  const handleUnauthorized = async () => {
    await AsyncStorage.removeItem('userToken');
    navigation.replace('Login');
  };

  const ratedBarterKey = useCallback(
    (barterId: number | string) => `ratedBarter:${conversationId}:${barterId}`,
    [conversationId]
  );

  const getUnitNameById = useCallback((unitId: number | null) => {
    if (!unitId) return null;
    const unit = units.find((u) => u.id === unitId);
    return unit?.name ?? null;
  }, [units]);

  const fetchUnits = async () => {
    try {
      const { data } = await api.get('/units');
      const unitsList = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      setUnits(unitsList);
    } catch (error) {
      console.log('Error al obtener unidades:', error);
    }
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
            amount: parsed.amount ?? null,
            unitId: parsed.unitId ?? null,
            unit: parsed.unit ?? parsed.unitLabel ?? null,
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

  const [blockNewBarter, setBlockNewBarter] = useState<{
  type: 'barter' | 'rating';
  conversationId: number | string;
} | null>(null);

const [blockModalVisible, setBlockModalVisible] = useState(false);


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

  const unitLabels = {
    1: 'Piezas',
    2: 'Kilos',
    3: 'Gramos',
  };

  const loadActiveBarter = useCallback(async () => {
    if (!isPostOwner) {
      setActiveBarter(null);
      return;
    }
    try {
      const stored = await AsyncStorage.getItem(barterStorageKey);
      if (stored) {
        let parsed = JSON.parse(stored) as ActiveBarterBanner;

        const missingAmountOrUnit =
          (parsed.amount === null || parsed.amount === undefined || !parsed.unit) && parsed.id;

        if (missingAmountOrUnit) {
          try {
            const { data } = await api.get(`/barters/${parsed.id}`);
            const serverBarter = data?.data ?? data ?? {};

            parsed = {
              ...parsed,
              amount: parsed.amount ?? serverBarter.amount ?? null,
              unitId: parsed.unitId ?? serverBarter.unit_id ?? serverBarter.unitId ?? null,
              unit:
                parsed.unit ??
                serverBarter.unit?.name ??
                serverBarter.unit?.label ??
                serverBarter.unit_label ??
                serverBarter.unit_name ??
                null,
            };

            // If we still don't have a unit label but we have a unitId, try to get it from local units
            if ((!parsed.unit || parsed.unit === null) && parsed.unitId && units.length > 0) {
              const unitName = getUnitNameById(parsed.unitId);
              if (unitName) {
                parsed.unit = unitName;
              }
            }

            try {
              await AsyncStorage.setItem(barterStorageKey, JSON.stringify(parsed));
            } catch (sErr) {
              console.log('No se pudo actualizar el trueque en storage:', sErr);
            }
          } catch (apiErr) {
            console.log('No se pudo obtener detalles del trueque desde la API:', apiErr);
          }
        }

        setActiveBarter(parsed);
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

  const handleCancelBarter = useCallback(async () => {
    if (!activeBarter?.id) {
      await clearActiveBarter();
      return;
    }

    setIsCancellingBarter(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        await handleUnauthorized();
        return;
      }

      // Marcar el trueque como cancelado en el backend (status_id = 3)
      await api.put(`/barters/${activeBarter.id}`, { status_id: 3 });

      // Limpiar storage/local state y ocultar bloque
      await clearActiveBarter();
      Alert.alert('Listo', 'El trueque ha sido cancelado.');
    } catch (error: any) {
      if (error?.response?.status === 401) {
        await handleUnauthorized();
        return;
      }
      console.log('No se pudo cancelar el trueque:', error);
      Alert.alert('Error', 'No se pudo cancelar el trueque. Intenta nuevamente.');
    } finally {
      setIsCancellingBarter(false);
      setMenuVisible(false);
    }
  }, [activeBarter, clearActiveBarter, handleUnauthorized]);

  const handleOpenEditBarterModal = useCallback(async () => {
    if (!activeBarter) return;
    
    setMenuVisible(false);
    
    // Si los items no están cargados, cargarlos
    if (items.length === 0) {
      try {
        const { data } = await api.get('/map/all');
        const elements = (data.elements || []).map((element: any) => ({
          id: element.element_id,
          name: element.element_name,
          category: element.category_name,
        }));
        setItems(elements);
      } catch (error) {
        console.log('Error al obtener items:', error);
      }
    }
    
    setSelectedProductIdEdit(null);
    setSelectedCambioIdEdit(null);
    setEditProduct(activeBarter.offer || '');
    setEditCambio(activeBarter.request || '');
    setEditDescription(activeBarter.description || '');
    setEditUnitId(activeBarter.unitId ? Number(activeBarter.unitId) : null);
    setEditAmount(activeBarter.amount ? String(activeBarter.amount) : '');
    setEditBarterModalVisible(true);
  }, [activeBarter, items.length]);

  const submitBarterEdit = async () => {
    if (!activeBarter?.id) {
      setEditBarterModalVisible(false);
      return;
    }

    if (!selectedProductIdEdit || !selectedCambioIdEdit) {
      Alert.alert('Datos incompletos', 'Selecciona el producto ofrecido y el solicitado.');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        await handleUnauthorized();
        return;
      }

      const parsedUnitId = editUnitId ? Number(editUnitId) : null;
      const parsedAmount = editAmount ? Number(editAmount) : null;

      // Actualizar en el backend
      await api.put(`/barters/${activeBarter.id}`, {
        offer_item_id: selectedProductIdEdit,
        request_item_id: selectedCambioIdEdit,
        description: editDescription,
        unit_id: parsedUnitId,
        amount: parsedAmount,
      });

      // Actualizar el estado local
      const updatedBarter: ActiveBarterBanner = {
        id: activeBarter.id,
        offer: editProduct,
        request: editCambio,
        description: editDescription || null,
        greenpointId: activeBarter.greenpointId,
        amount: parsedAmount,
        unitId: parsedUnitId,
        unit: unitOptions.find((u) => u.id === parsedUnitId)?.label ?? null,
      };

      setActiveBarter(updatedBarter);
      await AsyncStorage.setItem(barterStorageKey, JSON.stringify(updatedBarter));

      Alert.alert('Listo', 'El intercambio ha sido modificado.');
      setEditBarterModalVisible(false);
    } catch (error: any) {
      if (error?.response?.status === 401) {
        await handleUnauthorized();
        return;
      }
      console.log('No se pudo modificar el trueque:', error);
      Alert.alert('Error', 'No se pudo modificar el trueque. Intenta nuevamente.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const unitOptions = [
    { id: 1, label: 'Piezas' },
    { id: 2, label: 'Kilos' },
    { id: 3, label: 'Gramos' },
  ];

  const handleShowBarterDetails = () => {
    if (!activeBarter) return;
    const offerLine = activeBarter.offer
      ? `Ofreces: ${activeBarter.offer}${activeBarter.amount ? ` — ${activeBarter.amount} ${unitLabels[activeBarter.unitId] ?? ''}` : ''}`
      : '';

    const summary = [
      offerLine,
      activeBarter.request ? `Solicitas: ${activeBarter.request}` : '',
      activeBarter.description ? `Notas: ${activeBarter.description}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    Alert.alert('Trueque en curso', summary || 'Revisa los detalles del intercambio.');
  };

  const handleShowPendingRatingDetails = () => {
    if (!pendingRating) return;
    const offerLine = pendingRating.offer
      ? `Ofrecido: ${pendingRating.offer}${pendingRating.amount ? ` — ${pendingRating.amount} ${pendingRating.unit ?? ''}` : ''}`
      : '';

    const summary = [
      offerLine,
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
      fetchUnits();
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

  const handleBack = useCallback(() => {
    const state: any = navigation.getState?.();
    const hasHistoryChat =
      state && Array.isArray(state?.routeNames) && state.routeNames.includes('HistoryChat');

    if (hasHistoryChat) {
      navigation.navigate('HistoryChat');
      return;
    }

    const parentNav = navigation.getParent?.();
    if (parentNav?.navigate) {
      parentNav.navigate('Historial', { screen: 'HistoryChat' });
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  // Nueva función: consulta al backend si hay trueque activo o calificación pendiente
  const checkGlobalPendingActions = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        await handleUnauthorized();
        return false;
      }
      // Llama al endpoint del backend
      const { data } = await api.get('/barter/status');
      if (data.has_active_barter && data.active_barter_id) {
        setBlockNewBarter({ type: 'barter', conversationId: data.active_barter_id });
        return true;
      }
      if (data.has_pending_rating && data.pending_rating_id) {
        setBlockNewBarter({ type: 'rating', conversationId: data.pending_rating_id });
        return true;
      }
      setBlockNewBarter(null);
      return false;
    } catch (e) {
      console.log('Error revisando acciones pendientes (backend)', e);
      return false;
    }
  }, [conversationId, handleUnauthorized]);


  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}>
      <View className="bg-gray-190 flex-1">
      {/* Encabezado */}
      <View className="p-4">
        <View className="flex-row items-center rounded-3xl bg-green-800 p-4 shadow-lg">
          <TouchableOpacity className="p-2" onPress={handleBack}>
            <Image
              source={require('../../assets/back-icon.png')}
              className="h-6 w-6"
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Modal
  visible={blockModalVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setBlockModalVisible(false)}
>
  <View
    className="flex-1 items-center justify-center px-6"
    style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
  >
    <View className="w-full rounded-3xl bg-white p-6">
      <Text className="text-xl font-bold text-center text-gray-900">
        Acción pendiente
      </Text>

      <Text className="mt-3 text-center text-gray-700">
        {blockNewBarter?.type === 'barter'
          ? 'Tienes un intercambio activo en otra conversación.'
          : 'Tienes una calificación pendiente en otra conversación.'}
      </Text>

      <Text className="mt-2 text-center text-gray-600">
        Finaliza esa acción antes de crear un nuevo intercambio.
      </Text>

      <View className="mt-6 flex-row">
        <TouchableOpacity
          className="flex-1 rounded-2xl bg-gray-300 py-3 mr-2"
          onPress={() => setBlockModalVisible(false)}
        >
          <Text className="text-center font-semibold text-gray-800">
            Entendido
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 rounded-2xl bg-emerald-700 py-3"
          onPress={() => {
            setBlockModalVisible(false);
            navigation.navigate('HistoryChat');
          }}
        >
          <Text className="text-center font-semibold text-white">
            Ir a conversaciones
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

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
            {
              bottom: 130,
              zIndex: 50,
              elevation: 50,
            },
          ]}
          className="w-58 absolute p-6">
          {isOfferUser && (
            activeBarter ? (
              <>
                <View className="rounded-full bg-white p-3 shadow-lg mb-3">
                  <TouchableOpacity
                    onPress={handleOpenEditBarterModal}
                    className="flex-row items-center p-2 ">
                    <Image
                      source={require('../../assets/form-icon.png')}
                      className="h-6 w-6"
                      resizeMode="contain"
                    />
                    <Text
                      className="ml-4 text-lg font-extrabold text-black"
                      style={{ fontFamily: 'Poppins-Black' }}>
                      Modificar Intercambio
                    </Text>
                  </TouchableOpacity>
                </View>
                <View className="rounded-full bg-white p-3 shadow-lg">
                  <TouchableOpacity
                    onPress={handleCancelBarter}
                    className="flex-row items-center p-2 "
                    disabled={isCancellingBarter}
                    activeOpacity={0.8}>
                    <Image
                      source={require('../../assets/form-icon.png')}
                      className="h-6 w-6"
                      resizeMode="contain"
                    />
                    <Text
                      className="ml-4 text-lg font-extrabold text-black"
                      style={{ fontFamily: 'Poppins-Black' }}>
                      {isCancellingBarter ? 'Cancelando...' : 'Cancelar Intercambio'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View className="rounded-full bg-white p-3 shadow-lg">
                <TouchableOpacity
                  onPress={async () => {
                    const blocked = await checkGlobalPendingActions();
                    if (blocked) {
                      setBlockModalVisible(true);
                      return;
                    }
                    if (conversation && conversation.post_id) {
                      navigation.navigate('BarterScreen', {
                        conversationId,
                        postId: conversation.post_id,
                      });
                    }
                  }}
                  className="flex-row items-center p-2 ">
                  <Image
                    source={require('../../assets/plus-icon.png')}
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
            )
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

      <Modal
        visible={editBarterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditBarterModalVisible(false)}>
        <View
          className="flex-1 items-center justify-center "
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
            <View className="w-[100%] max-w-md rounded-3xl bg-white p-6">
              <Text className="text-center text-xl font-bold text-gray-900">Modificar Intercambio</Text>
              
              <Text className="mt-4 mb-1 text-lg font-semibold">Producto a cambiar</Text>
              <View className="mb-4 rounded-full bg-gray-300">
                <Picker
                  selectedValue={selectedProductIdEdit}
                  onValueChange={(val) => {
                    setSelectedProductIdEdit(val as number | null);
                    const item = items.find((i) => i.id === val);
                    setEditProduct(item ? item.name : '');
                  }}
                  style={{ height: 50, width: '100%' }}>
                  <Picker.Item label="Selecciona un producto..." value={null} />
                  {items.map((it) => (
                    <Picker.Item key={it.id} label={it.name} value={it.id} />
                  ))}
                </Picker>
              </View>

              <Text className="mb-1 text-lg font-semibold">Unidad y cantidad</Text>
              <View className="mb-4 flex-row items-center space-x-2">
                <View className="flex-1 flex-row flex-wrap gap-2">
                  {unitOptions.map((unit) => (
                    <TouchableOpacity
                      key={unit.id}
                      className={`rounded-full px-4 py-2 ${editUnitId === unit.id ? 'bg-emerald-700' : 'bg-gray-300'}`}
                      onPress={() => setEditUnitId(unit.id)}>
                      <Text className={`text-sm font-semibold ${editUnitId === unit.id ? 'text-white' : 'text-black'}`}>
                        {unit.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  className="w-24 rounded-full bg-gray-300 p-3 text-lg"
                  placeholder="Cantidad"
                  keyboardType="numeric"
                  value={editAmount}
                  onChangeText={setEditAmount}
                />
              </View>

              <Text className="mb-1 text-lg font-semibold">Descripción</Text>
              <TextInput
                className="mb-4 rounded-full bg-gray-300 p-3 text-lg"
                placeholder="Descripción del Intercambio"
                value={editDescription}
                onChangeText={setEditDescription}
              />

              <Text className="mb-1 text-lg font-semibold">Cambio por</Text>
              <View className="mb-4 rounded-full bg-gray-300">
                <Picker
                  selectedValue={selectedCambioIdEdit}
                  onValueChange={(val) => {
                    setSelectedCambioIdEdit(val as number | null);
                    const item = items.find((i) => i.id === val);
                    setEditCambio(item ? item.name : '');
                  }}
                  style={{ height: 50, width: '100%' }}>
                  <Picker.Item label="Selecciona un producto..." value={null} />
                  {items.map((it) => (
                    <Picker.Item key={`edit-${it.id}`} label={it.name} value={it.id} />
                  ))}
                </Picker>
              </View>

              <View className="mt-6 flex-row">
                <TouchableOpacity
                  onPress={() => setEditBarterModalVisible(false)}
                  className="mr-3 flex-1 rounded-2xl border border-gray-300 py-3"
                  activeOpacity={0.8}>
                  <Text className="text-center font-semibold text-gray-800">Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={submitBarterEdit}
                  className={`flex-1 rounded-2xl bg-emerald-700 py-3 ${
                    isSubmittingEdit ? 'opacity-60' : ''
                  }`}
                  disabled={isSubmittingEdit}
                  activeOpacity={0.8}>
                  <Text className="text-center font-semibold text-white">
                    {isSubmittingEdit ? 'Guardando...' : 'Guardar cambios'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
    </KeyboardAvoidingView>
  );
}
