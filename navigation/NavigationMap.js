import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import InteractiveMap from 'components/Map/InteractiveMap';

const Stack = createNativeStackNavigator();

export default function MapStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="InteractiveMap" component={InteractiveMap} />
    </Stack.Navigator>
  );
}