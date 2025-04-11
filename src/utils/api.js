// Интеграция с серверной частью

import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

const apiMethods = {

    // Авторизация, выход и восстановлении пароля
    login: (credentials) => api.post('/auth/user/login', credentials), // Вход
    logout: () => api.post('/auth/user/logout'), // Выход

};

// Экспортируем объект по умолчанию
export default apiMethods;