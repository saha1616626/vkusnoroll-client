// Личный кабинет. Страница "Адреса"
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

// Импорт компонентов
import api from '../../../utils/api';  // API сервера
import { useNotification } from "../../contexts/NotificationContext"; // Контекст Уведомления
import { useAddressModal } from '../../contexts/AddressModalContext'; // Контекст модального окна "Адреса доставки"
import ConfirmationModal from './../../modals/ConfirmationModal';

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

    const menuRef = useRef(null); // Ссылка на меню для добавления и редактирования адреса
    const location = useLocation(); // Текущее местоположение (URL)

    const [addresses, setAddresses] = useState([]); // Список адресов
    const [selectedAddress, setSelectedAddress] = useState(null); // Выбранный адрес
    const [showMenuId, setShowMenuId] = useState(null); // Меню для удаления и редактирования
    const { addNotification } = useNotification(); // Отображение уведомлений
    const { openModal, closeModal } = useAddressModal(); // Состояние для модального окна "Адреса доставки"
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // Отображение модального окна для подтверждения удаления
    const [addressBeingDeletedId, setaAdressBeingDeletedId] = useState(null); // Идентификатор удаляемого адреса

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
                const savedAddressId = localStorage.getItem('SelectedDefaultAddressIdAuthorizedUser');
                const targetAddress = addressesRes.data.find(addr =>
                    addr.id.toString() === savedAddressId?.toString()
                );
                setSelectedAddress(targetAddress || addressesRes.data[0]);
            } else { // Если нет адресов, то обновляем шапку.
                // Генерируем кастомное событие для обновления отображения адреса в шапке
                window.dispatchEvent(new Event('address-updated'));
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
    }, [location.key, fetchAddresses, closeModal]); // При переходе на данную страницу, закрытие модального окна, данные на странице обновятся

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

    // Выбор адреса
    useEffect(() => {
        if (!selectedAddress) return; // Проверяем наличие выбранного адреса

        const clientId = localStorage.getItem('clientId');
        if (!!clientId) {
            // Сохраняем в локальное хранилище выбранный адрес
            localStorage.setItem('SelectedDefaultAddressIdAuthorizedUser', selectedAddress.id)

            // Генерируем кастомное событие для обновления отображения адреса в шапке
            window.dispatchEvent(new Event('address-updated'));
        }
    }, [selectedAddress]);

    /* 
    ===========================
     Обработчики событий
    ===========================
    */

    // Обработчик вызова модального окна для подтверждения удаления времени
    const handleDeleteInit = async (addressId) => {
        setShowDeleteConfirm(true); // Запуск модального окна
        setaAdressBeingDeletedId(addressId); // Передача id
    }

    // Обработчик подтверждения удаления адреса в модальном окне
    const handleConfirmDelete = async () => {
        try {
            if (!addressBeingDeletedId) return;
            await api.deleteDeliveryAddress(addressBeingDeletedId);
            addNotification('Адрес успешно удален');
            await fetchAddresses(); // Обновление данных
        } catch (error) {
            addNotification('Ошибка при удалении адреса');
            console.error('Ошибка удаления:', error);
            await fetchAddresses(); // Обновление данных в случае сбоя
        } finally {
            setShowDeleteConfirm(false); // После выполнения удаления закрываем модальное окно
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

                            {/* Радио кнопка */}
                            <div className="address-radio-wrapper">
                                <input
                                    type="radio"
                                    name="selectedAddress"
                                    checked={selectedAddress.id === address.id}
                                    onChange={() => setSelectedAddress(address)}
                                />
                            </div>

                            {/* Адрес */}
                            <div style={{ width: '100%', height: '100%', alignContent: 'center' }}>
                                <div className="address-card-body">
                                    <div className="addresses-page-main-info" style={{ marginBottom: address.isPrivateHome ? '0rem' : '' }}>
                                        <p className="addresses-page-city-street">
                                            {address.city}, {address.street}, д. {address.house}
                                            {address.isPrivateHome && (
                                                <span className="addresses-page-private-label">Частный дом</span>
                                            )}
                                        </p>
                                    </div>

                                    <div className="addresses-page-details">
                                        {address.apartment && (
                                            <div className="addresses-page-detail-item">
                                                <span className="icon">🏢</span>
                                                Кв./офис: {address.apartment}
                                            </div>
                                        )}
                                        {(address.entrance || address.floor) && (
                                            <div className="addresses-page-detail-group">
                                                {address.entrance && (
                                                    <div className="addresses-page-detail-item">
                                                        <span className="icon">🚪</span>
                                                        Подъезд: {address.entrance}
                                                    </div>
                                                )}
                                                {address.floor && (
                                                    <div className="addresses-page-detail-item">
                                                        <span className="icon">🔼</span>
                                                        Этаж: {address.floor}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {address.comment && (
                                        <div className="addresses-page-comment">
                                            <span className="icon">📝</span>
                                            {address.comment?.slice(0, 150)}{address.comment?.length > 150 && '...'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Меню */}
                            <div className="address-card-header">
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
                                    <div className="address-card-menu" ref={menuRef}
                                        onClick={(e) => {
                                            e.stopPropagation(); // Останавливаем распространение события radio
                                        }}>
                                        <button className="menu-item"
                                            onClick={() => openModal('edit', address)}
                                        >
                                            Редактировать
                                        </button>
                                        <button className="menu-item delete"
                                            onClick={() => handleDeleteInit(address.id)}
                                        >Удалить</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Модальное окно подтверждения удаления  */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                title={'Подтвердите удаление'}
                message={'Вы уверены, что хотите удалить выбранный адрес?'}
                onConfirm={handleConfirmDelete}
                onCancel={() => { setShowDeleteConfirm(false); }}
            />

        </div>
    );
}

export default AddressesPage;