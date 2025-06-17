import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from 'components/ProfileScreen';
import PublicProfileScreen from 'components/PublicProfileScreen';

const Stack = createNativeStackNavigator();

export default function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
    </Stack.Navigator>
  );
}