import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ChatHistory from 'components/message/conversationList';
import ChatScreen from 'components/message/chat';
import BarterScreen from 'components/message/trueque';
import PublicProfileScreen from 'components/PublicProfileScreen';
const Stack = createNativeStackNavigator();

export default function HistoryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HistoryChat" component={ChatHistory} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="BarterScreen" component={BarterScreen} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
    </Stack.Navigator>
  );
}
