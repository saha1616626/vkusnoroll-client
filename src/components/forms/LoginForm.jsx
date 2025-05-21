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
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(true);
    const [showConfirmPassword, setShowConfirmPassword] = useState(true);
    const [isRegisterMode, setIsRegisterMode] = useState(false); // Режим регистрации

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
    }, [isRegisterMode]);

    /* 
    ===========================
     Обработчики событий
    ===========================
    */

    // Кнопка авторизации
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isRegisterMode && password !== confirmPassword) {
                setError('Пароли не совпадают');
                return;
            }

            const response = isRegisterMode
                ? await api.register({ email, password })
                : await api.login({ email, password });

            if (!isRegisterMode) {
                // Сохраняем токен из куки (сервер уже установил его)
                localStorage.setItem('authUserToken', response.data.token);
                localStorage.setItem('clientId', response.data.userId)
                onLoginSuccess(); // Вызов колбэка успешной авторизации
                loadCart(); // Обновляем состав корзины при входе в учетную запись
                // Генерируем кастомное событие для обновления отображения адреса в шапке
                window.dispatchEvent(new Event('address-updated'));
            } else {
                setIsRegisterMode(false); // Переключаем обратно на вход после регистрации
                setError('Регистрация успешна! Войдите в аккаунт');
            }
        } catch (err) {
            setError(err.response.data.error); // Вывод ошибки
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
                        {isRegisterMode ? 'Регистрация' : 'Вход'}
                    </h2>

                    {error && <div className="login-form-error">{error}</div>}

                    {/* Поле Email */}
                    <div className="login-input-group">
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    {/* Поле Пароль */}
                    <div className="login-input-group">
                        <div className="login-password-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
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
                                    type={showConfirmPassword ? 'text' : 'password'}
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

                    <button type="submit" className="login-submit-button">
                        {isRegisterMode ? 'Зарегистрироваться' : 'Войти'}
                    </button>

                    <div className="login-form-footer">
                        {!isRegisterMode ? (
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
                                onClick={() => setIsRegisterMode(false)}
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
