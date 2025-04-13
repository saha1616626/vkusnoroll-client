// Контекстный провайдер для управления состоянием авторизации пользователя

import { createContext, useContext, useCallback, useState } from 'react';
import { isTokenValid } from './../../utils/auth'; // Проверка токена

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

    // Проверяем состояние токена
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        const token = localStorage.getItem('authUserToken'); // Актуальный статус авторизации пользователя вводим ограничения для пользователя
        return isTokenValid(token);
    });

    // Обновление статуса авторизации
    const updateAuth = (status) => {
        setIsAuthenticated(status);
        if (!status) {
            // Токен и id удаляются из локального хранилища
            ['authUserToken', 'clientId']
                .forEach(key => localStorage.removeItem(key));
        }
    };

    // Возвращаем состояние авторизации
    return (
        <AuthContext.Provider value={{ isAuthenticated, updateAuth }}>
            {children}
        </AuthContext.Provider>
    );

};

export const useAuth = () => useContext(AuthContext);