import { useCallback, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate // Используем useNavigate внутри Router
} from 'react-router-dom';
import { isTokenValid } from './utils/auth'; // Проверка токена

// Контекс
import { CartProvider } from './components/contexts/CartContext'; // Провайдер контекста корзины
import { AuthProvider } from './components/contexts/AuthContext'; // Провайдер контекста авторизации
import { NotificationProvider } from './components/contexts/NotificationContext'; // Провайдер уведомления
import { useAuth } from "./components/contexts/AuthContext"; // Контекст авторизации
import { useCart } from "./components/contexts/CartContext"; // Контекст корзины

// Компоненты
import HeaderLayout from './components/layouts/HeaderLayout'; // Header и весь дочерний контент
import MenuPage from './components/pages/MenuPage'; // Меню ресторана
import PrivatePersonalAccountRoute from './components/protected/PrivatePersonalAccountRoute'; // Контент личного кабинета, доступный после авторизации
import PersonalAccountLayout from './components/layouts/PersonalAccountLayout'; // Меню личного кабинета
import PersonalDataPage from './components/pages/personalAccount/PersonalDataPage'; // Личный кабиент. Личные данные
import OrdersPage from './components/pages/personalAccount/OrdersPage'; // Личный кабиент. Заказы
import AddressesPage from './components/pages/personalAccount/AddressesPage'; // Личный кабиент. Адреса

function App() {
  return (
    <Router>
      <AuthProvider>   {/* Провайдер авторизации */}
        <NotificationProvider> {/* Провайдер уведомления */}
          <CartProvider> {/* Провайдер корзины */}
            <AppContent />
          </CartProvider>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

const AppContent = () => {
  const { isAuthenticated, updateAuth } = useAuth(); // Состояния из контекста авторизации
  const { loadCart } = useCart(); // Состояние из контекста корзины
  const navigate = useNavigate();
  const location = useLocation();

  // Проверка токена с защитой от лишних редиректов
  const checkTokenValidity = useCallback(() => {
    const token = localStorage.getItem('authUserToken');
    const isValid = isTokenValid(token);

    // Если токен невалиден, но в контексте ещё считается авторизованным
    if (!isValid && isAuthenticated) {
      updateAuth(false); // Синхронизируем контекст
      loadCart(); // Обновляем состав корзины при выходе из учетной записи (автоматически при окончании жизни токена или ручной выход)

      // Редирект только если не на целевой странице
      if (location.pathname !== '/menu') {
        navigate('/menu', { replace: true });
      }
    }
  }, [navigate, updateAuth, loadCart, location.pathname, isAuthenticated]);


  // Запуск интервала
  useEffect(() => {
    checkTokenValidity();
    const interval = setInterval(checkTokenValidity, 60000); // Мониторинг состояния токена каждую минуту
    return () => clearInterval(interval);
  }, [checkTokenValidity]);

  return (
    <Routes>
      {/* Шапка */}
      <Route path="/" element={<HeaderLayout />}>
        {/* Главная страница - Список блюд */}
        <Route path="/menu" element={<MenuPage />} />
        {/* Защищённые маршруты */}
        <Route element={<PrivatePersonalAccountRoute />}>
          {/* Меню личного кабинета */}
          <Route path="/personal-account" element={<PersonalAccountLayout />}>
            <Route index element={<Navigate to="personal-data" replace />} />
            <Route path="personal-data" element={<PersonalDataPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="addresses" element={<AddressesPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
};

export default App;
