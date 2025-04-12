// Корзина

import React, { useEffect, useState, useRef } from 'react';
import { useCart } from "../contexts/CartContext"; // Контекст корзины

// Импорт стилей
import "./../../styles/components/shoppingCart.css";

const ShoppingCart = () => {

    /* 
    ===========================
     Константы и рефы
    ===========================
    */

    const modalRef = useRef(null); // Ссылка на корзину

    /* 
    ===========================
     Состояния
    ===========================
    */

    const { cartItems, isCartOpen, toggleCart, updateCart } = useCart(); // Состояние корзины

    const [total, setTotal] = useState(0); // Сумма корзины
    const [itemsCount, setItemsCount] = useState(0); // Кол-во блюд в корзине

    /* 
    ===========================
     Эффекты
    ===========================
    */

    // Подсчет суммы и кол-во блюд в корзине, при изменении ее наполнения
    useEffect(() => {
        const calculateTotals = () => {
            const count = cartItems?.reduce((acc, item) => acc + item.quantity, 0); // Подсчет кол-ва
            const sum = cartItems?.reduce((acc, item) => acc + (item.price * item.quantity), 0); // Подсчет суммы
            setItemsCount(count);
            setTotal(sum);
        };
        calculateTotals();
    }, [cartItems]);

    // Убираем скролл с перекрытой страницы
    useEffect(() => {
        if (isCartOpen) {
            document.body.classList.add('no-scroll');
        } else {
            document.body.classList.remove('no-scroll');
        }
    }, [isCartOpen]);

    // Обработчик клика вне корзины
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                toggleCart(); // Закрываем корзину
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [toggleCart]);

    /* 
    ===========================
     Обработчики событий
    ===========================
    */

    // Обработка изменения товара в корзине
    const handleQuantityChange = (id, delta) => { // id товара и число изменения кол-ва
        const newItems = cartItems.map(item =>
            item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item // Не даём выставить меньше 1. Возврат item
        );
        updateCart(newItems); // Обновление данных
    };

    // Удаление блюда из корзины
    const handleRemove = (id) => {
        const newItems = cartItems.filter(item => item.id !== id); // Получаем список без данного блюда
        updateCart(newItems);
    };

    // Изменение окончания слова в зависимости от кол-ва товара в корзине
    const getCorrectWord = (count) => {
        if (count % 10 === 1 && count % 100 !== 11) {
            return "товар";
        } else if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14)) {
            return "товара";
        }
        return "товаров";
    };

    if (!isCartOpen) return null; // Если корзина не открыта, то контент не рендерим

    return (
        <div className="shopping-cart-overlay">
            <div className="shopping-cart-container" ref={modalRef}>
                <button className="shopping-cart-close" onClick={toggleCart}>×</button>
                <h2 className="shopping-cart-title">Корзина</h2>

                <div className="shopping-cart-items">
                    {cartItems.map(item => (
                        <div key={item.id} className="shopping-cart-item">
                            <img src={item.image} alt={item.name} className="shopping-cart-item-image" />
                            <div className="shopping-cart-item-info">
                                <h3>{item.name}</h3>
                                <p className="shopping-cart-item-description">
                                    {item.description?.slice(0, 50)}{item.description?.length > 50 && '...'}
                                </p>
                                <div className="shopping-cart-item-meta">
                                    <span>{item.weight ? `${item.weight} г` : item.volume ? `${item.volume} л` : ''}</span>
                                    <span>{item.price} ₽</span>
                                </div>
                                <div className="shopping-cart-item-controls">
                                    <div className="shopping-cart-item-quantity">
                                        <button onClick={() => handleQuantityChange(item.id, -1)}>-</button>
                                        <span>{item.quantity}</span>
                                        <button onClick={() => handleQuantityChange(item.id, 1)}>+</button>
                                    </div>
                                    <button
                                        className="shopping-cart-item-remove"
                                        onClick={() => handleRemove(item.id)}
                                    >🗑️</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="shopping-cart-footer">
                    <div className="shopping-cart-total">
                        {itemsCount} {getCorrectWord(itemsCount)} на сумму {total}₽
                    </div>
                    <button className="shopping-cart-checkout">Оформить заказ</button>
                </div>
            </div>
        </div>
    );

};

export default ShoppingCart;