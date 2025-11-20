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

const App = ({ route }) => {
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

  const categoryOptions = ['Todos', 'Frutas', 'Verduras', 'Cereales y Tuberculos', 'Brotes', 'Plantas'];
  const labelToKey = {
    Todos: null,
    Frutas: 'fruta',
    Verduras: 'verdura',
    "Cereales y Tuberculos": 'cereales y tuberculos',
    Brotes: 'brote',
    Plantas: 'planta',
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://192.168.1.72:8000/api/posts');
      // Asegurarnos de que `products` sea siempre un array.
      // La API puede devolver un objeto con datos en una propiedad (p. ej. { data: [...] })
      // o directamente un array. Normalizamos ambos casos.
      const items = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
        ? response.data.data
        : [];
      setProducts(items);
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

  // Si la navegación pasa un openPostId, abrir el modal del producto correspondiente
  useEffect(() => {
    const openId = route?.params?.openPostId;
    if (openId && products && products.length) {
      const found = products.find((p) => p.id === openId || p.id == openId);
      if (found) {
        openProductModal(found);
        // Limpiar el parámetro para no reabrir constantemente
        try {
          navigation.setParams({ openPostId: null });
        } catch (e) {
          // ignore
        }
      }
    }
  }, [route?.params, products]);

  const toggleFilter = () => setFilterVisible(!filterVisible);

  const handleCategorySelect = (categoryLabel) => {
    const normalized = categoryLabel in labelToKey ? labelToKey[categoryLabel] : null;
    setSelectedCategory(normalized);

    // Log current filter selection with its id (if the backend provided one)
    const currentProducts = Array.isArray(products) ? products : [];
    if (normalized) {
      const match = currentProducts.find((item) => normalizeCategory(item) === normalized);
      const categoryId =
        match?.category?.id ?? match?.item?.category_id ?? match?.category_id ?? 'sin id';
      console.log(`Filtro categoría: ${categoryLabel} (id: ${categoryId})`);
    } else {
      console.log('Filtro categoría: Todos (sin categoría seleccionada)');
    }

    setFilterVisible(false);
  };

  const openProductModal = (product) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };

  // Proteger `products` por si no es un array (evita "products.filter is not a function").
  const safeProducts = Array.isArray(products) ? products : [];

  // Normaliza la categor?a con los campos que pueda traer el backend.
  const normalizeCategory = (item) => {
    const name =
      item.category?.name ||
      item.category_name ||
      item.category ||
      item.item?.category?.name ||
      item.item?.category_name;

    if (name) return name.toLowerCase();

    const categoryId = item.category_id || item.item?.category_id;
    const map = { 1: 'fruta', 2: 'verdura', 3: 'cereales y tuberculos', 4: 'brote', 5: 'planta' };
    return map[categoryId] || '';
  };

  const filteredProducts = safeProducts.filter((item) => {
    const title = (item.title || '').toLowerCase();
    const titleMatch = title.includes(search.toLowerCase());
    const categoryMatch = !selectedCategory || normalizeCategory(item) === selectedCategory;
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
                Cambio por:{' '}
                <Text style={styles.tradeProduct}>
                  {item.cambiar_por || item.cambiarPor || 'No especificado'}
                </Text>
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
  // Extra bottom space so cards can scroll above the bottom nav without being hidden
  listContainer: { paddingBottom: 60, justifyContent: 'center' },
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
