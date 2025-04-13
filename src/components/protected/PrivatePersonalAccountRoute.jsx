// Частный маршрут. В него обёрнуты все страницы личного кабинета, которые будут доступны после авторизации

import React from "react";
import { Navigate, Outlet } from 'react-router-dom';
import { isTokenValid } from '../../utils/auth'; // Проверка токена

const PrivatePersonalAccountRoute = ({ isAuthenticated }) => {
    const token = localStorage.getItem('authUserToken');
    if (!isAuthenticated || !isTokenValid(token)) {
        // Токен, роль, id и имя удаляется из локального хранилища
        ['authUserToken', 'clientId']
            .forEach(key => localStorage.removeItem(key));
        return <Navigate to="/" replace />;
        // TODO добавить запуск окна авторизации
    }

    return <Outlet />; // Если пользователь авторизовался, то Outlet доступен
};

export default PrivatePersonalAccountRoute;