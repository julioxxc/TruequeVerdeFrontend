import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useFonts } from 'expo-font';
import Producto from './producto';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

const App = () => {
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  const [fontsLoaded] = useFonts({
    'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
  });

  const categoryOptions = ['Todos', 'Frutas', 'Verduras', 'Semillas', 'Brotes', 'Plantas'];

  const fetchProducts = async () => {
    try {
      const response = await axios.get('https://truequeverde.aristoiz.com/api/posts');
      setProducts(response.data);
    } catch (error) {
      console.error('Error al obtener productos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();

    const interval = setInterval(() => {
      fetchProducts();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const toggleFilter = () => setFilterVisible(!filterVisible);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category === 'Todos' ? null : category.toLowerCase());
    setFilterVisible(false);
  };

  const openProductModal = (product) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };

  const filteredProducts = products.filter((item) => {
    const titleMatch = item.title.toLowerCase().includes(search.toLowerCase());
    const categoryMatch =
      !selectedCategory || item.category?.name?.toLowerCase() === selectedCategory;
    return titleMatch && categoryMatch;
  });

  if (!fontsLoaded) {
    return <Text>Cargando fuentes...</Text>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar..."
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.filterButton} onPress={toggleFilter}>
          <Text style={styles.buttonText}>Filtrar</Text>
        </TouchableOpacity>
      </View>

      {filterVisible && (
        <View style={styles.filterDropdown}>
          {categoryOptions.map((category, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleCategorySelect(category)}
              style={styles.dropdownItem}>
              <Text style={styles.dropdownText}>{category}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#66aa4f" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => openProductModal(item)}>
              <Image source={{ uri: item.image }} style={styles.image} />
              <Text style={styles.productName}>{item.title}</Text>
              <Text style={styles.tradeText}>
                Cambio por: <Text style={styles.tradeProduct}>{item.content}</Text>
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Producto
            producto={selectedProduct}
            onClose={() => setModalVisible(false)}
            navigation={navigation}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 10 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 15 },
  searchInput: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 15,
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    marginRight: 10,
    elevation: 2,
  },
  filterButton: { backgroundColor: '#66aa4f', padding: 12, borderRadius: 15, marginLeft: 10 },
  listContainer: { paddingBottom: 20, justifyContent: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    margin: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    flex: 1,
    maxWidth: '48%',
  },
  image: {
    width: 160,
    height: 140,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  productName: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 5,
  },
  tradeText: {
    fontSize: 14,
    color: '#555',
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginBottom: 10,
  },
  tradeProduct: { color: 'green', fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  filterDropdown: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 10,
    elevation: 5,
  },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 15 },
  dropdownText: { fontFamily: 'Poppins-Regular', fontSize: 16, color: '#333' },
  buttonText: { fontFamily: 'Poppins-Bold', color: '#fff' },
});

export default App;
