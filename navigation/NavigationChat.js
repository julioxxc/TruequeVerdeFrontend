import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import screenCatalogo from 'components/screenCatalogo';
import ChatScreen from 'components/message/chat';
import BarterScreen from 'components/message/trueque';

const Stack = createNativeStackNavigator();

export default function CatalogStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CatalogoMain" component={screenCatalogo} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}
