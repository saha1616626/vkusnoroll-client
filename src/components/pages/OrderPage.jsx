// Страница оформления заказа

import React, { useState, useEffect, useCallback } from 'react';
import { IMaskInput } from 'react-imask'; // Создание маски на номер телефона
import { Link, useNavigate } from 'react-router-dom';

// Импорт компонентов
import { useCart } from '../contexts/CartContext'; // Контекс корзины
import { useAddressModal } from "../contexts/AddressModalContext"; // Контекст модального окна "Адреса доставки"
import api from '../../utils/api'; // API сервера
import { useYmaps } from './../Hooks/useYmaps'; // Кастомный хук для использования Яндекс карты

// Импорт иконок
import moreIcon from '../../assets/icons/moreVertical.png'; // Точки вертикальные

// Импорт стилей
import './../../styles/pages/orderPage.css'; // Стили "Оформить заказ"

const OrderPage = () => {

    /* 
    ===========================
     Константы и рефы
    ===========================
    */

    const { cartItems } = useCart();  // Состояние корзины
    const { openModal } = useAddressModal(); // Состояние для модального окна "Адреса доставки"
    const { ymaps, isReady } = useYmaps(); // API янедкс карт

    /* 
    ===========================
     Состояния
    ===========================
    */

    const [formData, setFormData] = useState({ // Данные формы
        name: null,
        numberPhone: null
    });
    const [paymentMethod, setPaymentMethod] = useState(''); // Тип оплаты
    const [changeAmount, setChangeAmount] = useState(''); // Подготовить сдачу с суммы
    const [deliveryDate, setDeliveryDate] = useState(''); // Дата доставки
    const [deliveryTime, setDeliveryTime] = useState(''); // Время доставки
    const [selectedAddress, setSelectedAddress] = useState(null); // Адрес доставки по умолчанию
    const [isAddressValid, setIsAddressValid] = useState(false); // Статус валидации адреса доставки
    const [deliveryZones, setDeliveryZones] = useState([]); // Зоны доставки

    // Тестовые временные интервалы
    const timeSlots = [
        '10:00 — 11:00',
        '11:00 — 12:00',
        '12:00 — 13:00',
        '13:00 — 14:00',
        '14:00 — 15:00'
    ];

    /* 
    ===========================
     Эффекты
    ===========================
    */

    // Загрузка адреса при монтировании
    useEffect(() => {
        const loadAddress = async () => {
            const isAuthorized = !!localStorage.getItem('clientId'); // Статус авторизации

            if (isAuthorized) { // Авторизованный пользователь
                const addressId = localStorage.getItem('SelectedDefaultAddressIdAuthorizedUser'); // Получаем Id адреса
                if (addressId) {
                    try {
                        const response = await api.getDeliveryAddressById(addressId); // Получаем адрес по Id
                        setSelectedAddress(response.data[0]);
                    } catch (error) {
                        console.error('Ошибка загрузки адреса:', error);
                    }
                }
            } else { // Гость
                const guestAddress = JSON.parse(
                    localStorage.getItem('SelectedDefaultAddressUnAuthorizedUser') || 'null' // Получаем полный объект адреса
                );
                setSelectedAddress(guestAddress);
            }
        };

        loadAddress();
        // Подписываемся на кастомное событие для получения изменений в адресе
        window.addEventListener('address-updated', loadAddress);
        return () => window.removeEventListener('address-updated', loadAddress);
    }, []);

    // Загрузка зон доставки
    useEffect(() => {
        const loadZones = async () => {
            try {
                const response = await api.getDeliveryZones();
                setDeliveryZones(response.data.zones || []);
            } catch (error) {
                console.error('Ошибка загрузки зон:', error);
            }
        };
        loadZones();
    }, []);

    // Валидация адреса для существующих зон
    useEffect(() => {
        const validateAddress = async () => {
            if (!selectedAddress || !ymaps || !isReady || !deliveryZones) return;

            const isAuthorized = !!localStorage.getItem('clientId');
            const tempMap = new ymaps.Map('hidden-map', { // Создаем скрытую карту
                center: [56.129057, 40.406635],
                zoom: 12.5,
                controls: ['zoomControl']
            });

            try {
                // Используем координаты из сохраненного адреса
                const coordinates = isAuthorized
                    ? [selectedAddress.latitude, selectedAddress.longitude]
                    : selectedAddress.coordinates;

                // Создаем временные полигоны
                const polygons = deliveryZones.map(zone => {
                    return new ymaps.Polygon([zone.coordinates], {}, {
                        fillOpacity: 0.001,
                        strokeWidth: 0
                    });
                });

                // Добавляем полигоны на скрытую карту
                polygons.forEach(polygon => tempMap.geoObjects.add(polygon));

                // Проверка вхождения
                const isValid = polygons.some(polygon =>
                    polygon.geometry.contains(coordinates)
                );

                setIsAddressValid(isValid);
            } catch (error) {
                console.error('Ошибка валидации:', error);
                setIsAddressValid(false);
            } finally {
                // Уничтожаем временную карту
                tempMap.destroy();
            }
        };

        validateAddress();
    }, [selectedAddress, deliveryZones, ymaps, isReady]);

    /* 
    ===========================
     Функции
    ===========================
    */

    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0) + 120; // Сумма заказа (хардкод)

    // TODO - Если нет валидных товаров в корзине, то авто переход назад

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

    // Обработчик изменения адреса через модальное окно
    const handleAddressUpdate = () => {
        const isAuthorized = !!localStorage.getItem('clientId');
        const address = isAuthorized
            ? localStorage.getItem('SelectedDefaultAddressIdAuthorizedUser')
            : JSON.parse(localStorage.getItem('SelectedDefaultAddressUnAuthorizedUser') || 'null');
        setSelectedAddress(address);
    };

    /* 
    ===========================
     Рендер
    ===========================
    */

    return (
        <div className="order-page-container">
            <Link to="/menu" className="order-page-back-button">
                <span className="order-page-back-arrow">←</span> Вернуться в меню
            </Link>

            <h1 className="order-page-title">Оформление заказа</h1>

            <div className="order-page-content">
                {/* Основная форма */}
                <div className="order-page-main-section">
                    {/* Контактная информация */}
                    <section className="order-page-section">
                        <h2 className="order-page-subtitle">Контактная информация</h2>
                        <div className="order-page-form-group">
                            <div className="order-page-input-group">
                                <label className="order-page-label">Имя</label>
                                <input
                                    type="text"
                                    placeholder=""
                                    maxLength={50}
                                    className="order-page-input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="order-page-input-group">
                                <label className="order-page-label">Телефон</label>
                                <IMaskInput
                                    mask="+7(000)000-00-00"
                                    value={formData.numberPhone}
                                    onAccept={(value) => setFormData({ ...formData, numberPhone: value })}
                                    className="order-page-input"
                                    placeholder="+7(___) ___-__-__"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Доставка */}
                    <section className="order-page-section">
                        <h2 className="order-page-subtitle">Доставка</h2>

                        {/* Блок адреса */}
                        <div className="order-page-input-group" style={{ marginBottom: '1.5rem' }}>
                            <label className="order-page-label">Адрес доставки</label>
                            {selectedAddress ? (
                                <div className="order-address-card" title={!isAddressValid ? 'Изменилась зона доставки. Пожалуйста, обновите адрес.' : null}>
                                    <div className={`order-address-content ${!isAddressValid ? 'invalid' : ''}`}>
                                        <p className="order-address-main">
                                            {selectedAddress.city}, {selectedAddress.street} {selectedAddress.house}
                                            {selectedAddress.isPrivateHome && (
                                                <span className="order-address-private">Частный дом</span>
                                            )}
                                        </p>
                                        {(selectedAddress.apartment && !selectedAddress.isPrivateHome) && (
                                            <p className="order-address-details">
                                                <div>Подъезд: {selectedAddress.entrance}</div>
                                                <div>Этаж: {selectedAddress.floor}</div>
                                                <div>Квартира: {selectedAddress.apartment}</div>
                                            </p>
                                        )}
                                    </div>
                                    {!isAddressValid && (
                                        <div className="address-validation-error">
                                            Адрес вне зоны доставки
                                        </div>
                                    )}
                                    <button
                                        className="order-address-more"
                                        onClick={() => {
                                            window.addEventListener('address-updated', handleAddressUpdate);
                                            openModal('list');
                                        }}>
                                        <img src={moreIcon} alt="Изменить" width={16} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    className="order-page-add-address"
                                    onClick={() => openModal('list')}>
                                    + Добавить адрес доставки
                                </button>
                            )}

                            {/* TODO, нужно добавить плашку с проверкой адреса. Если адерс валидный для зон досатвки, то плашка не отображается
                            Наличие этой плашки не даст оформить заказ */}
                        </div>

                        {/* Блок даты и времени */}
                        <div className="order-delivery-time-group">
                            <div className="order-page-input-group">
                                <label className="order-page-label">Дата доставки</label>
                                <input
                                    type="date"
                                    className="order-page-input"
                                    value={deliveryDate}
                                    onChange={(e) => setDeliveryDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>

                            <div className="order-page-input-group">
                                <label className="order-page-label">Время доставки</label>
                                <select
                                    className="order-page-input"
                                    value={deliveryTime}
                                    onChange={(e) => setDeliveryTime(e.target.value)}>
                                    <option value="">Выберите время</option>
                                    {timeSlots.map((time, index) => (
                                        <option key={index} value={time}>{time}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* Способ оплаты */}
                    <section className="order-page-section">
                        <h2 className="order-page-subtitle">Способ оплаты</h2>
                        <div className="order-page-payment-methods">
                            {['Наличные', 'Картой при получении', 'Онлайн'].map(method => (
                                <div key={method} className="order-payment-method-container">
                                    <label
                                        className="order-page-payment-label"
                                        onClick={() => setPaymentMethod(method)}
                                    >
                                        <div className="order-payment-radio-group">
                                            <input
                                                type="radio"
                                                name="payment"
                                                className="order-page-radio"
                                                checked={paymentMethod === method}
                                            />
                                            <span className="order-page-payment-text">{method}</span>
                                        </div>
                                    </label>

                                    {method === 'Наличные' && paymentMethod === 'Наличные' && (
                                        <div className="order-page-change-field">
                                            <label className="order-page-label">Подготовить сдачу с</label>
                                            <div className="order-page-currency-input">
                                                <input
                                                    type="number"
                                                    placeholder="5000"
                                                    value={changeAmount}
                                                    onChange={(e) => setChangeAmount(e.target.value)}
                                                    min={total}
                                                />
                                                <span className="order-page-currency">₽</span>
                                            </div>
                                            {changeAmount && changeAmount < total && (
                                                <p className="order-page-error">
                                                    Сумма должна быть не меньше {total}₽
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Комментарий */}
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
                    {/* Детали заказа */}
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

            <div id="hidden-map"></div>
        </div>
    );
}

export default OrderPage;