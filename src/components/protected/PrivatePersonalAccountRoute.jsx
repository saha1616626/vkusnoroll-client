// Частный маршрут. В него обёрнуты все страницы личного кабинета, которые будут доступны после авторизации

import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext"; // Контекст авторизации

const PrivatePersonalAccountRoute = () => {

    const { isAuthenticated } = useAuth(); // Состояния из контекста авторизации
    const location = useLocation();

    return isAuthenticated 
        ? <Outlet /> // Рендерим вложенные маршруты
        : <Navigate to="/menu" state={{ from: location }} replace />;

};

export default PrivatePersonalAccountRoute;