// Модальное окно "Адреса доставки"

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';

// Импорт компонентов
import { useYmaps } from './../Hooks/useYmaps'; // Кастомный хук для использования Яндекс карты
import api from '../../utils/api';  // API сервера
import { useNotification } from "../contexts/NotificationContext"; // Контекст Уведомления
import { useAddressModal } from '../contexts/AddressModalContext';  // Контекст модального окна "Адреса доставки"
import { useDebounce } from '../Hooks/useDebounce'; // Задержка поиска

// Стили
import "./../../styles/modals/addressModal.css";

const AddressModal = () => {

    /* 
    ===========================
     Состояния, константы и ссылки
    ===========================
    */

    const modalRef = useRef(null); // Ссылка на модальное окно "Адреса доставки"

    const { isOpen, closeModal, mode } = useAddressModal(); // Контекст управляет состоянием отображения модального окна
    const [addresses, setAddresses] = useState([]); // Список адресов клиента
    const [selectedAddress, setSelectedAddress] = useState(null); // Выбранный адрес для сохранения
    const [deliveryZones, setDeliveryZones] = useState([]); // Зоны доставки из БД
    const [formData, setFormData] = useState({ // Формат данных формы
        city: '',
        street: '',
        house: '',
        isPrivateHome: false,
        entrance: '',
        floor: '',
        apartment: '',
        comment: ''
    });
    const [suggestions, setSuggestions] = useState([]); // Выбор адреса в списке
    const { addNotification } = useNotification(); // Отображение уведомлений
    const ymaps = useYmaps(); // API янедкс карт
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
     Управление картой
    ===========================
    */

    // Загрузка адресов пользователя и зон доставки
    useEffect(() => {
        const loadData = async () => {
            try {
                const [addressesRes, zonesRes] = await Promise.all([
                    api.getDeliveryAddressesByIdClient(localStorage.getItem('clientId')),
                    api.getDeliveryZones()
                ]);

                setAddresses(addressesRes.data);
                setDeliveryZones(zonesRes.data.zones || []);

                // Центрируем карту по зонам после загрузки (если зоны есть)
                if (zonesRes.data.zones?.length > 0 && mapRef.current) {
                    const bounds = ymaps.util.bounds.fromPoints(
                        zonesRes.data.zones.flatMap(zone => zone.coordinates)
                    );
                    mapRef.current.map.setBounds(bounds);
                }
            } catch (error) {
                console.error('Ошибка загрузки:', error);
                addNotification('Не удалось загрузить данные');
            }
        };

        if (isOpen) loadData();
    }, [isOpen, addNotification, ymaps]);

    // Обработчик выбора адреса в поиске
    const handleSelectSuggestion = useCallback(async (suggestion) => {
        setSearchQuery(suggestion.displayName);
        setSuggestions([]);

        // Сохраняем выбранные координаты
        setSelectedAddress({
            displayName: suggestion.displayName,
            coordinates: suggestion.coordinates
        });

        // Обновляем координаты на карте (ТОЛЬКО МЕТКИ)
        if (mapRef.current) {
            // mapRef.current.setCenter(suggestion.coordinates, 17);

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
                isPrivateHome: formData.isPrivateHome,
                // Сброс дополнительных полей
                entrance: '',
                floor: '',
                apartment: '',
                comment: ''
            };
            setFormData(newFormData);
        } catch (error) {
            console.error('Ошибка геокодирования:', error);
            addNotification('Не удалось определить детали адреса');
        }
    }, [ymaps, addNotification, formData.isPrivateHome]);

    // Эффект для инициализации карты (без полигонов)
    useEffect(() => {
        if (!ymaps || !isOpen || !document.getElementById('address-modal-map')) return; // Если карта не загружена или окно не открыто

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
                        addNotification('Адрес не найден');
                        return;
                    }

                    const firstGeoObject = res.geoObjects.get(0);
                    const address = firstGeoObject.getAddressLine();

                    // Дополнительная проверка компонентов адреса
                    const components = firstGeoObject.properties.get('metaDataProperty.GeocoderMetaData.Address.Components');
                    if (!components) {
                        addNotification('Не удалось разобрать адрес');
                        return;
                    }

                    // Обновляем состояние
                    setSearchQuery(address);
                    handleSelectSuggestion({
                        displayName: address,
                        coordinates: coordinates
                    });

                    // Обновляем состояние выбранного адреса
                    setSelectedAddress({
                        displayName: address,
                        coordinates: coordinates
                    });

                } catch (error) {
                    console.error('Ошибка обработки клика:', error);
                    addNotification('Ошибка определения адреса');
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
    }, [ymaps, isOpen, addNotification, handleSelectSuggestion, deliveryZones]);

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
            if (selectedAddress) {
                const placemark = new ymaps.Placemark(
                    selectedAddress.coordinates,
                    { balloonContent: selectedAddress.displayName },
                    { preset: 'islands#redIcon' }
                );
                mapRef.current.geoObjects.add(placemark);
            }
        });
    }, [deliveryZones, ymaps, selectedAddress, POLYGON_STYLE]); // Добавляем полигоны при изменении зон

    // Закрываем модальное окно при клике на фон
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                closeModal(); // Закрываем меню
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [closeModal]);

    // Убираем скролл с перекрытой страницы
    useEffect(() => {
        if (isOpen) document.body.classList.add('no-scroll');
        if (closeModal) return () => document.body.classList.remove('no-scroll');
    }, [isOpen, closeModal]);

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
    }, [debouncedSearchQuery, handleAddressSearch]);


    // Валидация зоны доставки
    const validateDeliveryZone = async (coordinates) => {
        if (!ymaps) return false; // Если карта недоступна, значит, зону нельзя выбрать

        // ymaps.ready(() => {
            try {
                // Проверяем все зоны
                return deliveryZones.some(zone => {
                    if (!Array.isArray(zone.coordinates) || zone.coordinates.length < 3) { // Проверка структуры данных
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
                    mapRef.current.geoObjects.add(polygon);

                    // Явная проверка принадлежности точки
                    const contains = polygon.geometry.contains(coordinates);
                    console.log('Zone check:', zone.id, 'contains', coordinates, '->', contains);
                    return contains;
                });
            } catch (e) {
                console.error('Ошибка проверки зоны:', e);
                return false;
            }
        // });
    };

    // Сохранение адреса
    const handleSaveAddress = async () => {
        if (!selectedAddress?.coordinates) {
            addNotification('Выберите адрес на карте');
            return;
        }

        const isValid = await validateDeliveryZone(selectedAddress.coordinates);
        if (!isValid) {
            addNotification('Адрес находится вне зоны доставки');
            return;
        }

        try {
            setIsSaving(true);

            // // Формируем объект адреса
            // const addressData = {
            //     ...formData,
            //     coordinates: selectedAddress.coordinates,
            //     clientId: localStorage.getItem('clientId')
            // };

            // // Отправляем на сервер
            // const response = await api.saveDeliveryAddress(addressData);

            // // Обновляем список адресов
            // setAddresses(prev => [...prev, response.data]);

            addNotification('Адрес успешно сохранен', 'success');
            closeModal();
            // mode('list'); // Возвращаемся в режим списка

        } catch (error) {
            console.error('Ошибка сохранения:', error);
            addNotification('Не удалось сохранить адрес');
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

    return ReactDOM.createPortal(
        <div className={`address-modal-overlay ${isOpen ? 'active' : ''}`}>
            <div className="address-modal-container" ref={modalRef}>
                <div className="address-modal-sidebar">
                    {mode === 'list' ? (
                        <>
                            <button
                                className="address-modal-add-btn"
                                onClick={() => mode('create')}
                            >
                                + Новый адрес
                            </button>

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
                                            <button onClick={() => mode('edit')}>Изменить</button>
                                            <button onClick={() => handleDelete(address.id)}>Удалить</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : (
                        <div className="address-modal-form">
                            <div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Введите адрес..."
                                />

                                {suggestions.length > 0 && (
                                    <div className="suggestions-list">
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
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={formData.isPrivateHome}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                isPrivateHome: e.target.checked
                                            }))}
                                        />
                                        Частный дом
                                    </label>

                                    {formData.isPrivateHome && (
                                        <>
                                            <input
                                                placeholder="Подъезд"
                                                value={formData.entrance}
                                                onChange={(e) => handleExtraFieldChange('entrance', e.target.value)}
                                            />
                                            <input
                                                placeholder="Этаж"
                                                value={formData.entrance}
                                                onChange={(e) => handleExtraFieldChange('floor', e.target.value)}
                                            />
                                            <input
                                                placeholder="Квартира"
                                                value={formData.entrance}
                                                onChange={(e) => handleExtraFieldChange('apartment', e.target.value)}
                                            />
                                        </>
                                    )}

                                    <textarea placeholder="Комментарий" />
                                </div>
                            </div>

                            <button
                                className="address-modal-save-btn"
                                onClick={handleSaveAddress}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Сохранение...' : 'Сохранить'}
                            </button>
                        </div>
                    )}
                </div>

                <div id="address-modal-map" className="address-modal-map" />
            </div>
        </div>,
        document.body // Рендерим портал в body, чтобы избежать проблем со стилями
    );

};

export default AddressModal;