import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
  Dimensions,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import MapView, { Marker } from 'react-native-maps';

const screenWidth = Dimensions.get('window').width;

const Producto = ({ producto, onClose, navigation }) => {
  const [mensaje, setMensaje] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  const [fontsLoaded] = useFonts({
    'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
  });

  if (!fontsLoaded) {
    return <Text>Cargando fuentes...</Text>;
  }

  const remoteImages = producto.image
    ? producto.image.split(',').map((url) => ({ uri: url.trim() }))
    : [];
  const remoteImage = remoteImages.length ? remoteImages : [];

  const localImages = [
    require('../assets/images/mango.jpg'),
    require('../assets/images/mango2.jpg'),
    require('../assets/images/mango3.jpg'),
  ];
  const images = remoteImage.length ? remoteImage : localImages;

  const handleImageChange = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.floor(offsetX / screenWidth);
    setCurrentIndex(index);
  };

  const handleSendPress = async () => {
    if (!mensaje.trim()) return;

    try {
      const userData = await AsyncStorage.getItem('user');
      const token = await AsyncStorage.getItem('userToken');
      const user = JSON.parse(userData);
      const interestedId = user?.id;
      const ownerId = producto.user?.id;
      const postId = producto.id;

      // 1) Crear/conseguir la conversación
      const respConvo = await axios.post(
        'http://192.168.1.72:8000/api/conversations',
        {
          request_user_id: interestedId,
          offer_user_id: ownerId,
          post_id: postId,
          status_id: 1,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );
      const conversationId = respConvo.data.id;

      // 2) Enviar el mensaje inicial
      await axios.post(
        `http://192.168.1.72:8000/api/conversations/${conversationId}/messages`,
        { content: mensaje.trim() },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );

      // 3) Cierra el modal y navega al chat
      onClose();
      navigation.navigate('Chat', { conversationId });
    } catch (error) {
      console.error('Error al crear la conversaciÃ³n o enviar mensaje:', error);
      Alert.alert('Error', 'No se pudo iniciar el chat. Intenta de nuevo.');
    }
  };

  return (
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        {/* Header con botón de cierre y tí­tulo */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="times" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { fontFamily: 'Poppins-Bold' }]}>{producto.title}</Text>
        </View>

        {/* Carrusel de imágenes */}
        <View style={styles.imageContainer}>
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.imageWrapper}>
                <Image source={item} style={styles.productImage} />
              </View>
            )}
            keyExtractor={(_, i) => i.toString()}
            onScroll={handleImageChange}
            snapToInterval={screenWidth}
            decelerationRate="fast"
          />
          <View style={styles.paginationContainer}>
            {images.map((_, i) => (
              <View
                key={i}
                style={[styles.paginationDot, currentIndex === i && styles.activeDot]}
              />
            ))}
          </View>
        </View>

        <ScrollView style={styles.scrollView}>
          {/* Sección de mensaje */}
          <Text style={[styles.sectionTitle, { fontFamily: 'Poppins-Bold' }]}>Hacer contacto</Text>
          <View style={styles.messageContainer}>
            <TextInput
              style={[styles.messageInput, { fontFamily: 'Poppins-Regular' }]}
              placeholder="Enviar mensaje..."
              placeholderTextColor="#777"
              value={mensaje}
              onChangeText={setMensaje}
            />
            <TouchableOpacity
              onPress={handleSendPress}
              style={[styles.sendButton, !mensaje && styles.disabledButton]}
              disabled={!mensaje}>
              <Text style={[styles.buttonText, { fontFamily: 'Poppins-Bold' }]}>Enviar</Text>
            </TouchableOpacity>
          </View>

          {/* Sección de intercambio */}
          <Text style={[styles.sectionTitle, { fontFamily: 'Poppins-Bold' }]}>Cambio por:</Text>
          <Text style={[styles.tradeText, { fontFamily: 'Poppins-Regular' }]}>
            {producto.content}
          </Text>

          {/* Descripción */}
          <Text style={[styles.sectionTitle, { fontFamily: 'Poppins-Bold' }]}>DescripciÃ³n</Text>
          <Text style={[styles.modalText, { fontFamily: 'Poppins-Regular' }]}>
            {producto.content}
          </Text>

          {/* Información del usuario */}
          <Text style={[styles.sectionTitle, { fontFamily: 'Poppins-Bold' }]}>
            Información del usuario
          </Text>
          <View style={styles.userInfo}>
            <Image
              source={
                producto.user.image
                  ? { uri: producto.user.image }
                  : require('../assets/images/perfil.jpg')
              }
              style={styles.userImage}
            />
            <View>
              <Text style={[styles.userName, { fontFamily: 'Poppins-Bold' }]}>
                {producto.user.name} {producto.user.lastname}
              </Text>
              <Text style={[styles.userContact, { fontFamily: 'Poppins-Regular' }]}>
                {producto.user.email} Â· {producto.user.phone}
              </Text>
            </View>
          </View>

          {/* Ubicación */}
          <Text style={[styles.sectionTitle, { fontFamily: 'Poppins-Bold' }]}>UbicaciÃ³n</Text>
          <Text style={[styles.locationDetail, { fontFamily: 'Poppins-Regular' }]}>
            Lat: {producto.latitude}, Lon: {producto.longitude}
          </Text>
          {Number.isFinite(Number(producto.latitude)) && Number.isFinite(Number(producto.longitude)) ? (
            <MapView
              style={styles.mapImage}
              initialRegion={{
                latitude: Number(producto.latitude),
                longitude: Number(producto.longitude),
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}>
              <Marker
                coordinate={{
                  latitude: Number(producto.latitude),
                  longitude: Number(producto.longitude),
                }}
              />
            </MapView>
          ) : (
            <Image source={require('../assets/images/mapa.png')} style={styles.mapImage} />
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    height: '85%',
    padding: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#66aa4f',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  closeButton: { marginRight: 10 },
  modalTitle: { flex: 1, fontSize: 20, color: '#fff', textAlign: 'center' },
  imageContainer: { height: 220, marginVertical: 10 },
  imageWrapper: { width: screenWidth, alignItems: 'center' },
  productImage: { width: screenWidth * 0.85, height: 200, borderRadius: 12 },
  paginationContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 5 },
  paginationDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ddd', margin: 3 },
  activeDot: { backgroundColor: '#FF6347' },
  scrollView: { flex: 1 },
  sectionTitle: { fontSize: 18, marginTop: 10, marginBottom: 5, color: '#333' },
  messageContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  messageInput: {
    flex: 1,
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    backgroundColor: '#f9f9f9',
  },
  sendButton: {
    backgroundColor: '#FF6347',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  disabledButton: { backgroundColor: '#ddd' },
  buttonText: { color: '#fff' },
  tradeText: { fontSize: 16, color: '#555', marginBottom: 10 },
  modalText: { fontSize: 16, color: '#333', lineHeight: 22, marginBottom: 15 },
  userInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  userImage: { width: 50, height: 50, borderRadius: 25, marginRight: 10 },
  userName: { fontSize: 16, color: '#333' },
  userContact: { fontSize: 14, color: '#777' },
  locationDetail: { fontSize: 14, color: '#555', marginBottom: 10 },
  mapImage: { width: '100%', height: 300, borderRadius: 12, marginBottom: 10 },
});

export default Producto;