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
    const [isRecoveryMode, setIsRecoveryMode] = useState(false); // Режим восстановления пароля 
    const [isNewPasswordEntryMode, setIsNewPasswordEntryMode] = useState(false); // Режим ввода нового пароля
    const [showContinueButton, setShowContinueButton] = useState(true); // Видимость кнопки продолжить в режиме восстановления пароля 
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
            // Режим восстановления пароля 
            if (isRecoveryMode && !isNewPasswordEntryMode) {
                // Валидация Email
                if (!validateEmail(email)) {
                    setMessage({
                        text: 'Неверный формат email',
                        type: 'error'
                    });
                    return;
                }

                const responseSendСonfirmationСode = await api.sendCodeBuyerRecoveryPassword(email);

                if (responseSendСonfirmationСode.data.success) {
                    // Получаем серверное время генерации кода
                    const serverTime = new Date(responseSendСonfirmationСode.data.dateTimeСodeCreation).getTime();

                    setLastCodeSentTime(serverTime);
                    setShowCodeInput(true);
                    setIsTimerActive(true);
                    setShowContinueButton(false);
                    setTimer(60); // Сбрасываем таймер на полную минуту
                    setUserId(responseSendСonfirmationСode.data.userId);

                    // Сохраняем в sessionStorage
                    sessionStorage.setItem('lastCodeSentTime', serverTime.toString());
                }

                return;
            }

            // Режим сохранения нового пароля
            if (isNewPasswordEntryMode) {
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
                        text: 'Пароль должен состоять минимум из 8 символов, цифр и букв. Кириллица не допускается',
                        type: 'error'
                    });
                    return;
                }

                // Метод смены пароля
                const responseChangingPassword = await api.changingPassword(userId, password);
                if (responseChangingPassword.data.success) {
                    setMessage({
                        text: 'Пароль успешно сменен! Войдите в аккаунт',
                        type: 'success'
                    });

                    setIsRecoveryMode(false);
                    setIsNewPasswordEntryMode(false);
                    setIsRegisterMode(false);
                    setIsConfirmEmailMode(false);
                    setShowCodeInput(false);
                    setIsTimerActive(false);
                    setIsRecoveryMode(false);
                    setShowContinueButton(true);
                    setEmail('');
                    setPassword('');
                    setConfirmationCode('');
                }

                return;
            }

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
                        text: 'Пароль должен состоять минимум из 8 символов, цифр и букв. Кириллица не допускается',
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
            if (err.response?.data?.needsConfirmation && err.response?.data?.userId) {
                setIsConfirmEmailMode(err.response?.data?.needsConfirmation);
                setUserId(err.response?.data?.userId);
            }

            // Обновляем таймер, если код для восстановления пароля был запрошен менее минуты назад
            if (err.response?.data?.dateTimeСodeCreation && isRecoveryMode && err.response?.data?.userId) {
                const serverTime = new Date(err.response?.data?.dateTimeСodeCreation).getTime();
                setLastCodeSentTime(serverTime);
                setUserId(err.response?.data?.userId);

                // Рассчитываем оставшееся время до возможности запроса нового кода для подтверждения Email
                const now = Date.now();
                const timeDiff = now - serverTime;
                const remaining = Math.ceil((60 * 1000 - timeDiff) / 1000);

                if (remaining > 0) {
                    setTimer(remaining);
                    setIsTimerActive(true);
                    setShowCodeInput(true);
                    setShowContinueButton(false);
                    return;
                }
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

            const responseSendConfirmationCode = await api.sendBuyerConfirmationCodeEmail(userId);
            if (responseSendConfirmationCode.data.success) {
                // Получаем серверное время генерации кода
                const serverTime = new Date(responseSendConfirmationCode.data.dateTimeСodeCreation).getTime();

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

            if (!confirmationCode || confirmationCode === '') return; // Проверяем отсутствие значения

            const response = isRecoveryMode && !isConfirmEmailMode
                ? await api.checkingCodeResettingPassword(userId, confirmationCode.toString())
                : await api.verifyBuyerConfirmationCodeEmail(userId, confirmationCode.toString());  // Преобразуем код в строку

            // Успешное подтверждение почты
            if (response.data.success) {

                if (isRecoveryMode && !isConfirmEmailMode) {
                    setIsNewPasswordEntryMode(true); // Режим ввода нового пароля включен
                    setShowCodeInput(false); // Скрываем поле для ввода кода
                    setIsTimerActive(false); // Сброс таймера
                    setPassword('');
                    setConfirmPassword('');
                    return;
                }

                setShowCodeInput(false); // Скрываем поле для ввода кода
                setIsTimerActive(false); // Сброс таймера
                setIsConfirmEmailMode(false); // Сброс режима подтверждения почты
                setIsRegisterMode(false); // Режим регистрации выключен
                setConfirmationCode(''); // Очистка кода
                setUserId(null); // Сброс userId
                setShowContinueButton(true); // Главная кнопка формы

                if (isRecoveryMode) return; // Если подтверждение почты произошло из режима восстановления пароля, то вход не осуществится

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
                        {
                            isRecoveryMode && !isConfirmEmailMode ? 'Восстановление доступа'
                                : isConfirmEmailMode ? 'Подтверждение Email'
                                    : isRegisterMode ? 'Регистрация'
                                        : 'Вход'
                        }
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

                    <div className={`${isConfirmEmailMode || !showContinueButton ? 'login-input-email-group-container' : ''}`}
                        style={{ marginTop: isConfirmEmailMode && !showCodeInput && !message.text ? '40px' : '', display: isNewPasswordEntryMode ? 'none' : '' }}
                    >
                        {/* Поле Email */}
                        <div className="login-input-group">
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isConfirmEmailMode || !showContinueButton ? true : false}
                                style={{ opacity: isConfirmEmailMode || !showContinueButton ? '0.5' : '' }}
                            />
                        </div>

                        {/* Кнопка выслать код или таймер */}
                        {(isConfirmEmailMode || !showContinueButton) &&
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
                    <div className="login-input-group" style={{ display: (isConfirmEmailMode || isRecoveryMode) && !isNewPasswordEntryMode ? 'none' : '' }}>
                        <div className="login-password-wrapper">
                            <input
                                type={!showPassword ? 'text' : 'password'}
                                placeholder={isNewPasswordEntryMode ? 'Новый пароль' : 'Пароль'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required={isRecoveryMode ? false : true}
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
                    {(isRegisterMode || isNewPasswordEntryMode) && (
                        <div className="login-input-group">
                            <div className="login-password-wrapper">
                                <input
                                    type={!showConfirmPassword ? 'text' : 'password'}
                                    placeholder={isNewPasswordEntryMode ? 'Повтор нового пароля' : 'Повтор пароля'}
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

                    <button type="submit" className="login-submit-button" style={{ display: (isConfirmEmailMode || !showContinueButton) && !isNewPasswordEntryMode ? 'none' : '' }}>
                        {
                            isNewPasswordEntryMode ? 'Сохранить' :
                                isRecoveryMode ? 'Продолжить' :
                                    isRegisterMode ? 'Зарегистрироваться'
                                        : 'Войти'
                        }
                    </button>

                    <div className="login-form-footer">
                        {(!isRegisterMode && !isConfirmEmailMode && !isRecoveryMode) ? (
                            <>
                                <button
                                    type="button"
                                    className="login-link"
                                    onClick={() => {
                                        setIsRecoveryMode(true)
                                        setEmail('');
                                        setPassword('');
                                    }}
                                >
                                    Забыли пароль?
                                </button>
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
                                    if (isRecoveryMode) {
                                        setEmail('');
                                        setPassword('');
                                        setIsNewPasswordEntryMode(false);
                                    }
                                    setIsRegisterMode(false);
                                    setIsConfirmEmailMode(false);
                                    setShowCodeInput(false);
                                    setIsTimerActive(false);
                                    setIsRecoveryMode(false);
                                    setShowContinueButton(true);
                                    setConfirmationCode('');
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
