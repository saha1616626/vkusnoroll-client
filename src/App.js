import { useState, useCallback, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate // Используем useNavigate внутри Router
} from 'react-router-dom';

import HeaderLayout from './components/common/HeaderLayout'; // Header и весь дочерний контент
import MenuPage from './components/pages/MenuPage'; // Меню ресторана

function App() {

  const AppContent = () => {

    return (
      <Routes>
        {/* Шапка */}
        <Route path="/" element={<HeaderLayout />} >
          {/* Главная страница - Список блюд */}
          <Route path="/menu" element={<MenuPage />} />
        </Route>
      </Routes>
    );
  }

  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
