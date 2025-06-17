// UserContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUser, saveUser, clearUser } from 'services/userService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UserContext = createContext<any>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        getUser().then(setUser);
        // Cargar token persistente si existe
        AsyncStorage.getItem('userToken').then(storedToken => {
            if (storedToken) setToken(storedToken);
        });
    }, []);

    // Ahora login recibe también el token
    const login = async (newUser: any, newToken: string) => {
        await saveUser(newUser);
        setUser(newUser);
        setToken(newToken);
    };

    const logout = async () => {
        await clearUser();
        setUser(null);
        setToken(null);
    };

    return (
        <UserContext.Provider value={{ user, token, login, logout }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    return useContext(UserContext);
}
