// Страница оформления заказа

import React, { useState } from 'react';
import { IMaskInput } from 'react-imask'; // Создание маски на номер телефона

// Импорт компонентов
import { useCart } from '../contexts/CartContext';

// Импорт иконок

// Импорт стилей
import './../../styles/pages/orderPage.css'; // Стили "Оформить заказ"

const OrderPage = () => {

    /* 
    ===========================
     Константы и рефы
    ===========================
    */

    const { cartItems } = useCart();

    /* 
    ===========================
     Состояния
    ===========================
    */

    const [formData, setFormData] = useState({ // Данные формы
        name: null,
        numberPhone: null
    });

    /* 
    ===========================
     Обработчики событий
    ===========================
    */

    // Ввод номера телефона
    const handlePhoneChange = (value) => {
        const cleanedValue = value.replace(/\D/g, ''); // Получаем введенные данные
        if (cleanedValue.length <= 11) { // Не более 11 символов
            setFormData(prev => ({
                ...prev,
                numberPhone: cleanedValue?.trim() || null
            }));
        }
    };

    /* 
    ===========================
     Рендер
    ===========================
    */

    return (
        <div className="order-page-container">
            <button to="/" className="order-page-back-button">
                ← Вернуться
            </button>

            <h1 className="order-page-title">Оформление заказа</h1>

            <div className="order-page-content">
                {/* Основная форма */}
                <div className="order-page-main-section">
                    <section className="order-page-section">
                        <h2 className="order-page-subtitle">Контактная информация</h2>
                        <div className="order-page-form-group">
                            <input type="text" placeholder="Имя*" className="order-page-input" />
                            <IMaskInput
                                mask="+7(000)000-00-00"
                                value={formData.numberPhone}
                                onAccept={handlePhoneChange}
                                className="order-page-input"
                                placeholder="+7(___) ___-__-__"
                            />
                        </div>
                    </section>

                    <section className="order-page-section">
                        <h2 className="order-page-subtitle">Способ оплаты</h2>
                        <div className="order-page-payment-methods">
                            {['Наличные', 'Картой при получении', 'Онлайн'].map(method => (
                                <label key={method} className="order-page-payment-label">
                                    <input type="radio" name="payment" className="order-page-radio" />
                                    {method}
                                </label>
                            ))}
                        </div>
                    </section>

                    <section className="order-page-section">
                        <h2 className="order-page-subtitle">Комментарий</h2>
                        <textarea
                            className="order-page-comment"
                            placeholder="Дополнительные пожелания..."
                        />
                    </section>
                </div>

                {/* Боковая панель с деталями */}
                <div className="order-page-sidebar">
                    <section className="order-page-section">
                        <h2 className="order-page-subtitle">Детали заказа</h2>
                        <div className="order-page-items-list">
                            {cartItems.map(item => (
                                <div key={item.id} className="order-page-item">
                                    <span>{item.name}</span>
                                    <span>{item.quantity} x {item.price} ₽</span>
                                </div>
                            ))}
                        </div>

                        <div className="order-page-divider" />

                        <div className="order-page-summary">
                            <div className="order-page-summary-row">
                                <span>Доставка:</span>
                                <span>120 ₽</span>
                            </div>
                            <div className="order-page-summary-row">
                                <span>Итого:</span>
                                <span className="order-page-total">1240 ₽</span>
                            </div>
                        </div>

                        <button className="order-page-submit-button">
                            Подтвердить заказ
                        </button>
                    </section>
                </div>
            </div>
        </div>
    );
}

export default OrderPage;