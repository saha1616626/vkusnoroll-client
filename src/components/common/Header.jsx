// Шапка

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { isTokenValid } from '../../utils/auth'; // Проверка токена

// Импорт компонентов
import LoginForm from "../forms/LoginForm"; // Форма авторизации
import ShoppingCart from "../dynamic/ShoppingCart"; // Корзина
import { useCart } from "../contexts/CartContext"; // Контекст корзины
import { useAuth } from "../contexts/AuthContext"; // Контекст авторизации
import api from '../../utils/api'; // API сервера
import { useAddressModal } from "../contexts/AddressModalContext"; // Контекст модального окна "Адреса доставки"

// Импорт стилей
import './../../styles/global/global.css'; // Глобальные стили
import './../../styles/blocks/header.css'; // Стили для шапки

// Импорт иконок
import userIcon from './../../assets/icons/user.png'; // Личный кабинет
import shoppingCartIcon from './../../assets/icons/shoppingCart.png'; // Корзина 
import clockIcon from './../../assets/icons/clock.png'; // Часы 
import locationIcon from './../../assets/icons/location.png'; // Метка карты

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
    const { totalItems, isCartOpen, toggleCart, loadCart } = useCart(); // Состояния из контекста корзины
    const { openModal, isOpen } = useAddressModal(); // Состояние для модального окна "Адреса доставки"

    const [deliveryTime, setDeliveryTime] = useState({ time: null, isWorking: false, nextWorkDate: null, nextStartTime: null }); // Время работы ресторана
    const [currentAddress, setCurrentAddress] = useState(''); // Выбранный адрес пользователя

    /* 
    ===========================
     Эффекты
    ===========================
    */

    // Каждые 5 минут или при перезагрузке проверяем данные пользователя. Обновляем данные, проверяем ограничения
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userId = localStorage.getItem('clientId');

                // Если пользователь не авторизован — пропускаем
                if (!userId) {
                    return;
                }

                // Запрос актуальных данных пользователя
                const response = await api.getAccountById(userId);

                // Проверка блокировки аккаунта и подтверждения email
                if (response.data.isAccountTermination || !response.data.isEmailConfirmed) {
                    updateAuth(false); // Синхронизируем контекст
                    loadCart(); // Обновляем состав корзины при выходе из учетной записи (автоматически при окончании жизни токена или ручной выход)
                    // Генерируем кастомное событие для обновления отображения адреса в шапке
                    window.dispatchEvent(new Event('address-updated'));

                    // Редирект только если не на целевой странице
                    if (location.pathname !== '/menu') {
                        navigate('/menu', { replace: true });
                    }
                }
            } catch (error) {
                console.error('Ошибка при обновлении данных пользователя:', error);
            }
        };

        // Первый запрос при монтировании
        fetchUserData();

        // Периодическая синхронизация
        const syncInterval = setInterval(fetchUserData, 300000); // 5 минут

        // Очистка при размонтировании компонента
        return () => {
            clearInterval(syncInterval);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps 

    // Инициализация при рендере компонента
    useEffect(() => {
        // Если текущий путь не соответствует ни одному из маршрутов
        if (
            location.pathname !== '/menu' &&
            !location.pathname.startsWith('/contacts') &&
            !location.pathname.startsWith('/news') &&
            !location.pathname.startsWith('/personal-account') &&
            !location.pathname.startsWith('/order')
        ) {
            navigate('/menu'); // Перенаправляем на маршрут по умолчанию
        }
    }, [navigate, location.pathname]);

    // Установка времени работы ресторана при загрузке страницы
    useEffect(() => {
        const loadTime = async () => {
            try {
                const response = await api.getCurrentDeliveryTime();
                //  Проверка ответа
                if (response.data) {
                    setDeliveryTime({
                        time: formatTime(response?.data.start, response?.data.end),
                        isWorking: response?.data.isWorking,
                        nextWorkDate: response?.data.nextWorkDate,
                        nextStartTime: response?.data.nextStartTime
                    });
                }
            } catch (error) {
                console.error('Ошибка загрузки времени:', error);
            }
        };
        loadTime();
    }, []);

    // Обновление отображения выбранного адреса доставки
    useEffect(() => {
        const handleAddressUpdate = () => {
            const isAuthorized = !!localStorage.getItem('clientId'); // Проверка авторизации

            if (isAuthorized) { // Авторизованный пользователь
                const savedAddressId = localStorage.getItem('SelectedDefaultAddressIdAuthorizedUser');
                const loadAddress = async () => {
                    try {
                        if (!savedAddressId) { // Если адрес не обнаружен или хранилище с данным объектом удалено
                            setCurrentAddress('');
                            return;
                        }

                        // Добавляем новый метод в API для получения адреса по ID
                        const response = await api.getDeliveryAddressById(savedAddressId);
                        const address = response?.data[0] || null;

                        if (address) {
                            setCurrentAddress(`${address.city}, ${address.street} ${address.house}`);
                        } else {
                            localStorage.removeItem('SelectedDefaultAddressIdAuthorizedUser');
                            setCurrentAddress('');
                        }
                    } catch (error) {
                        setCurrentAddress('');
                    }
                };

                loadAddress();
            } else {  // Гость

                // Получаем адреса из localStorage и парсим их
                const guestAddresses = JSON.parse(localStorage.getItem('guestAddresses'));

                // Если список адресов пуст, то удаляем выбранный адрес
                if (!guestAddresses || guestAddresses.length === 0) {
                    localStorage.removeItem('SelectedDefaultAddressUnAuthorizedUser');
                    setCurrentAddress('');
                    return;
                }

                const savedAddress = JSON.parse(
                    localStorage.getItem('SelectedDefaultAddressUnAuthorizedUser') || 'null'
                );

                if (!savedAddress) {
                    setCurrentAddress('');
                    return;
                }

                if (savedAddress) {
                    setCurrentAddress(
                        savedAddress.displayName ||
                        `${savedAddress.city}, ${savedAddress.street} ${savedAddress.house}`
                    );
                } else {
                    localStorage.removeItem('SelectedDefaultAddressUnAuthorizedUser');
                    setCurrentAddress('');
                }
            }


        };

        // Вызываем при первоначальной загрузке
        handleAddressUpdate();

        // Подписываемся на кастомное событие
        window.addEventListener('address-updated', handleAddressUpdate);

        return () => {
            window.removeEventListener('address-updated', handleAddressUpdate);
        };
    }, []);

    /* 
    ===========================
    Управление данными
    ===========================
    */

    // Форматирование интервала времени
    const formatTime = (startTime, endTime) => {
        if (!startTime || !endTime) return '—';

        const formatSingleTime = (timeString) => {
            try {
                return timeString.split(':').slice(0, 2).join(':'); // Убираем миллисекунды
            } catch (e) {
                return '—';
            }
        };

        return `${formatSingleTime(startTime)} – ${formatSingleTime(endTime)}`;
    };

    // Форматирование даты следующего открытия ресторана
    const formatNextWorkDate = (dateString) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('ru-RU', {
            day: 'numeric',
            month: 'long'
        }).format(date);
    };

    // Форматирование даты завтрашнего открытия
    const isTomorrow = (dateString) => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return new Date(dateString).toDateString() === tomorrow.toDateString();
    };


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
        if (sessionStorage.getItem('isDirty') === 'true') { // На false isDirty при выходе без сохранения менять не нужно, так как компонент размонтируется и удалит состоние isDirty в localStorage
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

    /* 
    ===========================
     Рендер
    ===========================
    */

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

                <div style={{ display: 'flex', gap: '3rem' }}>
                    {/* Адрес доставки */}
                    <button
                        className="header-address-button"
                        onClick={() => openModal('list')}
                        title={currentAddress || 'Выберите адрес доставки'}
                    >
                        <img
                            src={locationIcon}
                            aria-label="Адрес доставки"
                            alt="Location"
                            className="header-address-icon"
                        />
                        <div className="header-address-text">
                            {currentAddress ? (
                                <>
                                    {currentAddress.split(',')[0]}
                                    <span>{currentAddress.slice(currentAddress.indexOf(',') + 1).trim()}</span>
                                </>
                            ) : (
                                'Выберите адрес'
                            )}
                        </div>
                    </button>

                    {/* Время работы доставки */}
                    <div className={`header-delivery-time ${deliveryTime.isWorking ? 'working-day' : 'day-off'}`}
                        title={deliveryTime.isWorking ? "Режим работы" : "Сегодня выходной"}>
                        <img
                            src={clockIcon}
                            aria-label="Время работы ресторана"
                            alt="Clock"
                            className="header-time-icon"
                        />
                        <div className="header-time-text">
                            {deliveryTime.isWorking ? (
                                <>
                                    <span className="time-range">{deliveryTime.time}</span>
                                    <span className="work-status">Доставка работает</span>
                                </>
                            ) : (
                                <>
                                    <span className="day-off-text">Выходной день</span>
                                    {deliveryTime.nextWorkDate ? (
                                        <span className="next-workday">
                                            {isTomorrow(deliveryTime.nextWorkDate)
                                                ? `Завтра с ${deliveryTime.nextStartTime.split(':').slice(0, 2).join(':')}`
                                                : `Откроется ${formatNextWorkDate(deliveryTime.nextWorkDate)}`}
                                        </span>
                                    ) : (
                                        <span className="next-workday">
                                            Режим работы не настроен
                                        </span>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="header-group-element">

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