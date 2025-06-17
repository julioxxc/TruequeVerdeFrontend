
import AsyncStorage from '@react-native-async-storage/async-storage';
const KEY_USER = 'userData';

let _currentUser: any = null;

export async function saveUser(user: any) {
    _currentUser = user;
    await AsyncStorage.setItem(KEY_USER, JSON.stringify(user));
}

export async function getUser() {
    if (_currentUser) return _currentUser;
    const data = await AsyncStorage.getItem(KEY_USER);
    if (!data) return null;
    _currentUser = JSON.parse(data);
    return _currentUser;
}

export async function clearUser() {
    _currentUser = null;
    await AsyncStorage.removeItem(KEY_USER);
}
