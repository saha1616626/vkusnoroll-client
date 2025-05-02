// Личный кабинет. Страница "Адреса"
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

// Импорт компонентов
import api from '../../../utils/api';  // API сервера
import { useNotification } from "../../contexts/NotificationContext"; // Контекст Уведомления
import { useAddressModal } from '../../contexts/AddressModalContext'; // Контекст модального окна "Адреса доставки"

// Импорт иконок
import moreIcon from '../../../assets/icons/moreVertical.png';
import addIcon from '../../../assets/icons/add.png' // Плюс

// Импорт стилей
import "../../../styles/pages/personalAccount/addressesPage.css";

const AddressesPage = () => {

    /* 
    ===========================
     Состояния и ссылки
    ===========================
    */

    const modalRef = useRef(null); // Ссылка на меню для добавления и редактирования адреса
    const location = useLocation(); // Текущее местоположение (URL)

    const [addresses, setAddresses] = useState([]); // Список адресов
    const [selectedAddress, setSelectedAddress] = useState(null); // Выбранный адрес
    const [showMenuId, setShowMenuId] = useState(null); // Меню для удаления и редактирования
    const { addNotification } = useNotification(); // Отображение уведомлений
    const { openModal } = useAddressModal(); // Состояние для модального окна "Адреса доставки"

    /* 
    ===========================
     Управление данными
    ===========================
    */

    const fetchAddresses = useCallback(async () => { // fetchAddresses будет создаваться только один раз при монтировании компонента, так как нет зависимостей
        try {
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
        } catch (error) {
            console.error('Ошибка загрузки адресов:', error);
        }
    }, []);

    /* 
    ===========================
     Эффекты
    ===========================
    */

    // Загрузка адресов клиента при монтировании компонента и изменении маршрута
    useEffect(() => {
        // Обновляем данные на странице
        fetchAddresses();
    }, [location.key, fetchAddresses]); // При переходе на данную страницу даже с текущей страницы будет изменен location.key, соответственно, данные на странице обновятся

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

    // Выбор адреса
    useEffect(() => {
        if (!selectedAddress) return; // Проверяем наличие выбранного адреса

        const clientId = localStorage.getItem('clientId');
        if (!!clientId) {
            // Сохраняем в локальное хранилище выбранный адрес
            localStorage.setItem('AddressIdAuthorizedUser', selectedAddress.id)
        }
    }, [selectedAddress]);

    /* 
    ===========================
     Обработчики событий
    ===========================
    */

    // Удаление адреса
    const handleDelete = async (addressId) => {
        try {
            await api.deleteDeliveryAddress(addressId);
            await fetchAddresses(); // Обновление данных
        } catch (error) {
            addNotification('Ошибка при удалении адреса');
            console.error('Ошибка удаления:', error);
            await fetchAddresses(); // Обновление данных в случае сбоя
        }
    }

    /* 
    ===========================
     Рендер
    ===========================
    */

    return (
        <div className="addresses-page">
            <div className="addresses-page-header">
                <h1 className="addresses-page-title">Адреса доставки</h1>

                <div style={{ display: 'flex', justifyContent: 'right' }}>
                    <button
                        className="addresses-page-add-btn"
                        onClick={() => openModal('create')}
                    >
                        <img src={addIcon} alt="Add" className="icon-button" />
                        Добавить адрес
                    </button>
                </div>
            </div>

            {addresses.length === 0 ? (
                <div className="addresses-page-empty">Добавьте Ваш первый адрес</div>
            ) : (
                <div className="addresses-list">
                    {addresses.map((address) => (
                        <div
                            key={address.id}
                            className={`address-card ${selectedAddress.id === address.id ? 'selected' : ''}`}
                            onClick={() => setSelectedAddress(address)}
                        >
                            <div className="address-card-header">
                                <input
                                    type="radio"
                                    name="selectedAddress"
                                    checked={selectedAddress.id === address.id}
                                    onChange={() => setSelectedAddress(address)}
                                />
                                <button
                                    className="address-card-menu-btn"
                                    onClick={(e) => {
                                        e.stopPropagation(); // Останавливаем распространение события radio
                                        setShowMenuId(showMenuId === address.id ? null : address.id);
                                    }}
                                >
                                    <img src={moreIcon} alt="Меню" />
                                </button>

                                {showMenuId === address.id && (
                                    <div className="address-card-menu" ref={modalRef}
                                        onClick={(e) => {
                                            e.stopPropagation(); // Останавливаем распространение события radio
                                        }}>
                                        <button className="menu-item"
                                            onClick={() => openModal('edit', address)}
                                        >
                                            Редактировать
                                        </button>
                                        <button className="menu-item delete"
                                            onClick={() => handleDelete(address.id)}
                                        >Удалить</button>
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