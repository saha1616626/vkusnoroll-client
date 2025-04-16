// Личный кабинет. Страница "Личные данные"
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IMaskInput } from 'react-imask'; // Создание маски на номер телефона
import api from '../../../utils/api';  // API сервера

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
        name: '',
        numberPhone: '',
        email: ''
    });

    const [initialData, setInitialData] = useState({}); // Начальны данные
    const [isDirty, setIsDirty] = useState(false); // Отслеживание несохраненных данных (чтобы не обращаться к сервреу просто так)

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
                    name: response.data.name || '',
                    numberPhone: response.data.numberPhone || '',
                    email: response.data.email || ''
                });
            } catch (error) {
                console.error('Data upload error:', error);
            }
        };
        fetchUserData();
    }, []);

    /* 
    ===========================
     Обработчики событий
    ===========================
    */

    // Изменение значений в полях
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setIsDirty(true); // Есть не сохраненные данные
    };

    // Ввод номера телефона
    const handlePhoneChange = (e) => {
        const value = e.target.value.replace(/\D/g, ''); // Получаем введенные данные
        if (value.length <= 11) { // Не более 11 символов
            handleInputChange({
                target: {
                    name: 'numberPhone',
                    value: value
                }
            });
        }
    };

    // Стереть имя
    const handleClearName = () => {
        setFormData(prev => ({ ...prev, name: '' }));
        setIsDirty(true);
    };

    // Стереть номер телефона
    const handleClearNumberPhone = () => {
        setFormData(prev => ({ ...prev, numberPhone: '' }));
        setIsDirty(true);
    };

    // Обновление данных
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {

            if (formData.numberPhone.length !== 11) { // Если номер телефона короткий
                setFormData(initialData.numberPhone)

                if (formData.name.trim() === initialData.name) { // Если имя не поменялось, то изменения не сохраняем
                    setIsDirty(false); // Нет изменений
                    return;
                }
            }

            await api.patch(`/account/${initialData.id}`, {
                name: formData.name.trim(),
                numberPhone: formData.numberPhone
            });
            setIsDirty(false); // Данные сохранены успешно, изменений нету
            setFormData(formData); // Изменяем начальные данные
        } catch (error) {
            console.error('Ошибка сохранения:', error);
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
                            value={formData.name}
                            onChange={handleInputChange}
                        />
                        {formData.name && (
                            <button
                                type="button"
                                className="personal-data-page-clear-btn"
                                onClick={handleClearName}
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
                            onAccept={(value) => handlePhoneChange({ target: { value } })}
                            className="personal-data-page-input"
                            placeholder="+7(___) ___-__-__"
                            inputMode="numeric"
                        />
                        {formData.numberPhone && (
                            <button
                                type="button"
                                className="personal-data-page-clear-btn"
                                onClick={handleClearNumberPhone}
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
                        Сохранить изменения
                    </button>
                </div>

            </form>

        </div>
    );
}

export default PersonalDataPage;