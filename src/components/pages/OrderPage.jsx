// Страница оформления заказа

import React, { useState, useEffect, useCallback } from 'react';
import { IMaskInput } from 'react-imask'; // Создание маски на номер телефона
import { Link, useNavigate } from 'react-router-dom';

// Импорт компонентов
import { useCart } from '../contexts/CartContext'; // Контекс корзины
import { useAddressModal } from "../contexts/AddressModalContext"; // Контекст модального окна "Адреса доставки"
import api from '../../utils/api'; // API сервера
import { useYmaps } from './../Hooks/useYmaps'; // Кастомный хук для использования Яндекс карты
import DeliveryTimeModal from '../modals/DeliveryTimeModal'; // Модальное окно выбора даты и времени доставки
import NotificationBanner from '../ui/NotificationBanner'; // Баннер уведомления

// Импорт иконок
import moreIcon from '../../assets/icons/moreVertical.png'; // Точки вертикальные
import calendarIcon from '../../assets/icons/calendar.png'; // Календарь

// Импорт стилей
import './../../styles/pages/orderPage.css'; // Стили "Оформить заказ"

const OrderPage = () => {

    /* 
    ===========================
     Константы и рефы
    ===========================
    */

    const { cartItems, loadCart } = useCart();  // Состояние корзины
    const { openModal } = useAddressModal(); // Состояние для модального окна "Адреса доставки"
    const { ymaps, isReady } = useYmaps(); // API янедкс карт
    const navigate = useNavigate(); // Для управления маршрутом приложения

    /* 
    ===========================
     Состояния
    ===========================
    */

    const [formData, setFormData] = useState({ // Данные формы
        name: '',
        numberPhone: ''
    });
    const [paymentMethod, setPaymentMethod] = useState(''); // Тип оплаты
    const [changeAmount, setChangeAmount] = useState(''); // Подготовить сдачу с суммы
    const [deliveryDate, setDeliveryDate] = useState(''); // Дата доставки
    const [deliveryTime, setDeliveryTime] = useState(''); // Время доставки
    const [selectedAddress, setSelectedAddress] = useState(null); // Адрес доставки по умолчанию
    const [isAddressValid, setIsAddressValid] = useState(false); // Статус валидации адреса доставки
    const [deliveryZones, setDeliveryZones] = useState([]); // Зоны доставки
    const [deliveryInterval, setDeliveryInterval] = useState(''); // Интервал для доставки заказа

    const [currentServerTime, setCurrentServerTime] = useState(null); // Текущее время по МСК
    const [deliverySchedule, setDeliverySchedule] = useState([]); // График работы доставки на ближайшие 7 дней
    const [isTimeModalOpen, setIsTimeModalOpen] = useState(false); // Модальное окно выбора даты и времени доставки
    const [orderSettings, setOrderSettings] = useState({ // Детали стоимости доставки
        defaultPrice: 0,
        isFreeDelivery: false,
        freeThreshold: 0
    });
    const [deliveryCost, setDeliveryCost] = useState(null); // Стоимость доставки
    const [freeDeliveryMessage, setFreeDeliveryMessage] = useState(''); // Сообщение о бесплатной доставке или ее условиях
    const [removedItems, setRemovedItems] = useState([]); // Удаленные товары из списка в заказе (Архивные товары или удаленные из БД)
    const [refreshKey, setRefreshKey] = useState(0); // Для принудительного обновления данных на странице по таймеру

    const [isCartLoading, setIsCartLoading] = useState(true); // Состояние загрузки корзины

    /* 
    ===========================
     Эффекты
    ===========================
    */


    // Обновление данных на странице по окончании заданного времени
    useEffect(() => {
        const interval = setInterval(async () => {
            // Сбрасываем выбранное время
            setDeliveryDate('');
            setDeliveryTime('');

            // Перезагружаем данные
            try {
                const [scheduleRes, settingsRes, zonesRes] = await Promise.all([
                    api.getNextSevenDaysSchedule(), // Получаем расписание
                    api.getOrderSettings(), // Базовые настройки для оформления заказа
                    api.getDeliveryZones() // Зоны доставки
                ]);

                setDeliveryInterval(settingsRes.data.interval); // Интервал доставки
                setDeliverySchedule(scheduleRes.data);
                setDeliveryZones(zonesRes.data.zones);
                setCurrentServerTime(new Date(settingsRes.data.serverTime));
                setOrderSettings({ // Получаем детали стоимости доставки
                    defaultPrice: settingsRes.data.defaultPrice || 0,
                    isFreeDelivery: Boolean(settingsRes.data.isFreeDelivery),
                    freeThreshold: Math.max(Number(settingsRes.data.freeThreshold) || 0, 0)
                });
                setRefreshKey(prev => prev + 1); // Обновляем ключ для валидации товаров
            } catch (error) {
                console.error('Ошибка автообновления:', error);
            }
        }, 10 * 60 * 100); // 5 минут

        return () => clearInterval(interval);
    }, []); // Очищаем при размонтировании

    // Проверка товаров при загрузке и обновлении
    useEffect(() => {
        const checkItemsValidity = async () => {
            setIsCartLoading(true); // Корзина загружается
            try {
                await loadCart(); // Ждем завершения загрузки корзины

                const validItems = [];
                const removed = [];

                for (const item of cartItems) {
                    if (!item.isArchived) validItems.push(item);
                    else removed.push(item);
                }

                setRemovedItems(removed); // Оповещаем пользователя, что есть блюда, которые были убраны из заказа

                // Откладываем проверку пустой корзины до загрузки данных
                if (isCartLoading) return;

                if (validItems.length === 0) {
                    navigate('/menu');
                }
            } catch (error) {
                console.error('Ошибка загрузки корзины:', error);
            } finally {
                setIsCartLoading(false);
            }
        };

        checkItemsValidity();
        // Зависимость ТОЛЬКО от ключа обновления
    }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps 

    // Проверка товаров в заказе при изменении корзины. (Это необходимо, потому что состав корзины можно менять в момент оформления заказа, и это будет отражаться на его составе)
    useEffect(() => {
        if (isCartLoading) return; // Если корзина еще не загружена

        const validItems = []; // Валидные товары из корзины

        for (const item of cartItems) {
            if (!item.isArchived) validItems.push(item);
        }

        if (cartItems.length === 0 || validItems.length === 0) {
            navigate('/menu');
        }
    }, [cartItems]); // eslint-disable-line react-hooks/exhaustive-deps 

    // Получаем и устанавливаем расписание работы доставки
    useEffect(() => {
        const loadDeliverySchedule = async () => {
            try {
                const response = await api.getNextSevenDaysSchedule();
                setDeliverySchedule(response.data);

                // Автовыбор первой доступной даты
                const firstWorkingDay = response.data.find(d => d.isWorking);
                if (firstWorkingDay) {
                    setDeliveryDate(firstWorkingDay.date);
                }
            } catch (error) {
                console.error('Ошибка загрузки расписания:', error);
                if (window.history.length > 1) { // В случае ошибки происходит маршрутизация на предыдущую страницу или в меню
                    window.history.back();
                } else {
                    window.location.href = '/menu';
                }
            }
        };

        loadDeliverySchedule();
    }, []);

    // Получаем все необходимые данные для формирования заказа
    useEffect(() => {
        const loadOrderSettings = async () => {
            try {
                const response = await api.getOrderSettings();
                const {
                    defaultPrice,
                    isFreeDelivery,
                    freeThreshold,
                    interval,
                    serverTime // Время в формате ISO
                } = response.data;

                setDeliveryInterval(interval); // Интервал доставки
                setCurrentServerTime(new Date(serverTime)); // Устанавливаем текущее время по Москве из БД
                setOrderSettings({ // Получаем детали стоимости доставки
                    defaultPrice: defaultPrice || 0,
                    isFreeDelivery: Boolean(isFreeDelivery),
                    freeThreshold: Math.max(Number(freeThreshold) || 0, 0)
                });
            } catch (error) {
                console.error('Ошибка загрузки настроек заказа:', error);
            }
        };

        loadOrderSettings();
    }, []);

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
                // Получаем и валидируем координаты
                let coordinates;
                if (isAuthorized) {
                    coordinates = [
                        parseFloat(selectedAddress.latitude),
                        parseFloat(selectedAddress.longitude)
                    ];
                } else {
                    coordinates = selectedAddress.coordinates;
                }

                if (!coordinates || coordinates.some(c => isNaN(c)) || coordinates.length !== 2) {
                    setIsAddressValid(false);
                    setDeliveryCost(null);
                    return;
                }

                // Создаем полигоны и проверяем принадлежность
                let isValid = false;
                let matchedZone = null;

                for (const zone of deliveryZones) {
                    const polygon = new ymaps.Polygon([zone.coordinates]);
                    tempMap.geoObjects.add(polygon);

                    if (polygon.geometry.contains(coordinates)) {
                        isValid = true;
                        matchedZone = zone;
                        break;
                    }
                }

                setIsAddressValid(isValid);
                setDeliveryCost(isValid ? matchedZone?.price ?? orderSettings.defaultPrice : null); // Стоимость доставки для принадлежащей зоны
            } catch (error) {
                console.error('Ошибка валидации:', error);
                setIsAddressValid(false);
                setDeliveryCost(null);
            } finally {
                // Уничтожаем временную карту
                tempMap.destroy();
            }
        };

        validateAddress();
    }, [selectedAddress, deliveryZones, ymaps, isReady, orderSettings]);

    // Расчет итоговой стоимости доставки и информирование пользователя сообщением
    useEffect(() => {
        const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const delivery = deliveryCost ?? 0;

        let finalDeliveryCost = delivery;
        let message = '';

        if (orderSettings.isFreeDelivery && orderSettings.freeThreshold > 0) {
            if (subtotal >= orderSettings.freeThreshold) {
                finalDeliveryCost = 0;
                message = 'Бесплатная доставка!';
            } else {
                const remaining = orderSettings.freeThreshold - subtotal;
                message = `До бесплатной доставки осталось ${remaining}₽`;
            }
        }

        setDeliveryCost(finalDeliveryCost);
        setFreeDeliveryMessage(message);
    }, [cartItems, deliveryCost, orderSettings]);

    /* 
    ===========================
     Функции
    ===========================
    */

    // Сумма заказа (хардкод. Тест)
    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0) + 120;

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

                        <div className="order-page-form-group">
                            {/* Блок адреса */}
                            <div className="order-page-input-group">
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
                                                <div className="order-address-details">
                                                    <div>Подъезд: {selectedAddress.entrance}</div>
                                                    <div>Этаж: {selectedAddress.floor}</div>
                                                    <div>Квартира: {selectedAddress.apartment}</div>
                                                </div>
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
                            </div>

                            {/* Блок даты и времени */}
                            <div className="order-page-input-group">
                                <label className="order-page-label">Дата и время доставки</label>
                                <div className="order-delivery-time-group">
                                    <button
                                        className="order-page-time-select-btn"
                                        onClick={() => setIsTimeModalOpen(true)}
                                    >
                                        <img src={calendarIcon} alt="Календарь" width={20} />
                                        {deliveryDate && deliveryTime
                                            ? `${new Date(deliveryDate).toLocaleDateString('ru-RU')} ${deliveryTime}`
                                            : "Выбрать дату и время"}
                                    </button>
                                </div>
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
                                    >
                                        <div className="order-payment-radio-group">
                                            <input
                                                type="radio"
                                                name="payment"
                                                className="order-page-radio"
                                                checked={paymentMethod === method}
                                                onChange={() => setPaymentMethod(method)}
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

                            {freeDeliveryMessage && (
                                <div
                                    className={`delivery-message ${deliveryCost === 0 ? 'free' : 'info'}`}
                                    // Скрываем сообщение о бесплатной доставке
                                    style={{ display: deliveryCost === 0 ? 'none' : '' }}>
                                    {freeDeliveryMessage}
                                </div>
                            )}
                            
                            <div className="order-page-summary-row">
                                <span>Доставка:</span>
                                {!isAddressValid ? (
                                    <span className="delivery-error">Укажите валидный адрес</span>
                                ) : deliveryCost === 0 ? (
                                    <span className="free-delivery">Бесплатно</span>
                                ) : (
                                    <span>{deliveryCost} ₽</span>
                                )}
                            </div>

                            <div className="order-page-summary-row">
                                <span>Итого:</span>
                                <span className="order-page-total">
                                    {cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0) + (isAddressValid ? deliveryCost : 0)} ₽
                                </span>
                            </div>
                        </div>

                        <button className="order-page-submit-button">
                            Подтвердить заказ
                        </button>
                    </section>
                </div>
            </div>

            {/* Мнимая карта для отображения зоны валидации зон доставки */}
            <div id="hidden-map"></div>

            {/* Модальное окно выбра даты и интервала доставки в заказе */}
            <DeliveryTimeModal
                isOpen={isTimeModalOpen}
                onClose={() => setIsTimeModalOpen(false)}
                deliverySchedule={deliverySchedule}
                currentServerTime={currentServerTime}
                deliveryInterval={deliveryInterval}
                onSelect={(date, time) => {
                    setDeliveryDate(date);
                    setDeliveryTime(time);
                }}
                refreshKey={refreshKey}
            />

            {/* Уведомление об изменении кол-ва товаров в заказе */}
            {removedItems.length > 0 && (
                <NotificationBanner
                    items={removedItems}
                    onClose={() => setRemovedItems([])}
                />
            )}

        </div>
    );
}

export default OrderPage;