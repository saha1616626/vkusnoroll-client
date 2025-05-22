// Форма авторизации

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isTokenValid } from '../../utils/auth'; // Проверка токена
import api from '../../utils/api'; // API сервера

// Контекс
import { useCart } from "../contexts/CartContext"; // Контекст корзины

// Импорт иконок
import eyeIcon from './../../assets/icons/eye.png'
import hiddenEyeIcon from './../../assets/icons/hiddenEye.png'
import crossIcon from './../../assets/icons/cross.png'; // Крестик 

// Импорт стилей
import './../../styles/forms/auth.css';

const LoginForm = ({ onClose, onLoginSuccess }) => {

    /* 
    ===========================
     Состояния
    ===========================
    */

    const { loadCart } = useCart(); // Состояние из контекста корзины

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState(''); // Повторный пароль
    const [message, setMessage] = useState({
        text: '',
        type: 'error' // 'error' | 'success' 
    });
    const [showPassword, setShowPassword] = useState(true);
    const [showConfirmPassword, setShowConfirmPassword] = useState(true);
    const [isRegisterMode, setIsRegisterMode] = useState(false); // Режим регистрации
    const [isConfirmEmailMode, setIsConfirmEmailMode] = useState(false); // Режим подтверждения почты
    const [userId, setUserId] = useState(null); // Пользователь, которому необходимо подтвердить почту
    const [showCodeInput, setShowCodeInput] = useState(false); // Поле для ввода кода подтверждения из Email
    const [isTimerActive, setIsTimerActive] = useState(false); // Работа таймера при отправке кода подтверждения
    const [timer, setTimer] = useState(60); // Таймер
    const [lastCodeSentTime, setLastCodeSentTime] = useState(null); // Последнее время генерации кода
    const [confirmationCode, setConfirmationCode] = useState(''); // Код подтверждения

    const navigate = useNavigate();
    const modalRef = useRef(null); // Ссылка на форму

    /* 
    ===========================
     Эффекты
    ===========================
    */

    // Обработчик клика вне модального окна
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Убираем скролл с перекрытой страницы
    useEffect(() => {
        document.body.classList.add('no-scroll');
        return () => document.body.classList.remove('no-scroll');
    }, [onClose]);

    // Сброс полей формы при переключении режима работы окна
    useEffect(() => {
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setShowPassword(true);
        setShowConfirmPassword(true);
        setUserId(null);
    }, [isRegisterMode]);

    // Скрыть сообщение через несколько секунд
    useEffect(() => {
        if (message.text) {
            const timer = setTimeout(() => {
                setMessage(prev => ({ ...prev, fading: true }));

                // Удаляем сообщение после завершения анимации
                setTimeout(() => {
                    setMessage({ text: '', type: 'error', fading: false });
                }, 300); // Должно совпадать с временем анимации
            }, 3000); // Общее время показа сообщения

            return () => clearTimeout(timer);
        }
    }, [message.text]);

    // Эффект для таймера кода подтверждения
    useEffect(() => {
        let interval;
        if (isTimerActive && lastCodeSentTime) {
            interval = setInterval(() => {
                const now = Date.now();
                const timePassed = now - lastCodeSentTime;
                const remaining = Math.ceil((60 * 1000 - timePassed) / 1000);

                if (remaining > 0) {
                    setTimer(remaining);
                } else {
                    setIsTimerActive(false);
                    setTimer(60);
                    clearInterval(interval);
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerActive, lastCodeSentTime]);

    /* 
    ===========================
     Обработчики событий
    ===========================
    */

    // Валидация Email
    const validateEmail = (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    };

    // Валидация Пароля
    const validatePassword = (password) => {
        const errors = [];
        if (password.length < 8) errors.push('');
        if (!/[A-Za-z]/.test(password)) errors.push('');
        if (/[\u0400-\u04FF]/.test(password)) errors.push(''); // Проверка на кириллицу
        return errors;
    };

    // Кнопка авторизации
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Проверка полей в режиме регистрации
            if (isRegisterMode) {
                // Валидация Email
                if (!validateEmail(email)) {
                    setMessage({
                        text: 'Неверный формат email',
                        type: 'error'
                    });
                    return;
                }

                if (password !== confirmPassword) {
                    setMessage({
                        text: 'Пароли не совпадают',
                        type: 'error'
                    });
                    return;
                }

                // Валидация пароля
                const passwordErrors = validatePassword(password);
                if (passwordErrors.length > 0) {
                    setMessage({
                        text: 'Пароль должен состоять минимум из 8 латинских символов',
                        type: 'error'
                    });
                    return;
                }
            }

            const response = isRegisterMode
                ? await api.createAccountBuyer({ email, password })
                : await api.login({ email, password });

            if (!isRegisterMode && response.data.token && response.data.userId) {
                // Сохраняем токен из куки (сервер уже установил его)
                localStorage.setItem('authUserToken', response.data.token);
                localStorage.setItem('clientId', response.data.userId)
                onLoginSuccess(); // Вызов колбэка успешной авторизации
                loadCart(); // Обновляем состав корзины при входе в учетную запись

                // Генерируем кастомное событие для обновления отображения адреса в шапке
                window.dispatchEvent(new Event('address-updated'));
            } else {
                setIsRegisterMode(false); // Переключаем обратно на вход после регистрации
                setMessage({
                    text: 'Регистрация успешна! Войдите в аккаунт',
                    type: 'success'
                });
            }
        } catch (err) {
            setMessage({
                text: err.response?.data?.error,
                type: 'error'
            });

            // Проверка необходимости подтверждения почты
            if (err.response?.data?.needsConfirmation && err.response?.data?.userId
            ) {
                setIsConfirmEmailMode(err.response?.data?.needsConfirmation);
                setUserId(err.response?.data?.userId);
            }
        }
    };

    // Обработчик отправки кода подтверждения
    const handleSendConfirmation = async () => {
        try {
            if (!userId) { // Если не получен ID пользователя, которому необходимо подтвердить почту, то откатываемся до начальной формы
                setIsConfirmEmailMode(false);
                setIsRegisterMode(false);
                return;
            }

            const responseAccount = await api.getAccountById(userId);

            // Сохраняем время последней генерации кода из серверных данных
            if (responseAccount.data.dateTimeСodeCreation) {
                const serverTime = new Date(responseAccount.data.dateTimeСodeCreation).getTime();
                setLastCodeSentTime(serverTime);

                // Рассчитываем оставшееся время до возможности запроса нового кода для подтверждения Email
                const now = Date.now();
                const timeDiff = now - serverTime;
                const remaining = Math.ceil((60 * 1000 - timeDiff) / 1000);

                if (remaining > 0) {
                    setTimer(remaining);
                    setIsTimerActive(true);
                    setShowCodeInput(true);
                    setMessage({
                        text: 'Последний код был отправлен менее минуты назад. Подождите, чтобы запросить его снова',
                        type: 'error'
                    });
                    return;
                }
            }

            const responseSendСonfirmationСode = await api.sendBuyerСonfirmationСodeEmail(userId);
            if (responseSendСonfirmationСode.data.success) {
                // Получаем серверное время генерации кода
                const serverTime = new Date(responseSendСonfirmationСode.data.dateTimeСodeCreation).getTime();

                setLastCodeSentTime(serverTime);
                setShowCodeInput(true);
                setIsTimerActive(true);
                setTimer(60); // Сбрасываем таймер на полную минуту

                // Сохраняем в sessionStorage
                sessionStorage.setItem('lastCodeSentTime', serverTime.toString());
            }
        } catch (error) {
            setMessage({
                text: 'Ошибка отправки кода подтверждения',
                type: 'error'
            });

            setIsConfirmEmailMode(false);
            setIsRegisterMode(false);
        }
    }

    // Обработчик проверки кода
    const handleVerifyCode = async () => {
        try {
            if (!userId) { // Если не получен ID пользователя, которому необходимо подтвердить почту, то откатываемся до начальной формы
                setIsConfirmEmailMode(false);
                setIsRegisterMode(false);
                return;
            }

            const response = await api.verifyBuyerСonfirmationСodeEmail(
                userId,
                confirmationCode.toString() // Преобразуем код в строку
            );

            // Успешное подтверждение почты
            if (response.data.success) {
                setShowCodeInput(false); // Скрываем поле для ввода кода
                setIsTimerActive(false); // Сброс таймера
                setIsConfirmEmailMode(false); // Сброс режима подтверждения почты
                setIsRegisterMode(false); // Режим регистрации выключен
                setConfirmationCode(''); // Очистка кода
                setUserId(null); // Сброс userId

                // Выполняем вход
                const response = await api.login({ email, password });

                if (response.data.token && response.data.userId) {
                    // Сохраняем токен из куки (сервер уже установил его)
                    localStorage.setItem('authUserToken', response.data.token);
                    localStorage.setItem('clientId', response.data.userId)
                    onLoginSuccess(); // Вызов колбэка успешной авторизации
                    loadCart(); // Обновляем состав корзины при входе в учетную запись

                    // Генерируем кастомное событие для обновления отображения адреса в шапке
                    window.dispatchEvent(new Event('address-updated'));
                }
            }
        } catch (error) {
            setMessage({
                text: 'Неверный код или срок действия истек',
                type: 'error'
            });
        }
    };

    /* 
    ===========================
     Рендер
    ===========================
    */

    return (
        <div className="login-form-overlay">
            <div className="login-form-container" ref={modalRef}>
                <button
                    onClick={onClose}
                    className="login-form-close-button"
                    aria-label="Закрыть форму"
                >
                    <img src={crossIcon} alt="Cross" />
                </button>

                <form onSubmit={handleSubmit} className="login-form">
                    <h2 className="login-form-title">
                        {isConfirmEmailMode ? 'Подтверждение Email' : isRegisterMode ? 'Регистрация' : 'Вход'}
                    </h2>

                    {message.text && (
                        <div className={`
                            login-form-message 
                            ${message.type} 
                            ${message.fading ? 'fade-out' : ''}
                        `}>
                            {message.text}
                        </div>
                    )}

                    <div className={`${isConfirmEmailMode ? 'login-input-email-group-container' : ''}`}
                        style={{ marginTop: isConfirmEmailMode && !showCodeInput && !message.text ? '40px' : '' }}
                    >
                        {/* Поле Email */}
                        <div className="login-input-group">
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isConfirmEmailMode ? true : false}
                                style={{ opacity: isConfirmEmailMode ? '0.5' : '' }}
                            />
                        </div>

                        {/* Кнопка выслать код или таймер */}
                        {isConfirmEmailMode &&
                            <button
                                type="button"
                                className="button-control login-input-group-button-confirm"
                                onClick={handleSendConfirmation}
                                disabled={isTimerActive}
                            >
                                {isTimerActive ? `${timer} сек` : 'Выслать код'}
                            </button>
                        }
                    </div>


                    {/* Поле ввода кода подтверждения */}
                    {showCodeInput && (
                        <div className="login-input-group-container">
                            <div className="login-input-group">
                                <input
                                    placeholder="Введите код"
                                    type="number"
                                    value={confirmationCode}
                                    onChange={(e) => setConfirmationCode(e.target.value)}
                                />
                            </div>
                            <button
                                type="button"
                                className="button-control login-input-group-button-verify"
                                onClick={handleVerifyCode}
                            >
                                Подтвердить
                            </button>
                        </div>
                    )}

                    {/* Поле Пароль */}
                    <div className="login-input-group" style={{ display: isConfirmEmailMode ? 'none' : '' }}>
                        <div className="login-password-wrapper">
                            <input
                                type={!showPassword ? 'text' : 'password'}
                                placeholder="Пароль"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="login-toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                <img src={showPassword ? hiddenEyeIcon : eyeIcon} alt="Eye" />
                            </button>
                        </div>
                    </div>

                    {/* Поле Повтор пароля (только для регистрации) */}
                    {isRegisterMode && (
                        <div className="login-input-group">
                            <div className="login-password-wrapper">
                                <input
                                    type={!showConfirmPassword ? 'text' : 'password'}
                                    placeholder="Пароль"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="login-toggle-password"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    <img src={showConfirmPassword ? hiddenEyeIcon : eyeIcon} alt="Eye" />
                                </button>
                            </div>
                        </div>
                    )}

                    <button type="submit" className="login-submit-button" style={{ display: isConfirmEmailMode ? 'none' : '' }}>
                        {isRegisterMode ? 'Зарегистрироваться' : 'Войти'}
                    </button>

                    <div className="login-form-footer">
                        {(!isRegisterMode && !isConfirmEmailMode) ? (
                            <>
                                <a href="/forgot-password" className="login-link">
                                    Забыли пароль?
                                </a>
                                <button
                                    type="button"
                                    className="login-link"
                                    onClick={() => setIsRegisterMode(true)}
                                >
                                    Регистрация
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                className="login-link"
                                onClick={() => {
                                    setIsRegisterMode(false);
                                    setIsConfirmEmailMode(false);
                                    setShowCodeInput(false);
                                    setIsTimerActive(false);
                                }}
                            >
                                Назад к входу
                            </button>
                        )}
                    </div>

                </form>
            </div>
        </div>
    );
};

export default LoginForm;
