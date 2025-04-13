import { useState, useCallback, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate // Используем useNavigate внутри Router
} from 'react-router-dom';
import { isTokenValid } from './utils/auth'; // Проверка токена

// Контекс
import { CartProvider } from './components/contexts/CartContext'; // Провайдер контекста корзины

// Компоненты
import HeaderLayout from './components/layouts/HeaderLayout'; // Header и весь дочерний контент
import MenuPage from './components/pages/MenuPage'; // Меню ресторана
import PrivatePersonalAccountRoute from './components/protected/PrivatePersonalAccountRoute'; // Контент личного кабинета, доступный после авторизации

function App() {

  // Проверяем состояние токена, если он неактивный, то 
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = localStorage.getItem('authUserToken'); // Актуальный статус авторизации пользователя вводим ограничения для пользователя
    return isTokenValid(token);
  });

  // Обновление статуса авторизации
  const updateAuthStatus = useCallback((status) => {
    setIsAuthenticated(status);
  }, []);

  const AppContent = () => {

    const navigate = useNavigate(); // Навигация

    // Проверка срока действия токена при инициализации
    useEffect(() => {
      const checkTokenValidity = () => {
        const token = localStorage.getItem('authUserToken');
        if (!isTokenValid(token)) {
          // Токен и id удаляются из локального хранилища
          ['authAdminToken', 'clientId']
            .forEach(key => localStorage.removeItem(key));
          setIsAuthenticated(false);
          navigate('/'); // TODO навигация
        }
      };

      checkTokenValidity();
      const interval = setInterval(checkTokenValidity, 60000); // Проверка каждую минуту статуса токена
      return () => clearInterval(interval);
    }, [navigate]);

    return (
      // Провайдер корзины
      <CartProvider>
        <Routes>
          {/* Шапка */}
          <Route path="/" element={<HeaderLayout />} >
            {/* Главная страница - Список блюд */}
            <Route path="/menu" element={<MenuPage />} />
            {/* Все защищенные маршруты личного кабинета */}
            <Route element={<PrivatePersonalAccountRoute isAuthenticated={isAuthenticated} />}>

            </Route>
          </Route>
        </Routes>
      </CartProvider>
    );
  }

  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
