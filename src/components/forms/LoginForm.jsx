// Форма авторизации

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isTokenValid } from '../../utils/auth'; // Проверка токена
import api from '../../utils/api'; // API сервера

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

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();
    const modalRef = useRef(null); // Ссылка на форму

    /* 
    ===========================
     Эффекты
    ===========================
    */

    // Авто перенаправление пользвоателя после авторизации
    useEffect(() => {
        const token = localStorage.getItem('authUserToken');
        if (isTokenValid(token)) { // Если токен валидный
            // TODO Если пользователь находится на главной странице, то перенаправляем его в личный кабинет. Если пользователь оформлял заказ, то просто скрываем окно авторизации.
        }
    }, [navigate]);

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

    /* 
    ===========================
     Обработчики событий
    ===========================
    */

    // Кнопка авторизации
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await api.login({ email, password });
            // Сохраняем токен из куки (сервер уже установил его)
            localStorage.setItem('authUserToken', response.data.token);
            localStorage.setItem('clientId', response.data.userId)
            onClose(); // Закрываем форму авторизации
            navigate('/');
        } catch (err) {
            setError('Неверный email или пароль');
        }
    };

    /* 
    ===========================
     Рендер
    ===========================
    */

    return (
        <div className="auth-overlay">
            <div className="auth-form-container" ref={modalRef}>
                <button
                    onClick={onClose}
                    className="auth-close-button"
                    aria-label="Закрыть форму"
                >
                    <img src={crossIcon} alt="Cross" />
                </button>

                <form onSubmit={handleSubmit} className="auth-form">
                    <h2 className="auth-form-title">Вход</h2>

                    {error && <div className="auth-form-error">{error}</div>}

                    <div className="auth-input-group">
                        <input
                            type="email"
                            maxLength={30}
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="auth-input-group">
                        <div className="auth-password-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                maxLength={100}
                                placeholder="Пароль"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="auth-toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                <img src={showPassword ? hiddenEyeIcon : eyeIcon} alt="Eye" className="auth-show-password-icon-button" />
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="auth-submit-button">
                        Войти
                    </button>

                    <div className="auth-form-footer">
                        <a href="/forgot-password" className="auth-link">
                            Забыли пароль?
                        </a>
                        <button
                            type="button"
                            className="auth-link auth-register-button"
                            onClick={() => navigate('/register')}
                        >
                            Регистрация
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default LoginForm;
