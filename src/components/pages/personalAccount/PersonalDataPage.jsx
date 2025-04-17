// Личный кабинет. Страница "Личные данные"
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { IMaskInput } from 'react-imask'; // Создание маски на номер телефона
import api from '../../../utils/api';  // API сервера
import { useNotification } from "../../contexts/NotificationContext"; // Контекст Уведомления

// Импорт стилей 
import "../../../styles/pages/personalAccount/personalDataPage.css";

// Импорт иконок
import questionIcon from './../../../assets/icons/question.png'
import crossIcon from './../../../assets/icons/cross.png'

const PersonalDataPage = () => {

    /* 
    ===========================
     Состояния
    ===========================
    */

    const [formData, setFormData] = useState({ // Данные полей
        name: null,
        numberPhone: null,
        email: null
    });

    const [initialData, setInitialData] = useState({}); // Начальны данные
    const [isDirty, setIsDirty] = useState(false); // Отслеживание несохраненных данных (чтобы не обращаться к сервреу просто так)
    const { addNotification } = useNotification(); // Отображение уведомлений

    /* 
    ===========================
     Функции
    ===========================
    */

    // Сравнение данных для определения изменений
    const checkChanges = useCallback(() => {
        return (
            formData.name !== initialData.name ||
            formData.numberPhone !== initialData.numberPhone
        );
    }, [formData.name, formData.numberPhone, initialData.name, initialData.numberPhone]);

    /* 
    ===========================
     Эффекты
    ===========================
    */

    // Устанавливаем данные пользователя
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const clientId = localStorage.getItem('clientId');
                const response = await api.getAccountById(clientId); // Получаем данные авторизованного пользователя
                setInitialData(response.data); // Сохраняем начальные данные
                setFormData({
                    name: response.data.name || null,
                    numberPhone: response.data.numberPhone || null,
                    email: response.data.email || null
                });
            } catch (error) {
                console.error('Data upload error:', error);
            }
        };
        fetchUserData();
    }, []);

    // Обновление состояния isDirty при изменениях
    useEffect(() => {
        setIsDirty(checkChanges());
    }, [formData, initialData, checkChanges]);

    /* 
    ===========================
     Обработчики событий
    ===========================
    */

    // Изменение значения в поле "Имя"
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value || null }));
    };

    // Ввод номера телефона
    const handlePhoneChange = (value) => {
        const cleanedValue = value.replace(/\D/g, ''); // Получаем введенные данные
        if (cleanedValue.length <= 11) { // Не более 11 символов
            setFormData(prev => ({
                ...prev,
                numberPhone: cleanedValue?.trim() || null
            }));
        }
    };

    // Стереть имя или номер телефона
    const handleClearField = (field) => {
        setFormData(prev => ({
            ...prev,
            [field]: null // TODO не изменяет isDirty
        }));
    };

    // Обновление данных
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {

            // Валидация номера телефона перед отправкой
            const phone = formData.numberPhone?.replace(/\D/g, null) || null;
            let isPhoneValid = true; // Номер телефона корректный

            if (phone !== null && phone.length !== 11) {
                isPhoneValid = false;
                // Отображаем ошибку
                addNotification('Номер телефона некорректный');

                // Восстанавливаем старый телефон, если текущий некорректный
                setFormData(prev => ({
                    ...prev,
                    numberPhone: initialData.numberPhone
                }));
            }

            // Формируем объект для отправки
            const updatedData = {
                name: formData.name?.trim() || null
            };

            // Добавляем телефон только если он валиден
            if (isPhoneValid) {
                updatedData.numberPhone = phone;
            }
            else { // Добавляем старый телефон, чтобы не установилось null
                updatedData.numberPhone = initialData.numberPhone;
            }

            // Отправка данных на сервер
            const response = await api.updateAccount(initialData.id, updatedData);

            // Обновляем начальные данные из ответа сервера
            setInitialData(prev => ({
                ...prev,
                ...response.data
            }));

        } catch (error) {
            console.error('Ошибка сохранения:', error);

            // Восстанавливаем исходные значения при ошибке
            setFormData({
                name: initialData.name,
                numberPhone: initialData.numberPhone,
                email: initialData.email
            });
        }
    };

    /* 
    ===========================
     Рендер
    ===========================
    */

    return (
        <div className="personal-data-page-container">

            <div className="personal-data-page-title">
                Мои персональные данные
            </div>

            <form onSubmit={handleSubmit} className="personal-data-page-form">
                <div className="personal-data-page-input-group">
                    <label className="personal-data-page-label">Имя</label>
                    <div className="personal-data-page-input-wrapper">
                        <input
                            maxLength={25}
                            type="text"
                            className="personal-data-page-input"
                            name="name"
                            value={formData.name || ''}
                            onChange={handleInputChange}
                        />
                        {formData.name && (
                            <button
                                type="button"
                                className="personal-data-page-clear-btn"
                                onClick={() => handleClearField('name')}
                            >
                                ×
                            </button>
                        )}
                    </div>
                </div>

                <div className="personal-data-page-input-group">
                    <label className="personal-data-page-label">Номер телефона</label>
                    <div className="personal-data-page-input-wrapper">
                        <IMaskInput
                            mask="+7(000)000-00-00"
                            value={formData.numberPhone}
                            onAccept={handlePhoneChange}
                            className="personal-data-page-input"
                            placeholder="+7(___) ___-__-__"
                        />
                        {formData.numberPhone && (
                            <button
                                key={1111}
                                type="button"
                                className="personal-data-page-clear-btn"
                                onClick={() => handleClearField('numberPhone')}
                            >
                                ×
                            </button>
                        )}
                    </div>
                </div>

                <div className="personal-data-page-input-group">
                    <div className="personal-data-page-label-wrapper">
                        <label className="personal-data-page-label">Email</label>
                        <div className="personal-data-page-tooltip">
                            <span className="personal-data-page-tooltip-text">
                                Изменить email нельзя, так как он необходим для входа в систему и восстановления учётной записи.
                            </span>
                            <span><img src={questionIcon} alt="Question" className="personal-data-icon" /></span>
                        </div>
                    </div>
                    <input
                        type="email"
                        className="personal-data-page-input personal-data-page-email-input"
                        value={formData.email}
                        readOnly
                        disabled
                    />
                </div>

                <div className="personal-data-page-button-container">
                    <button
                        type="submit"
                        className={`button-control personal-data-page-save-btn ${isDirty ? 'active' : ''}`}
                        disabled={!isDirty}
                    >
                        {isDirty ? 'Сохранить изменения' : 'Все изменения сохранены'}
                    </button>
                </div>

            </form>

        </div>
    );
}

export default PersonalDataPage;