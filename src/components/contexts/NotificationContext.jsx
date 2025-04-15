// Контекстный провайдер для управления уведомлениями на странице 

import React, { createContext, useState, useContext, useCallback } from 'react';
import { v4 as uuidv4 } from "uuid"; // Для генерации уникального ID сообщения

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]); // Сообщения

    // Добавить сообщение
    const addNotification = useCallback((message) => {
        const id = uuidv4(); // Создание уникального ID
        setNotifications(prev => [{ id, message }, ...prev]);

        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id)); // Проверяем, что сообщение не повторяется
        }, 3000);
    }, []);

    // Удалить сообщение по нажатию
    const removeNotification = async (idNotification) => {
        setNotifications(prev => prev.filter(n => n.id !== idNotification));
    };

    return (
        <NotificationContext.Provider value={{ addNotification }}>
            {children}
            <div className="notification-container">
                {notifications.map((notification, index) => ( // Показыаем массив сообщений
                    <div
                        key={notification.id}
                        className="notification-item"
                        onClick={() => removeNotification(notification.id)}
                    >
                        {notification.message}
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    );
};

// Делаем доступным контекст
export const useNotification = () => useContext(NotificationContext);