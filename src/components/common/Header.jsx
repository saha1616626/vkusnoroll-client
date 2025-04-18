// Шапка

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { isTokenValid } from '../../utils/auth'; // Проверка токена

// Импорт компонентов
import LoginForm from "../forms/LoginForm"; // Форма авторизации
import ShoppingCart from "../dynamic/ShoppingCart"; // Корзина
import { useCart } from "../contexts/CartContext"; // Контекст корзины
import { useAuth } from "../contexts/AuthContext"; // Контекст авторизации

// Импорт стилей
import './../../styles/global/global.css'; // Глобальные стили
import './../../styles/blocks/header.css'; // Стили для шапки

// Импорт иконок
import userIcon from './../../assets/icons/user.png'; // Личный кабинет
import shoppingCartIcon from './../../assets/icons/shoppingCart.png'; // Корзина 

const Header = () => {

    /* 
    ===========================
     Состояния
    ===========================
    */

    const navigate = useNavigate();
    const location = useLocation(); // Получаем текущий маршрут

    const [showLoginForm, setShowLoginForm] = useState(false); // Отображение формы авторизации
    const [showNavigationConfirmModal, setShowNavigationConfirmModal] = useState(false); // Отображение модального окна ухода со страницы без сохранения
    const [pendingNavigation, setPendingNavigation] = useState(null); // Подтверждение навигации без сохранения

    const { updateAuth } = useAuth(); // Состояния из контекста авторизации
    const { totalItems, isCartOpen, toggleCart } = useCart(); // Состояние из контекста корзины

    /* 
    ===========================
     Эффекты
    ===========================
    */

    // Инициализация при рендере компонента
    useEffect(() => {
        // Если текущий путь не соответствует ни одному из маршрутов
        if (
            location.pathname !== '/menu' &&
            !location.pathname.startsWith('/contacts') &&
            !location.pathname.startsWith('/news') &&
            !location.pathname.startsWith('/personal-account')
        ) {
            navigate('/menu'); // Перенаправляем на маршрут по умолчанию
        }
    }, [navigate, location.pathname]);

    /* 
    ===========================
     Обработчики событий
    ===========================
    */

    // Навигация
    const handleNavigation = (path, shouldUpdateButton) => {
        const checkNavigation = () => {
            navigate(path);
        };

        // Проверка на несохраненные изменения
        if (localStorage.getItem('isDirty') === 'true') { // На false isDirty при выходе без сохранения менять не нужно, так как компонент размонтируется и удалит состоние isDirty в localStorage
            setPendingNavigation(() => checkNavigation);
            setShowNavigationConfirmModal(true);
        } else {
            checkNavigation(); // Пользователь подтвердил переход без сохранения данных
        }
    };

    // Переход в личный кабинет при наличии прав
    const handleLaunchingPersonalAccount = async (e) => {
        const token = localStorage.getItem('authUserToken');
        if (!isTokenValid(token)) {
            // Токен и id удаляются из локального хранилища
            ['authUserToken', 'clientId']
                .forEach(key => localStorage.removeItem(key));
            updateAuth(false); // Обновить контекст авторизации
            navigate('/menu');
            setShowLoginForm(true);
        }
        else {
            updateAuth(true);
            navigate('/personal-account');
        }
    };

    // Обработчики кликов
    const handleLogoClick = () => handleNavigation('/menu', true);

    return (
        <div style={{ position: 'sticky', top: '0', zIndex: '10' }}>
            <header className="header-header-container">
                <div
                    className="header-logo"
                    onClick={handleLogoClick}
                    style={{ cursor: 'pointer' }}
                    title="Главная страница"
                >
                    ВкусноРолл
                </div>

                {/* Адрес доставки */}

                {/* Время доставки */}

                <nav style={{ display: 'flex', gap: '30px', justifyContent: 'center', margin: '0', padding: '0' }}>
                    {['Контакты', 'Новости'].map((label, index) => {
                        const path = label === 'Контакты' ? '/contacts' : '/news';
                        return (
                            <button
                                className="header-nav-button"
                                key={index}
                                onClick={() => handleNavigation(path, true)}
                            >
                                {label}
                            </button>
                        );
                    })}
                </nav>

                <div className="header-icons">
                    <img
                        src={userIcon}
                        aria-label="Личный кабинет"
                        title="Личный кабинет"
                        alt="User"
                        onClick={handleLaunchingPersonalAccount}
                        style={{ cursor: 'pointer' }}
                    />
                    <img
                        src={shoppingCartIcon}
                        alt="Settings"
                        title="Корзина"
                        onClick={toggleCart}
                        style={{ cursor: 'pointer' }}
                    />
                    {totalItems > 0 && (
                        <span className="header-cart-badge">
                            {totalItems}
                        </span>
                    )}
                </div>

                {/* Корзина */}
                <ShoppingCart isOpen={isCartOpen} onClose={toggleCart} />

            </header>

            {/* Форма авторизации */}
            {showLoginForm && (
                <LoginForm
                    onClose={() => setShowLoginForm(false)}
                    onLoginSuccess={() => {
                        setShowLoginForm(false);
                        updateAuth(true);
                        navigate('/personal-account'); // Переход в личный кабинет
                    }}
                />
            )}

        </div>
    );
};

export default Header;