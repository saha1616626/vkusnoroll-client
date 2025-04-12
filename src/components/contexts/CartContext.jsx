// Контекстный провайдер для управления состоянием корзины
// CartContext позволяет передавать состояние корзины  через дерево компонентов без необходимости прокидывать пропсы на каждом уровне

import React, { createContext, useContext, useEffect, useState } from "react";
import api from '../../utils/api'; // API сервера

const CartContext = createContext();

export const CartProvider = ({ children }) => {

    const [cartItems, setCartItems] = useState([]); // Отвечает за элементы корзины
    const [isCartOpen, setIsCartOpen] = useState(false); // Управляет состоянием видимости корзины

    // Загрузка корзины
    const loadCart = async () => {
        if (localStorage.getItem('authUserToken')) { // Корзина авторизованного пользователя
            const { data } = await api.getCart();
            setCartItems(data);
        } else {
            setCartItems(JSON.parse(localStorage.getItem('cart') || '[]')); // Корзина неавторизованного пользователя
        }
    };

    // Обновление корзины
    const updateCart = (items) => {
        const optimizedCart = items.map(({ id, quantity }) => ({ id, quantity })); // Сохраняем только Id и кол-во

        try {
            if (localStorage.getItem('token')) {
                api.updateCart(optimizedCart);
            } else {
                localStorage.setItem('cart', JSON.stringify(optimizedCart));
            }
            setCartItems(items);
        } catch (e) {
            console.error('Storage error:', e);
            // Очистка старых данных при переполнении
            if (e.name === 'QuotaExceededError') {
                localStorage.removeItem('cart');
                setCartItems([]);
            }
        }
    };

    // Загрузка данных корзины при инициализации контекста
    useEffect(() => {
        loadCart();
    }, []);

    // Возвращаем состояние корзины
    return (
        <CartContext.Provider value={{
            cartItems,
            isCartOpen,
            toggleCart: () => setIsCartOpen(!isCartOpen),
            updateCart,
        }}>
            {children}
        </CartContext.Provider>
    );

};

export const useCart = () => useContext(CartContext);