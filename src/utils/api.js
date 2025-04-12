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

    // Блюда
    getDishes: () => api.get('/dishes'),
    getDishById: (id) => api.get(`/dishes/${id}`),

    // Категории
    getCategories: () => api.get('/categories'),
    getСategoryById: (id) => api.get(`/categories/${id}`),

    // Новостные посты
    getNewsPosts: () => api.get('/newsPosts'),
    getNewsPostsById: (id) => api.get(`/newsPosts/${id}`),

};

// Экспортируем объект по умолчанию
export default apiMethods;