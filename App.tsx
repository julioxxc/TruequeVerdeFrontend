import './global.css';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabNavigator from 'navigation/BottomTabNavigator';
import { UserProvider } from 'context/UserContext';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <>
    <UserProvider>
    <NavigationContainer>
      <Stack.Navigator initialRouteName="BottomTabNavigator" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="BottomTabNavigator" component={BottomTabNavigator} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
    </UserProvider>
    </>
  );
}
