import './global.css';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabNavigator from 'navigation/BottomTabNavigator';
import { UserProvider } from 'context/UserContext';
import { ConversationProvider } from 'context/ConversationContext';
import LoginScreen from 'components/LoginRegisterLayouts/Login';
import RegisterScreen from 'components/LoginRegisterLayouts/Register';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <UserProvider>
      <ConversationProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="HomeTabs" component={BottomTabNavigator} />
          </Stack.Navigator>
        </NavigationContainer>
      </ConversationProvider>
    </UserProvider>
  );
}
