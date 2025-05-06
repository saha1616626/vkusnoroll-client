// Страница неуспешного оформления заказа

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Импорт компонентов
import Loader from "../../components/dynamic/Loader"; // Анимация загрузки данных

// Импорт стилей
import "./../../styles/pages/orderErrorPage.css";

const OrderErrorPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isLoading, setIsLoading] = useState(true); // Отображение анимации загрузки при загрузке данных

    // Проверяем наличие данных об ошибке формирования заказа, чтобы исключить умышленный переход
    useEffect(() => {
        setIsLoading(true); // Включаем анимацию загрузки данных
        try {
            if (!location.state?.error) {
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
                <div className="order-error-page-container">
                    <div className="order-error-content">
                        <svg className="order-error-icon" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                        <h1 className="order-error-title">Ошибка оформления</h1>
                        <p className="order-error-message">
                            {location.state?.error || 'Попробуйте оформить заказ заново'}
                        </p>
                        <button
                            className="order-error-retry-button"
                            onClick={() => navigate('/order')}
                        >
                            Попробовать снова
                        </button>
                    </div>
                </div>
            }
        </>
    );
};

export default OrderErrorPage;
