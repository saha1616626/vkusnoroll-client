// Компонент для отображения личного кабинета и его дочерних страниц

import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { Outlet } from "react-router-dom";

// Импорт компонентов
import PersonalAccountMenu from "../menus/PersonalAccountMenu";
import { useAuth } from "../contexts/AuthContext"; // Контекст авторизации

const PersonalAccountLayout = () => {

    const location = useLocation(); // Получаем текущий маршрут
    const [showSettingsMenu, setShowSettingsMenu] = useState(true); // Состояние отображения меню
    const navigate = useNavigate(); // Навигация
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/menu');
        }
    }, [isAuthenticated, navigate]);

    return (
        <div style={{ display: 'flex' }}>
            <PersonalAccountMenu />
            <div style={{
                marginLeft: showSettingsMenu ? '250px' : 0,
                width: showSettingsMenu ? 'calc(100% - 250px)' : '100%',
                padding: showSettingsMenu ? '20px' : 0,
                transition: 'margin-left 0.3s ease' // Добавляем анимацию
            }}>
                <Outlet />
            </div>
        </div>
    );

}

export default PersonalAccountLayout;