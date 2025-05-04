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
import ConfirmationModal from './../modals/ConfirmationModal';

// Стили
import "./../../styles/modals/addressModal.css";

// Импорт иконок
import crossIcon from './../../assets/icons/cross.png'; // Крестик
import moreIcon from '../../assets/icons/moreVertical.png'; // Точки вертикальные

const AddressModal = () => {

    /* 
    ===========================
     Состояния, константы и ссылки
    ===========================
    */

    const modalRef = useRef(null); // Ссылка на модальное окно "Адреса доставки"
    const menuRef = useRef(null); // Ссылка на меню для добавления и редактирования адреса
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
    const [showMenuId, setShowMenuId] = useState(null); // Меню для удаления и редактирования
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // Отображение модального окна для подтверждения удаления
    const [addressBeingDeletedId, setaAdressBeingDeletedId] = useState(null); // Идентификатор удаляемого адреса

    // Проверка авторизации. Обновляем состояние константы при запуске модального окна, чтобы при входе и выходе данные корректно отображались
    const isAuthorized = useMemo(() => !!localStorage.getItem('clientId'), [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps 
    const [isZonesLoading, setIsZonesLoading] = useState(true); // Состояние загрузки зон доставки

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
        if (!ymaps || deliveryZones.length === 0) return false;

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

    //  Геокодирование адреса (Из координат в текст)
    const reverseGeocode = useCallback(async (coordinates) => {
        try {
            const geocode = await ymaps.geocode(coordinates, {
                kind: 'house',
                results: 1
            });

            const firstGeoObject = geocode.geoObjects.get(0);
            return firstGeoObject?.getAddressLine() || '';
        } catch (error) {
            console.error('Ошибка обратного геокодирования:', error);
            addLocalNotification('Ошибка получения адреса');
            return '';
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
            // Используем координаты из БД
            const coords = [editAddress.latitude, editAddress.longitude];

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

            // Получаем адрес по координатам
            reverseGeocode(coords).then(address => {
                setSearchQuery(address);
                setEditedAddress({
                    displayName: address,
                    coordinates: coords
                });
            });
        }

    }, [mode, editAddress, reverseGeocode]);

    // Закрываем меню для удаления и редактирования адреса
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenuId(null); // Закрываем меню
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenuId]);

    // Эффект для уничтожения карты при закрытии модального окна
    useEffect(() => {
        return () => {
            if (mapRef.current) {
                mapRef.current.destroy();
                mapRef.current = null;
            }
        };
    }, []);

    /* 
    ===========================
     Управление картой
    ===========================
    */

    // Загрузка зон доставки
    const fetchDeliveryZones = useCallback(async () => {
        try {
            const zonesRes = await api.getDeliveryZones();
            setDeliveryZones(zonesRes.data.zones || []);
            setIsZonesLoading(false);
        } catch (error) {
            console.error('Ошибка загрузки зон:', error);
            addLocalNotification('Ошибка загрузки зон доставки');
            setIsZonesLoading(false);
        }
    }, [addLocalNotification]);

    // Загружаем зоны доставки только при открытом модальном окне и готовом API
    useEffect(() => {
        if (isOpen && isReady) {
            fetchDeliveryZones();
        }
    }, [isOpen, isReady, fetchDeliveryZones]);

    // Загрузка адресов
    const fetchAddresses = useCallback(async () => {
        // Ждем загрузки Яндекс.Карт и зон доставки
        if (isZonesLoading || !ymaps?.ready) return;

        try {
            // Загружаем адреса ТОЛЬКО в режиме list
            if (mode === 'list') {
                let loadedAddresses = [];

                // Загрузка адресов
                if (isAuthorized) {
                    const addressesRes = await api.getDeliveryAddressesByIdClient(localStorage.getItem('clientId'));
                    loadedAddresses = addressesRes.data.map(addr => ({
                        ...addr,
                        latitude: addr.latitude,
                        longitude: addr.longitude
                    }));
                } else {
                    loadedAddresses = JSON.parse(localStorage.getItem('guestAddresses') || []);
                }

                // Убираем проверку валидности
                const sortedAddresses = loadedAddresses.sort((a, b) => b.id - a.id);

                // Установка выбранного адреса
                if (isAuthorized) {
                    const savedAddressId = localStorage.getItem('SelectedDefaultAddressIdAuthorizedUser');
                    const targetAddress = sortedAddresses.find(addr =>
                        addr.id.toString() === savedAddressId?.toString()
                    );
                    setSelectedAddress(sortedAddresses.length > 0 ? (targetAddress || sortedAddresses[0]) : null);
                } else {
                    const savedAddress = JSON.parse(localStorage.getItem('SelectedDefaultAddressUnAuthorizedUser'));
                    setSelectedAddress(sortedAddresses.length > 0 ? (savedAddress || sortedAddresses[0]) : null);
                }

                setAddresses(sortedAddresses);

                // Удаляем метку, если адреса отсутствуют
                if (sortedAddresses?.length < 1 && mapRef.current) {
                    // Удаляем все метки если адрес сброшен
                    mapRef.current.geoObjects.removeAll((geoObject) => {
                        return geoObject instanceof ymaps.Placemark;
                    });
                }

                // Центрируем карту по зонам доставки
                if (deliveryZones?.length > 0 && mapRef.current) {
                    const bounds = ymaps.util.bounds.fromPoints(
                        deliveryZones.flatMap(zone => zone.coordinates)
                    );
                    mapRef.current.map.setBounds(bounds);
                }
            }

        } catch (error) {
            console.error('Ошибка загрузки:', error);
            addLocalNotification('Не удалось загрузить данные');
        }
    }, [addLocalNotification, mode, ymaps, isAuthorized, deliveryZones, isZonesLoading]);

    // Загрузка адресов пользователя и зон доставки
    useEffect(() => {
        if (isOpen) fetchAddresses();
    }, [fetchAddresses, isOpen]);

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
        if (!ymaps) return; // Проверяем загрузку API карт

        if (!selectedAddress && mapRef.current) {
            // Генерируем кастомное событие для обновления отображения адреса в шапке
            window.dispatchEvent(new Event('address-updated'));

            // Удаляем все метки если адрес сброшен
            mapRef.current.geoObjects.removeAll((geoObject) => {
                return geoObject instanceof ymaps.Placemark;
            });
            return;
        }

        // Проверяем наличие координат в выбранном адресе
        if (!selectedAddress?.latitude || !selectedAddress?.longitude) {
            console.error('Выбранный адрес не содержит координат');
            return;
        }

        const coordinates = [selectedAddress.latitude, selectedAddress.longitude];

        // Обновляем состояние с координатами
        setEditedAddress({
            displayName: selectedAddress.displayName || `${selectedAddress.city}, ${selectedAddress.street} ${selectedAddress.house}`,
            coordinates
        });

        // Обновляем позицию карты
        if (mapRef.current) {
            mapRef.current.setCenter(coordinates, 17, {
                duration: 1000,
                checkZoomRange: true,
                timingFunction: 'ease-in-out'
            });

            // Обновляем метку
            mapRef.current.geoObjects.removeAll((geoObject) => {
                return geoObject instanceof ymaps.Placemark;
            });

            const placemark = new ymaps.Placemark(
                coordinates,
                { balloonContent: selectedAddress.displayName },
                { preset: 'islands#redIcon' }
            );
            mapRef.current.geoObjects.add(placemark);
        }


        // Сохранение в локальное хранилище
        if (isAuthorized) { // Авторизованный пользователь
            localStorage.setItem('SelectedDefaultAddressIdAuthorizedUser', selectedAddress.id);
        } else {
            localStorage.setItem(
                'SelectedDefaultAddressUnAuthorizedUser',
                JSON.stringify({
                    ...selectedAddress,
                    coordinates // Добавляем координаты для гостей
                })
            );
        }

        // Генерируем кастомное событие для обновления отображения адреса в шапке
        window.dispatchEvent(new Event('address-updated'));

    }, [selectedAddress, ymaps, isAuthorized]);

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
            const firstGeoObject = geocode.geoObjects.get(0);

            // Проверка наличия результатов
            if (!firstGeoObject) {
                throw new Error('Адрес не найден');
            }

            const addressComponents = firstGeoObject.properties.get('metaDataProperty.GeocoderMetaData.Address.Components');

            const newFormData = {
                city: addressComponents.find(c => c.kind === 'locality')?.name || '',
                street: addressComponents.find(c => c.kind === 'street')?.name || addressComponents.find(c => c.kind === 'district')?.name || '',
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
                    const address = await reverseGeocode(coordinates);

                    // Дополнительное геокодирование для получения компонентов
                    const geocode = await ymaps.geocode(address, { results: 1 });
                    const firstGeoObject = geocode.geoObjects.get(0);

                    if (!firstGeoObject) {
                        throw new Error('Адрес не найден');
                    }

                    // Центрируем карту на координатах из БД
                    if (mapRef.current) {
                        mapRef.current.setCenter(coordinates, 17, {
                            duration: 1000,
                            checkZoomRange: true,
                            timingFunction: 'ease-in-out'
                        });
                    }

                    const addressComponents = firstGeoObject.properties.get('metaDataProperty.GeocoderMetaData.Address.Components');

                    const newFormData = {
                        city: addressComponents.find(c => c.kind === 'locality')?.name || '',
                        street: addressComponents.find(c => c.kind === 'street')?.name || addressComponents.find(c => c.kind === 'district')?.name || '',
                        house: addressComponents.find(c => c.kind === 'house')?.name || '',
                        isPrivateHome: false, // Сохраняем текущее значение
                        entrance: formData.entrance,
                        floor: formData.floor,
                        apartment: formData.apartment,
                        comment: formData.comment
                    };

                    // Обновляем состояние
                    setFormData(newFormData);
                    setSearchQuery(address);
                    setEditedAddress({ displayName: address, coordinates });
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
    }, [addLocalNotification, isOpen, isReady, mode, reverseGeocode, ymaps]); // eslint-disable-line react-hooks/exhaustive-deps 

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
            if (
                isOpen &&
                modalRef.current &&
                !modalRef.current.contains(event.target) &&
                !event.target.closest('.confirmation-modal-overlay') // Проверяем что клик не по окну подтверждения удаления
            ) {
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
            // Проверяем, что координаты соответствуют формату
            const [latitude, longitude] = editedAddress.coordinates;

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
                latitude,
                longitude
            };

            if (isAuthorized) { // Авторизованный пользователь
                // Вызов API
                let response;
                if (mode === 'create') {
                    response = await api.createDeliveryAddress(dataToSend);
                    setSelectedAddress(response.data);
                } else if (mode === 'edit' && editAddress?.id) {
                    response = await api.updateDeliveryAddress(editAddress.id, dataToSend);
                } else {
                    throw new Error('Ошибка режима сохранения');
                }
            } else { // Гость

                // Подготовка данных
                const newAddress = {
                    accountId: null,
                    id: Date.now(), // Генерируем временный ID (Необходимо для обновления)
                    ...dataToSend,
                    coordinates: editedAddress.coordinates,
                    displayName: editedAddress.displayName
                };

                const guestAddresses = JSON.parse(localStorage.getItem('guestAddresses') || '[]');

                // В режиме редактирования обновляем данные, а в режиме добавления вносим новый адрес
                const updatedAddresses = mode === 'edit'
                    ? guestAddresses.map(addr => addr.id === editAddress.id ? newAddress : addr)
                    : [...guestAddresses, newAddress];

                // Сохраняем адреса
                localStorage.setItem('guestAddresses', JSON.stringify(updatedAddresses));

                // Обновляем новый выбранный адрес
                if (mode === 'create') {
                    setSelectedAddress(newAddress);
                    localStorage.setItem('SelectedDefaultAddressUnAuthorizedUser', JSON.stringify(newAddress));
                }

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

    // Обработчик вызова модального окна для подтверждения удаления времени
    const handleDeleteInit = async (addressId) => {
        setShowDeleteConfirm(true); // Запуск модального окна
        setaAdressBeingDeletedId(addressId); // Передача id
    }

    // Обработчик подтверждения удаления адреса в модальном окне
    const handleConfirmDelete = async () => {
        try {
            if (!addressBeingDeletedId) return;

            if (isAuthorized) { // Авторизованный пользователь
                await api.deleteDeliveryAddress(addressBeingDeletedId);
            } else { // Гость
                const guestAddresses = JSON.parse(localStorage.getItem('guestAddresses') || '[]');
                const updatedAddresses = guestAddresses.filter(addr => addr.id !== addressBeingDeletedId);
                localStorage.setItem('guestAddresses', JSON.stringify(updatedAddresses));

                // Проверяем наличие адресов
                if (updatedAddresses.length === 0) {
                    setSelectedAddress(null);
                    localStorage.removeItem('SelectedDefaultAddressUnAuthorizedUser');
                }

                // Если удаляемый адрес был выбранным - сбрасываем выбор
                if (selectedAddress?.id === addressBeingDeletedId) {
                    localStorage.removeItem('SelectedDefaultAddressUnAuthorizedUser');
                    setSelectedAddress(null);
                }
            }

            await fetchAddresses(); // Обновление данных
            addLocalNotification('Адрес успешно удален');
        } catch (error) {
            addLocalNotification('Ошибка при удалении адреса');
            console.error('Ошибка удаления:', error);
            await fetchAddresses(); // Обновление данных в случае сбоя
        } finally {
            setShowDeleteConfirm(false); // После выполнения удаления закрываем модальное окно
        }
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
                                        <div
                                            key={address.id}
                                            className="address-modal-address-card"
                                            onClick={() => setSelectedAddress(address)}
                                        >
                                            <div className="address-modal-radio-wrapper">
                                                <input
                                                    type="radio"
                                                    checked={selectedAddress?.id === address.id}
                                                    onChange={() => setSelectedAddress(address)}
                                                    disabled={false}
                                                />
                                            </div>

                                            <div style={{ width: '100%', height: '100%' }}>
                                                <div className="addresses-page-main-info" style={{ marginBottom: address.isPrivateHome ? '0rem' : '' }}>
                                                    <p className="address-modal-city-street">
                                                        {address.city}, {address.street} {address.house}
                                                        {address.isPrivateHome && (
                                                            <span className="address-modal-private-label">Частный дом</span>
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="address-modal-details" style={{ marginBottom: address.comment === null ? '0rem' : '' }}>
                                                    {address.apartment && (
                                                        <div className="address-modal-detail-item">
                                                            <span className="icon">🏢</span>
                                                            Квартира: {address.apartment}
                                                        </div>
                                                    )}

                                                    {(address.entrance || address.floor) && (
                                                        <div className="address-modal-detail-group">
                                                            {address.entrance && (
                                                                <div className="address-modal-detail-item">
                                                                    <span className="icon">🚪</span>
                                                                    Подъезд: {address.entrance}
                                                                </div>
                                                            )}
                                                            {address.floor && (
                                                                <div className="address-modal-detail-item">
                                                                    <span className="icon">🔼</span>
                                                                    Этаж: {address.floor}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {address.comment && (
                                                    <div className="address-modal-comment">
                                                        <span className="icon">📝</span>
                                                        {address.comment?.slice(0, 150)}{address.comment?.length > 150 && '...'}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="address-card-header">
                                                <button
                                                    className="address-modal-menu-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();  // Останавливаем распространение события radio
                                                        setShowMenuId(showMenuId === address.id ? null : address.id);
                                                    }}
                                                >
                                                    <img src={moreIcon} alt="Меню" width={16} />
                                                </button>

                                                {showMenuId === address.id && (
                                                    <div className="address-modal-menu" ref={menuRef}
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Останавливаем распространение события radio
                                                        }}>
                                                        <button
                                                            className="menu-item"
                                                            onClick={() => { openModal('edit', address, 'list'); setShowMenuId(null) }}
                                                        >
                                                            Редактировать
                                                        </button>
                                                        <button
                                                            className="menu-item delete"
                                                            onClick={(e) => {
                                                                e.stopPropagation(); // Предотвращаем всплытие
                                                                handleDeleteInit(address.id);
                                                                setShowMenuId(null);
                                                            }}
                                                        >
                                                            Удалить
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    <div style={{ visibility: 'hidden' }}>
                                        Мнимый блок
                                    </div>

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
                                            onChange={(e) => handleExtraFieldChange('comment', e.target.value)}
                                            style={{ padding: '10px' }} />
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

            {/* Модальное окно подтверждения удаления  */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                title={'Подтвердите удаление'}
                message={'Вы уверены, что хотите удалить выбранный адрес?'}
                onConfirm={handleConfirmDelete}
                onCancel={() => { setShowDeleteConfirm(false); }}
            />

        </div>,
        document.body // Рендерим портал в body, чтобы избежать проблем со стилями
    );

};

export default AddressModal;