// Страница успешного оформления заказа

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Импорт компонентов
import Loader from "../../components/dynamic/Loader"; // Анимация загрузки данных

// Импорт стилей
import "./../../styles/pages/orderSuccessPage.css";

const OrderSuccessPage = () => {

    const navigate = useNavigate();
    const location = useLocation();
    const [isLoading, setIsLoading] = useState(true); // Отображение анимации загрузки при загрузке данных

    // Проверяем наличие данных о заказе, чтобы исключить умышленный переход
    useEffect(() => {
        setIsLoading(true); // Включаем анимацию загрузки данных
        try {
            if (!location.state?.orderDetails) {
                navigate('/order', { replace: true });
            }
        }
        finally {
            setTimeout(() => setIsLoading(false), 500);
        }
    }, [location.state, navigate]);

    return (
        <>
            {isLoading ? <Loader isWorking={isLoading} /> :
                <div className="order-success-page-container">
                    <div className="order-success-content">
                        <svg className="order-success-icon" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" />
                        </svg>
                        <h1 className="order-success-title">Спасибо за заказ!</h1>
                        <p className="order-success-message">Ваш заказ <b>{location.state?.orderDetails?.orderNumber}</b> принят в работу</p>
                        <button
                            className="order-success-back-button"
                            onClick={() => navigate('/menu')}
                        >
                            Вернуться в меню
                        </button>
                    </div>
                </div>
            }
        </>
    );
};

export default OrderSuccessPage;
