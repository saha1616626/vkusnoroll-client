// Интеграция с серверной частью

import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Интерцепторы Axios

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
            // Токен, id пользователя и выбранный адрес удаляются из локального хранилища
            ['authUserToken', 'clientId', 'SelectedDefaultAddressIdAuthorizedUser']
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
    createAccountBuyer: (data) => api.post('/accounts/buyer', data), // Регистрация пользователя
    sendBuyerConfirmationCodeEmail: (id) => api.post(`/accounts/buyer/${id}/send-code`), // Отправка кода подтверждения на Email
    verifyBuyerConfirmationCodeEmail: (id, code) =>
        api.post(`/accounts/buyer/${id}/verify-code`, { code: code.toString() }), // Проверка кода подтверждения
    sendCodeBuyerRecoveryPassword: (email) =>
        api.post(`/accounts/buyer/send-code-recovery`, { email: email.toString() }), // Отправка кода подтверждения для восстановления пароля к учетной записи
    checkingCodeResettingPassword: (id, code) =>
        api.post(`/accounts/user/${id}/verify-code`, { code: code.toString() }), // Проверка кода подтверждения, отправленного на email при восстановлении пароля
    changingPassword: (id, password) =>
        api.put(`/accounts/user/${id}/changing-password`, { password: password }), // Смена пароля

    // Рабочее время ресторана
    getCurrentDeliveryTime: () => api.get(`/deliveryWork/current`), // Получение актуального времени доставки
    getNextSevenDaysSchedule: () => api.get(`/deliveryWork/next-seven-days`), // Получить график работы на следующие 7 дней

    // Адреса доставки
    getDeliveryAddressById: (id) => api.get(`/deliveryAddresses/address/${id}`),
    getDeliveryAddressesByIdClient: (id) => api.get(`/deliveryAddresses/${id}`),
    getFirstAvailableSavedClientAddress: (id) => api.get(`/deliveryAddresses/address/buyer/${id}`), // Получаем первый доступный сохраненный адрес клиента
    createDeliveryAddress: (data) => api.post('/deliveryAddresses', data),
    updateDeliveryAddress: (addressId, data) => api.put(`/deliveryAddresses/${addressId}`, data),
    deleteDeliveryAddress: (addressId) => api.delete(`/deliveryAddresses/${addressId}`),

    // Настройки доставки
    getDeliveryZones: () => api.get('/deliverySettings/delivery-zones'), // Зоны доставки
    getOrderSettings: () => api.get('/deliverySettings/order-settings'), // Получаем все необходимые данные для формирования заказа

    // Заказы
    getOrdersByIdClient: (id) => api.get(`/orders/client/${id}`), // Список заказов клиента
    createOrderClient: (data) => api.post('/orders/client', data), // Оформление заказа клиентом 

};

// Экспортируем объект по умолчанию
export default apiMethods