import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthLoadingScreen from 'components/Auth/AuthLoading';  
import LoginScreen from 'components/LoginRegisterLayouts/Login';
import RegisterScreen from 'components/LoginRegisterLayouts/Register';
import ProfileScreen from 'components/ProfileScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
          <Stack.Navigator initialRouteName="AuthLoading" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="AuthLoading" component={AuthLoadingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Home" component={ProfileScreen} />
            
          </Stack.Navigator>
  );
}


