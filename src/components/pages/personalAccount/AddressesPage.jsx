// Личный кабинет. Страница "Адреса"
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Импорт компонентов
import api from '../../../utils/api';  // API сервера
import { useNotification } from "../../contexts/NotificationContext"; // Контекст Уведомления
import { useAddressModal } from '../../contexts/AddressModalContext'; // Контекст модального окна "Адреса доставки"

// Импорт иконок
import moreIcon from '../../../assets/icons/moreVertical.png';

// Импорт стилей
import "../../../styles/pages/personalAccount/addressesPage.css";

const AddressesPage = () => {

    /* 
    ===========================
     Состояния и ссылки
    ===========================
    */

    const modalRef = useRef(null); // Ссылка на меню для добавления и редактирования адреса

    const [addresses, setAddresses] = useState([]); // Список адресов
    const [selectedAddressId, setSelectedAddressId] = useState(null); // Выбранный адрес
    const [showMenuId, setShowMenuId] = useState(null); // Меню для удаления и редактирования
    const { addNotification } = useNotification(); // Отображение уведомлений
    const { openModal } = useAddressModal(); // Состояние для модального окна "Адреса доставки"

    /* 
    ===========================
     Эффекты
    ===========================
    */

    // Загрузка адресов клиента
    useEffect(() => {
        const fetchAddresses = async () => {
            try {
                const clientId = localStorage.getItem('clientId'); // Получаем id авторизованного пользователя
                const response = await api.getDeliveryAddressesByIdClient(clientId);
                setAddresses(response.data);
                setSelectedAddressId(response.data[0]?.id || null); // Первый адрес становится выбранным
            } catch (error) {
                console.error('Ошибка загрузки адресов:', error);
            }
        };
        fetchAddresses();
    }, []);

    // Закрываем меню для добавления и редактирования адреса
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setShowMenuId(null); // Закрываем меню
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenuId]);

    /* 
    ===========================
     Обработчики событий
    ===========================
    */

    // Добавление адреса
    const handleAddAddress = async (newAddress) => {
        if (addresses.length >= 10) {
            addNotification('Максимум 10 адресов');
            return;
        }
        setAddresses(prev => [...prev, { ...newAddress, id: Date.now() }]);
    };

    /* 
    ===========================
     Рендер
    ===========================
    */

    return (
        <div className="addresses-page">
            <div className="addresses-page-header">
                <h1 className="addresses-page-title">Адреса доставки</h1>
                <button
                    className="addresses-page-add-btn"
                    onClick={() => openModal('manage')}
                >
                    + Добавить адрес
                </button>
            </div>

            {addresses.length === 0 ? (
                <div className="addresses-page-empty">Добавьте ваш первый адрес</div>
            ) : (
                <div className="addresses-list">
                    {addresses.map((address) => (
                        <div
                            key={address.id}
                            className={`address-card ${selectedAddressId === address.id ? 'selected' : ''}`}
                            onClick={() => setSelectedAddressId(address.id)}
                        >
                            <div className="address-card-header">
                                <input
                                    type="radio"
                                    name="selectedAddress"
                                    checked={selectedAddressId === address.id}
                                    onChange={() => setSelectedAddressId(address.id)}
                                />
                                <button
                                    className="address-card-menu-btn"
                                    onClick={(e) => {
                                        e.stopPropagation(); // Останавливаем распространение события
                                        setShowMenuId(showMenuId === address.id ? null : address.id);
                                    }}
                                >
                                    <img src={moreIcon} alt="Меню" />
                                </button>

                                {showMenuId === address.id && (
                                    <div className="address-card-menu" ref={modalRef}>
                                        <button className="menu-item"
                                            onClick={() => openModal('edit')}
                                        >
                                            Редактировать
                                        </button>
                                        <button className="menu-item delete">Удалить</button>
                                    </div>
                                )}
                            </div>

                            <div className="address-card-body">
                                <p>{address.city}, ул. {address.street}, д. {address.house}</p>
                                {address.apartment && <p>Кв./офис: {address.apartment}</p>}
                                {address.comment && <p>Комментарий: {address.comment}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

        </div>
    );
}

export default AddressesPage;