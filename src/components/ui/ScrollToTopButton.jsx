// Кнопка скролла на вверх страницы

import React, { useState, useEffect } from 'react';

// Импорт стилей
import './../../styles/components/scrollToTopButton.css';

// Импорт иконок
import arrowUpIcon from './../../assets/icons/arrowUp.png'; // Стрелка вверх

const ScrollToTopButton = () => {
    const [isVisible, setIsVisible] = useState(false); // Отображние кнопки

    // Отображение кнопки при смещении скролла
    const toggleVisibility = () => {
        setIsVisible(window.pageYOffset > 300);
    };

    // Перемещение на вверх после нажатия кнопки
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    // Эффект реагирует на скролл пользователя
    useEffect(() => {
        window.addEventListener('scroll', toggleVisibility);
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    return (
        <div
            className={`scroll-to-top ${isVisible ? 'visible' : ''}`}
            onClick={scrollToTop}
        >
            <img
                src={arrowUpIcon}
                alt="arrowUp"
                style={{ cursor: 'pointer' }}
            />
        </div>
    );

};

export default ScrollToTopButton;