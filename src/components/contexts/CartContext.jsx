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
        try {
            let items; // Список элементов корзины
            if (localStorage.getItem('authUserToken')) { // Корзина авторизованного пользователя
                const { data } = await api.getCart(); // Загружаем из БД
                items = data.items;
            } else {
                items = JSON.parse(localStorage.getItem('cart')) || []; // Корзина неавторизованного пользователя
            }

            // Получаем полные данные блюд (т.к сохранены только кол-во и id)
            const { data: dishes } = await api.getDishes();

            const enrichedItems = items.map(cartItem => {
                const dish = dishes.find(d => d.id === cartItem.id); // Если есть блюдо из списка в корзине
                return dish ? { ...dish, quantity: cartItem.quantity } : null; // Присваиваем данные с учетом имеющихся
            }).filter(Boolean);

            setCartItems(enrichedItems);
        } catch (error) {
            console.error('Error loading cart:', error);
        }
    };

    // Универсальный метод для обновления корзины
    const updateCart = async (newItems) => {

        const isAuth = !!localStorage.getItem('authUserToken'); // Статус авторизации
        const oldItems = cartItems; // Не обновленная корзина

        try {
            // Оптимистичное обновление UI
            setCartItems(newItems);

            if (isAuth) {
                // Определяем изменения для синхронизации с API
                const addedItems = newItems.filter(newItem =>
                    !oldItems.some(oldItem => oldItem.id === newItem.id)
                );
                const removedItems = oldItems.filter(oldItem =>
                    !newItems.some(newItem => newItem.id === oldItem.id)
                );
                const updatedItems = newItems.filter(newItem =>
                    oldItems.some(oldItem =>
                        oldItem.id === newItem.id &&
                        oldItem.quantity !== newItem.quantity
                    )
                );

                // Выполняем API запросы
                await Promise.all([
                    ...addedItems.map(item =>
                        api.addItemCart({ dishId: item.id, quantity: item.quantity })
                    ),
                    ...updatedItems.map(item =>
                        api.updateItemCart(item.id, item.quantity)
                    ),
                    ...removedItems.map(item =>
                        api.removeItemCart(item.id)
                    )
                ]);

                // Принудительно обновляем данные с сервера
                await loadCart();
            } else {
                // Для гостей - сохраняем в localStorage
                const optimizedCart = newItems.map(({ id, quantity }) => ({ id, quantity }));
                localStorage.setItem('cart', JSON.stringify(optimizedCart));
            }
        } catch (error) {
            // Откатываем изменения при ошибке
            setCartItems(oldItems);
            console.error('Cart update error:', error);
        }
    };

    // Считаем общее количество товаров
    const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

    // Загрузка данных корзины при инициализации контекста
    useEffect(() => {
        loadCart();
    }, []);

    // Возвращаем состояние корзины
    return (
        <CartContext.Provider value={{
            loadCart,
            cartItems,
            totalItems,
            isCartOpen,
            toggleCart: () => setIsCartOpen(!isCartOpen),
            updateCart,
        }}>
            {children}
        </CartContext.Provider>
    );

};

export const useCart = () => useContext(CartContext);