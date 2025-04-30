// Интеграция с серверной частью

import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Интерсепторы Axios

// Автоматическая отправка токена авторизации в заголовки каждого исходящего HTTP-запроса
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('authUserToken'); // Извлекается токен аутентификации из локального хранилища браузера
    if (token) {
        config.headers.Authorization = `Bearer ${token}`; // Если токен существует, он добавляется в заголовок Authorization с типом Bearer
    }
    return config;
});

// Обработка ответов и автоматическая переаутентификация
api.interceptors.response.use(
    response => response, // Если запрос успешный (т.е. сервер вернул ответ с кодом состояния 2xx), то просто возвращаем ответ
    error => {
        if (error.response?.status === 401) { // Токен недействителен или отсутствует
            // Токен, роль, id и имя удаляется из локального хранилища
            ['authUserToken', 'clientId']
                .forEach(key => localStorage.removeItem(key));
            // window.location.href = '/menu'; // Переход на страницу входа
        }
        return Promise.reject(error); // Возвращает ошибку для дальнейшей обработки в компонентах
    }
);

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

    // Корзина
    getCart: () => api.get('/cart'),
    addItemCart: (data) => api.post('/cart/items', data),
    updateItemCart: (dishId, quantity) => api.put(`/cart/items/${dishId}`, { quantity }),
    removeItemCart: (dishId) => api.delete(`/cart/items/${dishId}`),

    // Пользователи
    getAccountById: (id) => api.get(`/accounts/user/${id}`),
    updateAccount: (id, data) => api.patch(`/accounts/buyer/${id}`, data),

    // Рабочее время ресторана
    getCurrentDeliveryTime: () => api.get(`/deliveryWork/current`), // Получение актуального времени доставки

    // Адреса доставки
    getDeliveryAddressesByIdClient: (id) => api.get(`/deliveryAddresses/${id}`), 

    // Зоны доставки
    getDeliveryZones: () => api.get('/deliverySettings/delivery-zones'),

};

// Экспортируем объект по умолчанию
export default apiMethods