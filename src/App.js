import { useState, useCallback, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate // Используем useNavigate внутри Router
} from 'react-router-dom';

import { CartProvider } from './components/contexts/CartContext'; // Провайдер контекста корзины

import HeaderLayout from './components/common/HeaderLayout'; // Header и весь дочерний контент
import MenuPage from './components/pages/MenuPage'; // Меню ресторана

function App() {

  const AppContent = () => {

    return (
      // Провайдер корзины
      <CartProvider>
        <Routes>
          {/* Шапка */}
          <Route path="/" element={<HeaderLayout />} >
            {/* Главная страница - Список блюд */}
            <Route path="/menu" element={<MenuPage />} />
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
