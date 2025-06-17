import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const AuthLoadingScreen = () => {
  const navigation = useNavigation();

  useEffect(() => {
    const checkToken = async () => {
      const userToken = await AsyncStorage.getItem('userToken');
      navigation.replace(userToken ? 'Home' : 'Login');
    };

    checkToken();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
};

export default AuthLoadingScreen;