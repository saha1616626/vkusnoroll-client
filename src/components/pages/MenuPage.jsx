// Главная страница. Меню ресторана

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from '../../utils/api'; // API сервера

// Импорт стилей 
import './../../styles/pages/menuPage.css'; // Стили меню

const MenuPage = () => {

    /* 
    ===========================
     Состояния
    ===========================
    */

    const [news, setNews] = useState([]);
    const [categories, setCategories] = useState([]);
    const [groupedDishes, setGroupedDishes] = useState({}); // Группировка блюд по категориям

    /* 
    ===========================
     Эффекты
    ===========================
    */

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Параллельная загрузка данных
                const [newsRes, categoriesRes, dishesRes] = await Promise.all([
                    api.getNewsPosts(),
                    api.getCategories(),
                    api.getDishes()
                ]);

                // Фильтрация категорий
                const activeCategories = categoriesRes.data.filter(category =>
                    !category.isArchived
                );

                // Фильтрация новостей
                const activeNews = newsRes.data
                    .filter(news => !news.isArchived)
                    .sort((a, b) => b.id - a.id); // Сортируем по дате;

                // Создание карты архивных категорий
                const archivedCategoryIds = new Set(
                    categoriesRes.data
                        .filter(category => category.isArchived)
                        .map(category => category.id)
                );

                // Фильтрация и группировка блюд
                const grouped = dishesRes.data.reduce((acc, dish) => { // Проход по всем группам
                    // Пропускаем если:
                    if (
                        dish.isArchived || // блюдо в архиве
                        archivedCategoryIds.has(dish.categoryId) // категория в архиве
                    ) return acc;

                    const categoryId = dish.categoryId; // Создаем ключ для данной категории
                    if (!acc[categoryId]) acc[categoryId] = []; // Проверяем наличие группы с данным ключом, если нет, то создаем группу
                    acc[categoryId].push(dish); // Добавляем блюдо в нужную группу
                    return acc; // Передаем результат для последующего вызова
                }, {});

                // Фильтрация категорий без блюд
                const validCategories = activeCategories.filter(category =>
                    grouped[category.id]?.length > 0
                );

                // Обновление состояния
                setNews(activeNews); // Устанавливаем полученный список новостей
                setCategories(validCategories); // Устанавливаем полученный список категорий
                setGroupedDishes(grouped); // Устанавливаем полученный группированный список блюд по категориям
            } catch (error) {
                console.error('Ошибка загрузки данных:', error);
            }
        };

        fetchData();
    }, []);

    /* 
    ===========================
     Обработчики событий
    ===========================
    */

    // Скролл до нужного списка блюд по нажатой категории
    const scrollToCategory = (categoryId) => {
        const element = document.getElementById(`category-${categoryId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Клик по новости
    const handleNewsClick = (newsId) => {

    }

    /* 
    ===========================
     Рендер
    ===========================
    */

    return (
        <div className="menu-page-container">
{/* Список категорий */}
<CategoryList
                categories={categories}
                onCategoryClick={scrollToCategory}
            />
            {/* Список постов */}
            <NewsList
                news={news}
                onNewsClick={handleNewsClick}
            />

            

            {/* Карточки блюд */}
            <div className="menu-dishes-container">
                {categories.map(category => (
                    <DishSection
                        key={category.id}
                        category={category}
                        dishes={groupedDishes[category.id] || []}
                    />
                ))}
            </div>
        </div>
    );
};

// Список постов
const NewsList = ({ news, onNewsClick }) => (
    // News.jsx (измененная часть с выводом карточек)
    <div className="menu-news-page-container">
        {/* ... остальной код ... */}

        <div className="menu-news-horizontal-scroll">
            {news.map(newsItem => (
                <div
                    key={newsItem.id}
                    className="menu-news-card"
                    onClick={() => onNewsClick(newsItem.id)}
                >
                    <div className="menu-news-card-image-container">
                        {newsItem.image ? (
                            <img
                                src={newsItem.image}
                                alt={newsItem.title}
                                className="menu-news-card-image"
                            />
                        ) : ( // Отображаем часть описания, если нет изображения 
                            <div className="menu-news-card-message">
                                {newsItem.message?.slice(0, 260)}{newsItem.message?.length > 260 && '...'}
                            </div>
                        )}
                    </div>
                    <div className="menu-news-card-content">
                        <h3 className="menu-news-card-title">{newsItem.title}</h3>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

// Список категорий
const CategoryList = ({ categories, onCategoryClick }) => (
    <div className="menu-category-list">
        <div className="menu-category-scroll">
            {categories.map(category => (
                <button
                    key={category.id}
                    className="menu-category-item"
                    onClick={() => onCategoryClick(category.id)}
                >
                    {category.name}
                </button>
            ))}
        </div>
    </div>
);

// Секции категорий с блюдами
const DishSection = ({ category, dishes }) => (
    <section
        id={`category-${category.id}`}
        className="menu-category-section"
    >
        <h2 className="menu-category-title">{category.name}</h2>
        <div className="menu-dish-grid">
            {dishes.map(dish => (
                <DishCard key={dish.id} dish={dish} />
            ))}
        </div>
    </section>
);

// Карточка блюда
const DishCard = ({ dish }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className={`menu-dish-card ${isHovered ? 'hovered' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="menu-dish-image-container">
                {dish.image && (
                    <img
                        src={dish.image}
                        alt={dish.name}
                        className="menu-dish-image"
                    />
                )}
            </div>

            <h3 className="menu-dish-name">{dish.name}</h3>

            <div className="menu-dish-info">
                <p className="menu-dish-description">
                    {dish.description?.slice(0, 80)}{dish.description?.length > 80 && '...'}
                </p>

                <div className="menu-dish-footer">
                    <span className="menu-dish-weight">
                        {dish.weight ? `${dish.weight} г` : dish.volume ? `${dish.volume} л` : ''}
                    </span>

                    <div className="menu-dish-price-container">
                        <span className="menu-dish-price">
                            {dish.price} ₽
                        </span>
                        <button className="menu-dish-add-button">
                            Добавить
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MenuPage;