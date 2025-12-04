import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import screenCatalogo from 'components/screenCatalogo';
import formPublicar from 'components/formPublicar';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import navigationUser from 'navigation/Navigation'
import catalogStack from 'navigation/NavigationChat';
import HistoryStack from './NavigationHistory';
import MapStack from './NavigationMap';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native'; 

const Tab = createBottomTabNavigator();

const PlaceholderScreen = ({ route }) => (
  <View style={styles.placeholderContainer}>
    <Text style={styles.placeholderText}>
      aquí va la screen de {route.name}
    </Text>
  </View>
);

const CustomTabBarButton = ({ onPress }) => (
  <TouchableOpacity style={styles.customButton} onPress={onPress}>
    <View style={styles.buttonContainer}>
      <FontAwesome name="plus" size={24} color="white" />
    </View>
  </TouchableOpacity>
);

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        headerShown: true,
        tabBarIcon: ({ color, size }) => {
          switch (route.name) {
            case 'Home':
              return <MaterialIcons name="storefront" size={size} color={color} />;
            case 'Perfil':
              return <FontAwesome name="user" size={size} color={color} />;
            case 'Historial':
              return <MaterialIcons name="chat" size={size} color={color} />;
            case 'Mapa':
              return <MaterialIcons name="map" size={size} color={color} />;
            default:
              return null;
          }
        },
        tabBarActiveTintColor: '#2c5a48',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen
        name="Home"
        component={catalogStack}
        options={({ route }) => {
          // Obtener el nombre de la pantalla activa en el stack
          const routeName = getFocusedRouteNameFromRoute(route) || 'CatalogoMain';
          
          // Ocultar tab bar solo en la pantalla Chat
          const tabBarStyle = routeName === 'Chat' 
            ? { display: 'none' } 
            : styles.tabBar;
          return {
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={require('../assets/images/logo.png')}
                style={{ width: 45, height: 45, marginRight: 0 }}
              />
            </View>
          ),
          headerStyle: { backgroundColor: '#2c5a48' },
          headerTitleAlign: 'center',
          tabBarStyle
          };
        }}
      />
      <Tab.Screen name="Perfil" component={navigationUser} />
      <Tab.Screen
        name="Publicar"
        component={formPublicar}
        options={{
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={require('../assets/images/logo.png')}
                style={{ width: 45, height: 45, marginRight: 10 }}
              />
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold' }}>
                Publicar
              </Text>
            </View>
          ),
          headerStyle: { backgroundColor: '#2c5a48' },
          headerTitleAlign: 'center',
        }}
      />
      <Tab.Screen name="Historial" component={HistoryStack} 
      options={({route})=> {
        const routeName = getFocusedRouteNameFromRoute(route) || 'HistoryChat';
        const tabBarStyle = routeName === 'Chat' || routeName === 'BarterScreen' 
            ? { display: 'none' } 
            : styles.tabBar;
            return {
              tabBarStyle
            }
      }}
      />
      <Tab.Screen name="Mapa" component={MapStack} 
      
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    height: 70,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: 'white',
    elevation: 5,
  },
  customButton: {
    top: -30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2c5a48',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 18,
    color: 'gray',
  },
});
