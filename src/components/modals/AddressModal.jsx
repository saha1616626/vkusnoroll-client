// Модальное окно "Адреса доставки"

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';

// Импорт компонентов
import { useYmaps } from './../Hooks/useYmaps'; // Кастомный хук для использования Яндекс карты
import api from '../../utils/api';  // API сервера
import { useNotification } from "../contexts/NotificationContext"; // Контекст Уведомления
import { useAddressModal } from '../contexts/AddressModalContext';  // Контекст модального окна "Адреса доставки"
import { useDebounce } from '../Hooks/useDebounce'; // Задержка поиска

// Стили
import "./../../styles/modals/addressModal.css";

// Импорт иконок
import crossIcon from './../../assets/icons/cross.png'; // Крестик

const AddressModal = () => {

    /* 
    ===========================
     Состояния, константы и ссылки
    ===========================
    */

    const modalRef = useRef(null); // Ссылка на модальное окно "Адреса доставки"
    const navigate = useNavigate(); // Для управления маршрутом приложения

    const { isOpen, closeModal, mode, openModal, editAddress, previousMode } = useAddressModal(); // Контекст управляет состоянием отображения модального окна
    const [addresses, setAddresses] = useState([]); // Список адресов клиента
    const [editedAddress, setEditedAddress] = useState(null); // Редактируемый адрес
    const [selectedAddress, setSelectedAddress] = useState(null); // Выбранный адрес в списке
    const [deliveryZones, setDeliveryZones] = useState([]); // Зоны доставки из БД
    const [formData, setFormData] = useState([]); // Поля формы
    const [suggestions, setSuggestions] = useState([]); // Выбор адреса в списке
    const [suggestionsShow, setSuggestionsShow] = useState(false); // Отображение подсказки при вводе
    const { addNotification } = useNotification(); // Отображение уведомлений глобально
    const [localNotifications, setLocalNotifications] = useState([]); // Отображение уведомлений внутри модального окна
    const { ymaps, isReady } = useYmaps(); // API янедкс карт
    const mapRef = useRef(null);  // Хранит экземпляр карты и DOM элемент после создания карты

    const [searchQuery, setSearchQuery] = useState(''); // Запрос для поиска адреса
    const debouncedSearchQuery = useDebounce(searchQuery, 500); // Задержка перед поиском адреса в карте

    // Стиль полигона
    const POLYGON_STYLE = useMemo(() => ({
        fillColor: '#0066ff22',
        fillOpacity: 0.4,       // Прозрачность заливки
        strokeColor: '#20b92d',
        strokeWidth: 1,
        interactivityModel: 'default#transparent'
    }), []);

    const [isSaving, setIsSaving] = useState(false); // Статус сохранения адреса

    /* 
    ===========================
     Настройка страницы
    ===========================
    */

    // Функция для добавления локальных уведомлений
    const addLocalNotification = useCallback((message, type = 'info') => {
        const id = Date.now();
        setLocalNotifications(prev => [...prev, { id, message, type }]);

        setTimeout(() => {
            setLocalNotifications(prev => prev.filter(n => n.id !== id));
        }, 3000);
    }, []);

    // Валидация зоны доставки
    const validateDeliveryZone = useCallback(async (coordinates) => {
        if (!ymaps) return false;

        try {
            // Создаем временный массив для хранения созданных полигонов
            const tempPolygons = [];

            const isValid = deliveryZones.some(zone => {
                if (!Array.isArray(zone.coordinates) || zone.coordinates.length < 3) {
                    console.error('Некорректные координаты зоны:', zone);
                    return false;
                }

                // Создаем полигон
                const polygon = new ymaps.Polygon([zone.coordinates], {}, {
                    fillOpacity: 0.001,
                    strokeWidth: 0
                });

                if (!polygon.geometry) {
                    console.error('Невозможно создать геометрию полигона');
                    return false;
                }

                // Добавляем полигон во временный массив и на карту
                tempPolygons.push(polygon);
                mapRef.current.geoObjects.add(polygon);

                // Проверка принадлежности точки
                return polygon.geometry.contains(coordinates);
            });

            // Удаляем все временные полигоны после проверки
            tempPolygons.forEach(polygon => {
                mapRef.current.geoObjects.remove(polygon);
            });

            return isValid;

        } catch (e) {
            console.error('Ошибка проверки зоны:', e);
            return false;
        }
    }, [deliveryZones, ymaps]);

    // Геокодирование адреса (Из текста в координаты)
    const geocodeAddress = useCallback(async (address) => {
        try {
            const geocode = await ymaps.geocode(address, { results: 1 });
            const firstGeoObject = geocode.geoObjects.get(0);

            if (!firstGeoObject) {
                addLocalNotification('Адрес не найден');
                return;
            }

            const coordinates = firstGeoObject.geometry.getCoordinates();
            const displayName = firstGeoObject.getAddressLine();

            setEditedAddress({ displayName, coordinates });
            setSearchQuery(displayName);

            // Обновляем карту
            if (mapRef.current) {
                mapRef.current.setCenter(coordinates, 17, {
                    duration: 1000, // Продолжительность анимации в миллисекундах
                    checkZoomRange: true,
                    timingFunction: 'ease-in-out'
                });
            }
        } catch (error) {
            console.error('Ошибка геокодирования:', error);
            addLocalNotification('Ошибка определения координат');
        }
    }, [ymaps, addLocalNotification]);

    // Инициализация компонента при монтировании и размонтировани
    useEffect(() => {
        if (mode === 'create') { // В режиме редактирования очищаем поля
            setFormData({
                city: '',
                street: '',
                house: '',
                isPrivateHome: false,
                entrance: '',
                floor: '',
                apartment: '',
                comment: ''
            }); // Сбрасываем поля в режиме добавления
            setSearchQuery(''); // Поиск
            setSuggestions([]); // Очищаем список адресов в подсказе поиска
            setEditedAddress(null); // Выбранный адрес
        }

        if (mode === 'edit' && editAddress) { // В режиме редактирования при наличии передаваемого адреса вставляем выбранный адрес

            // Устанавливаем данные формы из редактируемого адреса
            setFormData({
                city: editAddress.city,
                street: editAddress.street,
                house: editAddress.house,
                isPrivateHome: editAddress.isPrivateHome,
                entrance: editAddress.entrance || '',
                floor: editAddress.floor || '',
                apartment: editAddress.apartment || '',
                comment: editAddress.comment || ''
            });

            // Формируем полный адрес для поиска
            const fullAddress = `${editAddress.city}, ${editAddress.street} ${editAddress.house}`;
            setSearchQuery(fullAddress);

            // Геокодирование адреса при отсутствии координат
            geocodeAddress(fullAddress);

            setSuggestions([]); // Очищаем список адресов в подсказе поиска
        }

    }, [mode, editAddress, geocodeAddress]);

    /* 
    ===========================
     Управление картой
    ===========================
    */

    // Загрузка адресов пользователя и зон доставки
    useEffect(() => {
        const loadData = async () => {
            try {
                // Всегда загружаем зоны доставки
                const zonesRes = await api.getDeliveryZones();
                setDeliveryZones(zonesRes.data.zones || []);

                // Загружаем адреса ТОЛЬКО в режиме list
                if (mode === 'list') {
                    const addressesRes = await api.getDeliveryAddressesByIdClient(localStorage.getItem('clientId'));
                    setAddresses(addressesRes.data.sort((a, b) => b.id - a.id) || []);

                    // Устанавливаем выбранный адрес
                    if (addressesRes.data.length > 0) {
                        const savedAddressId = localStorage.getItem('AddressIdAuthorizedUser');
                        const targetAddress = addressesRes.data.find(addr =>
                            addr.id.toString() === savedAddressId?.toString()
                        );
                        setSelectedAddress(targetAddress || addressesRes.data[0]);
                    }
                }

                // Центрируем карту по зонам доставки
                if (zonesRes.data.zones?.length > 0 && mapRef.current) {
                    const bounds = ymaps.util.bounds.fromPoints(
                        zonesRes.data.zones.flatMap(zone => zone.coordinates)
                    );
                    mapRef.current.map.setBounds(bounds);
                }

            } catch (error) {
                console.error('Ошибка загрузки:', error);
                addLocalNotification('Не удалось загрузить данные');
            }
        };

        if (isOpen) loadData();
    }, [isOpen, ymaps, addLocalNotification, mode]);

    // Сброс выбранного адреса при закрытии
    useEffect(() => {
        if (!isOpen) {
            setSelectedAddress(null);
            setSearchQuery(''); // Поиск
            setSuggestions([]); // Очищаем список адресов в подсказе поиска
        }
    }, [isOpen]);

    // Выбор адреса
    useEffect(() => {
        if (!selectedAddress || !ymaps) return; // Проверяем наличие адреса и загрузку API

        // Дополнительная проверка на случай, если адрес был сброшен
        if (!selectedAddress?.city || !selectedAddress?.street || !selectedAddress?.house) return;

        const fullAddress = `${selectedAddress.city}, ${selectedAddress.street} ${selectedAddress.house}`;
        geocodeAddress(fullAddress);

        const clientId = localStorage.getItem('clientId');
        if (!!clientId) {
            // Сохраняем в локальное хранилище выбранный адрес
            localStorage.setItem('AddressIdAuthorizedUser', selectedAddress.id)
        }
    }, [selectedAddress, geocodeAddress, ymaps]);

    // Обработчик выбора адреса в поиске
    const handleSelectSuggestion = useCallback(async (suggestion) => {

        setSearchQuery(suggestion.displayName);
        setSuggestions([]); // Очищаем список адресов в подсказе поиска

        // Сохраняем выбранные координаты
        setEditedAddress({
            displayName: suggestion.displayName,
            coordinates: suggestion.coordinates
        });

        // Обновляем координаты на карте (ТОЛЬКО МЕТКИ)
        if (mapRef.current) {
            mapRef.current.setCenter(suggestion.coordinates, 17, {
                duration: 1000, // Продолжительность анимации в миллисекундах
                checkZoomRange: true,
                timingFunction: 'ease-in-out'
            });

            // Удаляем только метки, сохраняя полигоны
            mapRef.current.geoObjects.removeAll((geoObject) => {
                return geoObject instanceof ymaps.Placemark;
            });

            // Добавляем метку с контентом
            const placemark = new ymaps.Placemark(
                suggestion.coordinates,
                { balloonContent: suggestion.displayName }, // Балун с адресом
                { preset: 'islands#redIcon' } // Стиль иконки
            );
            mapRef.current.geoObjects.add(placemark);
        }

        try {
            // Парсим адресные компоненты
            await ymaps.ready();
            const geocode = await ymaps.geocode(suggestion.displayName, { results: 1 }); // Ограничение количества результатов геокодирования

            // Проверка наличия результатов
            if (!geocode.geoObjects.get(0)) {
                throw new Error('Адрес не найден');
            }

            const addressComponents = geocode.geoObjects.get(0).properties.get('metaDataProperty.GeocoderMetaData.Address.Components');

            const newFormData = {
                city: addressComponents.find(c => c.kind === 'locality')?.name || '',
                street: addressComponents.find(c => c.kind === 'street')?.name || '',
                house: addressComponents.find(c => c.kind === 'house')?.name || '',
                isPrivateHome: false,
                // Сброс дополнительных полей
                entrance: '',
                floor: '',
                apartment: '',
                comment: ''
            };
            setFormData(newFormData);
        } catch (error) {
            console.error('Ошибка геокодирования:', error);
            addLocalNotification('Не удалось определить детали адреса');
        }
    }, [ymaps, addLocalNotification]);

    // Эффект для инициализации карты (без полигонов)
    useEffect(() => {
        if (!ymaps || !isReady || !isOpen || !document.getElementById('address-modal-map')) return; // Если карта не загружена или окно не открыто

        // Устанавливаем карту
        ymaps.ready(() => {
            // Уничтожаем предыдущую карту, если она существует
            if (mapRef.current) mapRef.current.destroy();

            // Создаем новую карту и сохраняем в ref
            const newMap = new ymaps.Map('address-modal-map', {
                center: [56.129057, 40.406635],
                zoom: 12.5,
                controls: ['zoomControl']
            });

            // Обработчик клика по карте
            const clickListener = async (e) => {
                try {
                    if (mode === 'list') return; // Нельзя поставить маркер в режиме "list"

                    const coordinates = e.get('coords');

                    // Проверка формата координат
                    if (!Array.isArray(coordinates)) {
                        throw new Error('Некорректные координаты');
                    }

                    // Явно указываем параметры геокодирования
                    const res = await ymaps.geocode(coordinates, {
                        kind: 'house', // Поиск только домов
                        results: 1, // Ограничение количества результатов 
                        boundedBy: mapRef.current.map.getBounds() // Поиск в текущей области карты
                    });

                    // Проверяем наличие результатов
                    if (!res.geoObjects || res.geoObjects.getLength() === 0) {
                        addLocalNotification('Адрес не найден');
                        return;
                    }

                    const firstGeoObject = res.geoObjects.get(0);
                    const address = firstGeoObject.getAddressLine();

                    // Дополнительная проверка компонентов адреса
                    const components = firstGeoObject.properties.get('metaDataProperty.GeocoderMetaData.Address.Components');
                    if (!components) {
                        addLocalNotification('Не удалось разобрать адрес');
                        return;
                    }

                    // Обновляем состояние
                    setSearchQuery(address);
                    handleSelectSuggestion({
                        displayName: address,
                        coordinates: coordinates
                    });

                    // Обновляем состояние выбранного адреса
                    setEditedAddress({
                        displayName: address,
                        coordinates: coordinates
                    });
                } catch (error) {
                    console.error('Ошибка обработки клика:', error);
                    addLocalNotification('Ошибка определения адреса');
                }
            };

            newMap.events.add('click', clickListener); // Добавляем слушатель

            // Добавляем объекты карты в ref
            mapRef.current = {
                map: newMap,
                geoObjects: newMap.geoObjects,
                events: newMap.events,
                setCenter: newMap.setCenter.bind(newMap),
                destroy: () => {
                    newMap.events.remove('click', clickListener);
                    newMap.destroy();
                }
            };
        });
    }, [ymaps, isReady, isOpen, addLocalNotification, handleSelectSuggestion, deliveryZones, mode]);

    // Эффект для отрисовки/обновления полигонов при изменении deliveryZones
    useEffect(() => {
        if (!ymaps || !mapRef.current) return;

        // Ожидаем полной инициализации API Яндекс.Карт
        ymaps.ready(() => {
            // Удаляем только полигоны перед повторной отрисовкой (Чтобы не удалить метки)
            mapRef.current.geoObjects.removeAll((geoObject) => {
                return geoObject instanceof ymaps.Polygon;
            });

            // Добавляем новые полигоны
            deliveryZones.forEach(zone => {
                try {
                    if (!Array.isArray(zone.coordinates)) {
                        console.error('Некорректные координаты для зоны:', zone);
                        return;
                    }

                    const polygon = new ymaps.Polygon([zone.coordinates],
                        { hintContent: 'Зона доставки' },
                        {
                            ...POLYGON_STYLE
                        });
                    mapRef.current.geoObjects.add(polygon);
                } catch (e) {
                    console.error('Ошибка создания полигона:', e);
                }
            });

            // Восстанавливаем метку если есть выбранный адрес (при перерисовке)
            if (editedAddress) {
                const placemark = new ymaps.Placemark(
                    editedAddress.coordinates,
                    { balloonContent: editedAddress.displayName },
                    { preset: 'islands#redIcon' }
                );
                mapRef.current.geoObjects.add(placemark);
            }
        });
    }, [deliveryZones, ymaps, editedAddress, POLYGON_STYLE]); // Добавляем полигоны при изменении зон

    // Закрываем модальное окно при клике на фон
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isOpen && modalRef.current && !modalRef.current.contains(event.target)) {
                closeModal(); // Закрываем меню
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [closeModal, isOpen]);

    // Убираем скролл с перекрытой страницы
    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('no-scroll');
            return () => document.body.classList.remove('no-scroll');
        }
    }, [isOpen]);

    // Закрываем модальное окно при нажатии на Escape
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key === 'Escape') closeModal(); // Закрыть окно при нажатии кнопки "Escape"
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [closeModal]);

    /* 
    ===========================
     Обработчики событий
    ===========================
    */

    // Обработчик поиска адреса
    const handleAddressSearch = useCallback(async (query) => {
        try {
            await ymaps.ready();
            const res = await ymaps.geocode(query, {
                boundedBy: mapRef.current?.map.getBounds(),
                results: 5 // Ограничение количества результатов 
            });

            // Обработка ответа
            const suggestions = res.geoObjects.toArray().map(item => ({
                displayName: item.getAddressLine(),
                coordinates: item.geometry.getCoordinates()
            }));

            setSuggestions(suggestions);
        } catch (error) {
            console.error('Ошибка геокодера:', error);
        }
    }, [ymaps]);

    // Эффект для обработки поиска с debounce (Задержка)
    useEffect(() => {
        if (debouncedSearchQuery) {
            handleAddressSearch(debouncedSearchQuery);
        }
    }, [debouncedSearchQuery, handleAddressSearch, searchQuery, editedAddress]);

    // Сохранение адреса
    const handleSaveAddress = async () => {
        if (!editedAddress?.coordinates) {
            addLocalNotification('Выберите адрес на карте или введите запрос');
            return;
        }

        const isValid = await validateDeliveryZone(editedAddress.coordinates);
        if (!isValid) {
            addLocalNotification('Адрес находится вне зоны доставки');
            return;
        }

        // Проверка обязательных полей: город, улица, дом
        if (!formData.city?.trim() || !formData.street?.trim() || !formData.house?.trim()) {
            addLocalNotification('Заполните город, улицу и дом');
            return;
        }

        // Если isPrivateHome === false, проверяем дополнительные поля
        if (!formData.isPrivateHome) {
            const requiredFields = ['entrance', 'floor', 'apartment'];
            const missingFields = requiredFields.filter(field => !formData[field]?.trim());
            if (missingFields.length > 0) {
                addLocalNotification('Заполните подъезд, этаж и квартиру');
                return;
            }
        }

        try {
            // Подготовка данных для отправки
            const dataToSend = {
                accountId: localStorage.getItem('clientId'),
                city: formData.city.trim(),
                street: formData.street.trim(),
                house: formData.house.trim(),
                isPrivateHome: formData.isPrivateHome,
                entrance: formData.entrance?.trim() || null,
                floor: formData.floor?.trim() || null,
                apartment: formData.apartment?.trim() || null,
                comment: formData.comment?.trim() || null,
            };

            // Вызов API
            let response;
            if (mode === 'create') {
                response = await api.createDeliveryAddress(dataToSend);
            } else if (mode === 'edit' && editAddress?.id) {
                response = await api.updateDeliveryAddress(editAddress.id, dataToSend);
            } else {
                throw new Error('Ошибка режима сохранения');
            }

            setIsSaving(true);

            if (previousMode === null) { // Если предыдущий режим работы модального окна "null", значит выходим из модального окна
                addNotification(mode === 'create' ? 'Адрес успешно сохранен' : 'Адрес успешно обновлен', 'success');
                closeModal();
                navigate('/personal-account/addresses', { replace: true }); // Перезагрузка страницы с обновлением данных
            }

            if (previousMode === 'list') { // Если предыдущий режим работы модального окна "list", значит переходим в список
                addLocalNotification('Адрес успешно сохранен');
                openModal('list'); // Возвращаемся в режим списка
            }

        } catch (error) {
            console.error('Ошибка сохранения:', error);
            addLocalNotification(error.response.data.error || 'Не удалось сохранить адрес');
        } finally {
            setIsSaving(false);
        }
    };

    // Удаление адреса
    const handleDelete = (addressId) => {

    }

    // Обработчик изменений в полях
    const handleExtraFieldChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    /* 
    ===========================
     Рендер
    ===========================
    */

    return isOpen && ReactDOM.createPortal(
        <div className={`address-modal-overlay ${isOpen ? 'active' : ''}`}>
            <div className="address-modal-container" ref={modalRef}>
                <button
                    onClick={() => closeModal()}
                    className="address-modal-close-button"
                    aria-label="Закрыть форму"
                >
                    <img src={crossIcon} alt="Cross" />
                </button>
                <div className="address-modal-sidebar">
                    {mode === 'list' ? (
                        <>
                            <button
                                className="address-modal-add-btn"
                                onClick={() => {
                                    openModal('create', null, 'list');
                                }}
                            >
                                Новый адрес
                            </button>

                            {addresses.length === 0 ? (
                                <div className="address-modal-empty">Добавьте Ваш первый адрес</div>
                            ) : (
                                <div style={{ height: '0' }}>
                                    {addresses.map(address => (
                                        <div key={address.id} className="address-modal-item">
                                            <input
                                                type="radio"
                                                checked={selectedAddress?.id === address.id}
                                                onChange={() => setSelectedAddress(address)}
                                            />
                                            <div className="address-modal-item-info">
                                                <p>
                                                    {address.city}, {address.street} {address.house}
                                                    {address.comment && ` (${address.comment})`}
                                                </p>
                                                <div className="address-modal-item-actions">
                                                    <button onClick={() => openModal('edit', address, 'list')}>Изменить</button>
                                                    <button onClick={() => handleDelete(address.id)}>Удалить</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                        </>
                    ) : (
                        <div className="address-modal-form">

                            <div>
                                <div className="address-modal-title">{mode === "create" ? 'Новый адрес' : 'Изменить адрес'}</div>

                                <div className="address-modal-input-group">
                                    <label>Город, улица, дом</label>
                                    <input
                                        maxLength="100"
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onFocus={() => setSuggestionsShow(true)} // При нажатии на поле открываются подсказки поиска
                                        onBlur={() => setTimeout(() => setSuggestionsShow(false), 200)}
                                        placeholder="Введите адрес..."
                                        className="address-modal-input"
                                        style={{ width: 'calc(100% - 33.6px)' }}
                                    />
                                </div>

                                {suggestionsShow && suggestions.length > 0 && (
                                    <div className="address-modal-suggestions-list">
                                        {suggestions.map((suggestion, index) => (
                                            <div
                                                key={index}
                                                className="address-modal-suggestion-item"
                                                onClick={() => handleSelectSuggestion(suggestion)}
                                            >
                                                {suggestion.displayName}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="address-modal-extra-fields">
                                    <div className="address-modal-checkbox-group">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={formData.isPrivateHome}
                                                onChange={(e) => {
                                                    e.stopPropagation(); // Предотвращает случайную активацию других обработчиков
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        isPrivateHome: e.target.checked,
                                                        entrance: '',
                                                        floor: '',
                                                        apartment: ''
                                                    }))
                                                }}
                                            />
                                            Частный дом
                                        </label>
                                    </div>

                                    {!formData.isPrivateHome && (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                                                <div className="address-modal-input-group">
                                                    <label>Подъезд</label>
                                                    <input
                                                        maxLength="10"
                                                        className="address-modal-input"
                                                        placeholder=""
                                                        value={formData.entrance}
                                                        onChange={(e) => handleExtraFieldChange('entrance', e.target.value)}
                                                    />
                                                </div>
                                                <div className="address-modal-input-group">
                                                    <label>Этаж</label>
                                                    <input
                                                        maxLength="10"
                                                        className="address-modal-input"
                                                        placeholder=""
                                                        value={formData.floor}
                                                        onChange={(e) => handleExtraFieldChange('floor', e.target.value)}
                                                    />
                                                </div>

                                                <div className="address-modal-input-group">
                                                    <label>Квартира</label>
                                                    <input
                                                        maxLength="10"
                                                        className="address-modal-input"
                                                        placeholder=""
                                                        value={formData.apartment}
                                                        onChange={(e) => handleExtraFieldChange('apartment', e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                        </>
                                    )}

                                    <div className="address-modal-input-group">
                                        <label>Комментарий</label>
                                        <textarea
                                            placeholder=""
                                            maxLength="300"
                                            value={formData.comment}
                                            onChange={(e) => handleExtraFieldChange('comment', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                display: previousMode === 'list' ? 'flex' : '',
                                gap: previousMode === 'list' ? '1.0rem' : ''
                            }}>
                                <button
                                    style={{ display: previousMode === 'list' ? '' : 'none' }}
                                    className="address-modal-back-btn"
                                    onClick={() => openModal('list')}
                                >
                                    Назад
                                </button>
                                <button
                                    className="address-modal-save-btn"
                                    onClick={handleSaveAddress}
                                    disabled={isSaving}
                                >
                                    {isSaving ? 'Сохранение...' : 'Сохранить'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div id="address-modal-map" className="address-modal-map" />
            </div>

            {/* Локальные уведомления */}
            <div className="address-modal-notifications">
                {localNotifications.map((notification) => (
                    <div
                        key={notification.id}
                        className={`address-modal-notification ${notification.type}`}
                    >
                        {notification.message}
                    </div>
                ))}
            </div>
        </div>,
        document.body // Рендерим портал в body, чтобы избежать проблем со стилями
    );

};

export default AddressModal;