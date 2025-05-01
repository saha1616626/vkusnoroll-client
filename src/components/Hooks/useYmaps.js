// Кастомный хук для использования Яндекс карты

import { useState, useEffect } from 'react';

export const useYmaps = () => {
    const [ymaps, setYmaps] = useState(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const API_KEY = process.env.REACT_APP_YANDEX_MAPS_API_KEY;

        // Если скрипт уже загружен, возвращаем ymaps
        if (window.ymaps && window.ymaps.ready) {
            window.ymaps.ready(() => {
                setYmaps(window.ymaps);
                setIsReady(true);
            });
            return;
        }

        // Проверка на уже запущенный процесс загрузки
        if (window.ymapsScriptLoading) return;
        window.ymapsScriptLoading = true;

        const script = document.createElement('script');
        script.src = `https://api-maps.yandex.ru/2.1/?apikey=${API_KEY}&lang=ru_RU`;
        script.async = true; // Асинхронная загрузка

        // Обработка успешной загрузки
        script.onload = () => {
            window.ymapsScriptLoading = false;
            window.ymaps.ready(() => {
                setYmaps(window.ymaps);
                setIsReady(true);
            });
        };

        // Обработка ошибок
        script.onerror = () => {
            console.error('Не удалось загрузить Яндекс.Карты');
            window.ymapsScriptLoading = false;
        };

        document.head.appendChild(script);

        return () => {
            if (script.parentNode) {
                document.head.removeChild(script);
            }
        };
    }, []);

    return { ymaps, isReady };
};