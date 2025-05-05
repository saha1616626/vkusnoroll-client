// Баннер уведомления

import React, { useState, useEffect } from 'react';

// Импорт стилей
import './../../styles/components/notificationBanner.css';

const NotificationBanner = ({ items, onClose }) => {

    /* 
    ===========================
     Состояния, константы и ссылки
    ===========================
    */

    const [visible, setVisible] = useState(true); // Отображение

    /* 
    ===========================
     Эффекты
    ===========================
    */

    // Через 5 секунд баннер исчезает
    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            onClose();
        }, 5000);

        return () => clearTimeout(timer);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps


    /* 
    ===========================
     Обработчики событий
    ===========================
    */

    // Функция для определения правильного окончания слова "товар"
    function getProductWord(count) {
        const lastDigit = count % 10;
        const lastTwoDigits = count % 100;

        if (lastDigit === 1 && lastTwoDigits !== 11) {
            return 'товар';
        } else if ((lastDigit === 2 || lastDigit === 3 || lastDigit === 4) && (lastTwoDigits !== 12 && lastTwoDigits !== 13 && lastTwoDigits !== 14)) {
            return 'товара';
        } else {
            return 'товаров';
        }
    }

    // Функция для определения правильного глагола "убраны/убран"
    function getRemovalPhrase(count) {
        const lastDigit = count % 10;
        const lastTwoDigits = count % 100;

        if (lastDigit === 1 && lastTwoDigits !== 11) {
            return 'был убран';
        } else {
            return 'были убраны';
        }
    }

    // Функция для определения правильного окончания "доступен/доступны"
    function getAvailabilityPhrase(count) {
        const lastDigit = count % 10;
        const lastTwoDigits = count % 100;

        if (lastDigit === 1 && lastTwoDigits !== 11) {
            return 'не доступен';
        } else {
            return 'не доступны';
        }
    }

    /* 
    ===========================
     Рендер
    ===========================
    */

    return visible ? (
        <div className="notification-banner">
            <div className="notification-content">
                <span>
                    {items.length} {getProductWord(items.length)} {getRemovalPhrase(items.length)} из заказа, так как стал {getAvailabilityPhrase(items.length)}
                </span>
                <button className="notification-close" onClick={() => {
                    setVisible(false);
                    onClose();
                }}>×</button>
            </div>
        </div>
    ) : null;
}

export default NotificationBanner;
