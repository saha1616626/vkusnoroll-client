// Меню личного кабинета

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';

// Стили
import "./../../styles/menus/personalAccountMenu.css";

// Импорт компонентов
import ConfirmationModal from './../modals/ConfirmationModal';
import { useAuth } from "../contexts/AuthContext"; // Контекст авторизации

// Контекс
import { useCart } from "../contexts/CartContext"; // Контекст корзины

const PersonalAccountMenu = () => {

    /* 
    ===========================
     Состояния
    ===========================
    */

    const navigate = useNavigate();
    const location = useLocation();
    const { loadCart } = useCart(); // Состояние из контекста корзины

    // Модальное окно подтверждения перехода при наличии несохраненных данных
    // const [showNavigationConfirmModal, setShowNavigationConfirmModal] = useState(false); // Отображение модального окна
    // const [pendingNavigation, setPendingNavigation] = useState(null); // Подтверждение навигации в модальном окне

    // Модальное окно выхода из учетной записи
    const [showExitConfirmModal, setShowExitConfirmModal] = useState(false); // Отображение модального окна

    const [selectedButton, setSelectedButton] = useState(0); // Нажатая кнопка в меню

    const { updateAuth } = useAuth(); // Состояния из контекста авторизации

    /* 
    ===========================
     Эффекты
    ===========================
    */

    // Определение активной кнопки при загрузке
    useEffect(() => {
        const path = location.pathname;
        if (path.startsWith('/personal-account/personal-data')) setSelectedButton(0);
        else if (path.startsWith('/personal-account/orders')) setSelectedButton(1);
        else if (path.startsWith('/personal-account/addresses')) setSelectedButton(2);
    }, [location.pathname]);

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            localStorage.removeItem('selectedSettingsButtonIndex');
        };
    }, []);

    /* 
    ===========================
     Обработчики событий
    ===========================
    */

    // Кнопка выход. Вызов модального окна подтверждения выхода из учетной записи
    const handleActionConfirmation = () => {
        setShowExitConfirmModal(true); // Отображаем модальное окно
    };

    // Подтверждение в модальном окне о выходе из учетной записи
    const handleConfirmAction = async () => {
        try {
            await handleLogout();
        } finally {
            setShowExitConfirmModal(false); // После выполнения выхода закрываем модальное окно
        }
    };

    // Выход из аккаунта
    const handleLogout = () => {
        // Токен и id удаляются из локального хранилища
        ['authUserToken', 'clientId']
            .forEach(key => localStorage.removeItem(key));
        updateAuth(false); // Передаем состояние о выходе
        loadCart(); // Обновляем состав корзины
        navigate('/menu');

        // Генерируем кастомное событие для обновления отображения адреса в шапке
        window.dispatchEvent(new Event('address-updated'));
    };

    // Навигация
    const handleNavigation = (path, buttonIndex) => {
        const checkNavigation = () => {
            navigate(path);
            setSelectedButton(buttonIndex);
            localStorage.setItem('selectedSettingsButtonIndex', buttonIndex);
        };

        // Проверка на несохраненные изменения
        if (sessionStorage.getItem('isDirty') === 'true') { // На false isDirty при выходе без сохранения менять не нужно, так как компонент размонтируется и удалит состоние isDirty в localStorage
            // setPendingNavigation(() => checkNavigation);
            // setShowNavigationConfirmModal(true);
        } else {
            checkNavigation();
        }
    };

    // Обработчики кликов
    const buttonLabels = [
        { label: 'Личные данные', path: 'personal-data' },
        { label: 'Заказы', path: 'orders' },
        { label: 'Адреса', path: 'addresses' }
    ];

    return (
        <div className="personal-account-menu-menu-container">
            {/* Верхняя часть меню */}
            <div>
                <h2 className="personal-account-menu-title">Личный кабинет</h2>
                <nav className="personal-account-menu-nav">
                    {buttonLabels.map((item, index) => (
                        <button
                            key={index}
                            className="personal-account-menu-nav-button"
                            onClick={() => handleNavigation(`/personal-account/${item.path}`, index)}
                            style={{
                                backgroundColor: selectedButton === index ? '#f0f0f0' : 'transparent',
                                color: selectedButton === index ? '#333' : '#666'
                            }}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Кнопка выхода */}
            <button
                onClick={() => handleActionConfirmation()}
                className="button-control personal-account-menu-logout-button"
            >
                Выйти
            </button>

            {/* Модальное окно выход из учетной записи */}
            <ConfirmationModal
                isOpen={showExitConfirmModal}
                title={'Вы уверены, что хотите выйти из своей учётной записи?'}
                message={'Подтвердите действие'}
                onConfirm={handleConfirmAction}
                onCancel={() => setShowExitConfirmModal(false)}
            />

        </div>
    );

};

export default PersonalAccountMenu;