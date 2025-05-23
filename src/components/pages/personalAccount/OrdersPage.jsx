// Личный кабинет. Страница "Заказы"
import React, { useState, useEffect } from 'react';
import { IMaskInput } from 'react-imask'; // Форматирование номера телефона

// Импорт компонентов
import api from '../../../utils/api'; // API сервера
import Loader from "../../../components/dynamic/Loader"; // Анимация загрузки данных

// Импорт стилей 
import "../../../styles/pages/personalAccount/ordersPage.css";

// Импорт иконок
import arrowDownIcon from '../../../assets/icons/arrowDown.png';
import expandIcon from '../../../assets/icons/expand.png';
import clockIcon from '../../../assets/icons/clock.png';
import locationIcon from '../../../assets/icons/location.png';
import phoneIcon from '../../../assets/icons/phone.png';
import rubleIcon from '../../../assets/icons/rubles.png';


const OrdersPage = () => {

    /* 
    ================================
     Состояния, константы и ссылки
    ================================
    */

    const timeOut = 500; // Задержка перед отключением анимации загрузки данных

    const [sortNewFirst, setSortNewFirst] = useState(true); // Сортировка заказов (По умолчанию: сначала новые)
    const [expandedOrderId, setExpandedOrderId] = useState(null); // Данные заказа в открывающем списке
    const [orders, setOrders] = useState([]); // Список заказов
    const [isLoading, setIsLoading] = useState(true); // Отображение анимации загрузки при загрузке данных
    const [error, setError] = useState(null); // Ошибки

    /* 
    ===========================
     Эффекты
    ===========================
    */

    // Получение списка заказов
    useEffect(() => {
        const fetchOrders = async () => {
            const clientId = localStorage.getItem('clientId');
            if (!clientId) {
                setError('Пользователь не авторизован');
                setIsLoading(false);
                return;
            }

            try {
                const response = await api.getOrdersByIdClient(clientId);
                const sortedOrders = response.data.sort((a, b) => // Сортировка заказов. Сначала новые
                    sortNewFirst
                        ? new Date(b.orderPlacementTime) - new Date(a.orderPlacementTime)
                        : new Date(a.orderPlacementTime) - new Date(b.orderPlacementTime)
                );
                setOrders(sortedOrders);
            } catch (err) {
                setError('Ошибка загрузки заказов');
                console.error('Ошибка:', err);
            } finally {
                setTimeout(() => setIsLoading(false), timeOut);
            }
        };

        fetchOrders();
    }, [sortNewFirst]);

    /* 
    ===========================
     Работа с данными
    ===========================
    */

    // Форматирование времени
    const formatDateTime = (dateString, timeOnly = false) => {
        const date = new Date(dateString);
        if (timeOnly) {
            return date.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        return date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Цветовые обозначения для статусов заказа
    const getStatusStyle = (status) => {
        const styles = {
            'Создан': 'status-created',
            'Подтвержден': 'status-active',
            'В пути': 'status-active',
            'Доставлен': 'status-delivered',
            'Завершен': 'status-delivered',
            'Отменен': 'status-canceled',
            'Возврат': 'status-canceled',
            'По умолчанию': 'status-default' // Применяется к статусу, которого нет в данном списке. Дизайн по умолчанию
        };
        return styles[status] || 'status-default';
    };


    /* 
    ===========================
     Обработчики событий
    ===========================
    */


    /* 
    ===========================
     Рендер
    ===========================
    */

    // Ошибка загрузки
    if (error) return <div className="orders-error">{error}</div>;

    return (
        <div className="orders-page">
            <div className="orders-page-header">
                <h1 className="orders-page-title">История заказов</h1>

                <button
                    className="orders-page-sort-btn"
                    onClick={() => setSortNewFirst(!sortNewFirst)}
                >
                    <img
                        src={arrowDownIcon}
                        alt="Сортировка"
                        className={`sort-icon ${!sortNewFirst ? 'rotated' : ''}`}
                    />
                    {sortNewFirst ? 'Сначала новые' : 'Сначала старые'}
                </button>
            </div>

            <div className="orders-list">
                {isLoading ? <Loader isWorking={isLoading} /> :
                    <>
                        {orders.map(order => (
                            <div
                                key={order.id}
                                className={`order-card ${expandedOrderId === order.id ? 'expanded' : ''}`}
                            >
                                <div
                                    className="order-card-main"
                                    onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                                >
                                    <div className="order-card-header">
                                        <div className="order-number-status">
                                            <span className="order-number">Заказ <b>{order.orderNumber}</b></span>
                                            <span className={`order-status ${getStatusStyle(order.orderStatusForClient)}`}>
                                                {order.orderStatusForClient}
                                            </span>
                                        </div>
                                        <img
                                            src={expandIcon}
                                            alt="Подробнее"
                                            className={`expand-icon ${expandedOrderId === order.id ? 'rotated' : ''}`}
                                        />
                                    </div>



                                    <div className="order-summary">
                                        <div className="order-summary-items">
                                            <div className="order-summary-item">
                                                <img src={clockIcon} alt="Время" />

                                                {order.startDesiredDeliveryTime && order.endDesiredDeliveryTime ? (
                                                    <>
                                                        <span>Время доставки: </span>
                                                        {new Date(order.startDesiredDeliveryTime).toDateString() === new Date(order.endDesiredDeliveryTime).toDateString()
                                                            ? `${formatDateTime(order.startDesiredDeliveryTime)} — ${formatDateTime(order.endDesiredDeliveryTime, true)}`
                                                            : `${formatDateTime(order.startDesiredDeliveryTime)} — ${formatDateTime(order.endDesiredDeliveryTime)}`}
                                                    </>) : (
                                                    <span>Время доставки уточняется</span>
                                                )}
                                            </div>

                                            {order.deliveryAddress?.city && order.deliveryAddress?.street && (
                                                <div className="order-summary-item">
                                                    <img src={locationIcon} alt="Адрес" />
                                                    {`${order.deliveryAddress.city}, ${order.deliveryAddress.street} ${order.deliveryAddress.house}`}
                                                </div>
                                            )}
                                            <div className="order-summary-item">
                                                <img src={phoneIcon} alt="Телефон" />
                                                <IMaskInput
                                                    mask="+7(000)000-00-00"
                                                    value={order.numberPhoneClient}
                                                    readOnly
                                                    className="phone-masked"
                                                />
                                            </div>
                                        </div>

                                        <div className="order-summary-item">
                                            <div className="cost-details">
                                                <div className="total-cost">{(order.goodsCost + order.shippingCost).toLocaleString('ru-RU')}</div>
                                                <img src={rubleIcon} alt="Сумма" className="ruble-icon" />
                                            </div>
                                        </div>
                                    </div>

                                </div>

                                {expandedOrderId === order.id && (
                                    <div className="order-details">
                                        <div className="details-section">
                                            <h3>Состав заказа</h3>
                                            <div className="order-items">
                                                {order.items.map((item, index) => (
                                                    <div key={index} className="order-item">
                                                        <span>{item.dishName}</span>
                                                        <span>{item.quantityOrder} x {item.pricePerUnit}₽</span>
                                                    </div>
                                                ))}



                                                <div className="order-item">
                                                    <span style={{ fontWeight: '500' }} >Доставка</span>
                                                    <span className={order.shippingCost === 0 ? "free-delivery" : ''} style={{ fontWeight: '500' }}>
                                                        {order.shippingCost === 0 ? 'Бесплатно' : `${order.shippingCost}₽`}
                                                    </span>
                                                </div>
                                                <div className="orders-divider" />
                                                <div className="order-item">
                                                    <span>Итого</span>
                                                    <span>
                                                        {(order.goodsCost + order.shippingCost).toLocaleString('ru-RU')} ₽
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="details-section">
                                            <h3>Адрес доставки</h3>
                                            <div className="address-details">
                                                <div>Город: {order.deliveryAddress.city}</div>
                                                <div>Улица: {order.deliveryAddress.street}</div>
                                                <div>Дом: {order.deliveryAddress.house}</div>
                                                {order.deliveryAddress.apartment && <div>Квартира: {order.deliveryAddress.apartment}</div>}
                                                {order.deliveryAddress.entrance && <div>Подъезд: {order.deliveryAddress.entrance}</div>}
                                                {order.deliveryAddress.floor && <div>Этаж: {order.deliveryAddress.floor}</div>}
                                            </div>
                                        </div>

                                        <div className="details-section">
                                            <h3>Способ оплаты</h3>
                                            <div className="payment-method">
                                                {order.paymentMethod}
                                            </div>
                                        </div>

                                        <div className="details-section">
                                            <h3>Статус оплаты</h3>
                                            <div className={`payment-status ${order.isPaymentStatus ? 'paid' : 'unpaid'}`}>
                                                {order.isPaymentStatus ? 'Оплачено' : 'Ожидает оплаты'}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </>
                }
            </div>
        </div>
    );

}

export default OrdersPage;