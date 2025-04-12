// Главная страница. Меню ресторана

import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import api from '../../utils/api'; // API сервера

import Loader from "../../components/dynamic/Loader";

// Импорт иконок
import leftArrowIcon from './../../assets/icons/leftArrow.png'; // Личный кабинет
import rightArrowIcon from './../../assets/icons/rightArrow.png'; // Корзина 

// Импорт стилей 
import './../../styles/pages/menuPage.css'; // Стили меню

const MenuPage = () => {

    /* 
    ===========================
     Константы и рефы
    ===========================
    */

    const timeOut = 500; // Задержка перед отключением анимации загрузки данных

    /* 
    ===========================
     Состояния
    ===========================
    */

    const [news, setNews] = useState([]);
    const [categories, setCategories] = useState([]);
    const [groupedDishes, setGroupedDishes] = useState({}); // Группировка блюд по категориям
    const [isLoading, setIsLoading] = useState(true); // Отображение анимации загрузки при загрузке данных

    /* 
    ===========================
     Эффекты
    ===========================
    */

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true); // Включаем анимацию загрузки данных
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
            finally {
                setTimeout(() => setIsLoading(false), timeOut);
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
            {isLoading ? <Loader isWorking={isLoading} /> : <>
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
                </>}
        </div>
    );
};

// Список постов
const NewsList = ({ news, onNewsClick }) => {

    const [offset, setOffset] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [maxVisible, setMaxVisible] = useState(7);
    const containerRef = useRef(null);
    const cardWidth = 280; // Ширина одной карточки + gap (280px + 24px)

    // Рассчёт видимых постов на основе ширины контейнера
    useEffect(() => {
        const updateMaxVisible = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.offsetWidth - 80; // Учёт отступов под кнопки
                const newMax = Math.floor(containerWidth / cardWidth);
                setMaxVisible(Math.min(newMax, 7));
            }
        };

        updateMaxVisible();
        const observer = new ResizeObserver(updateMaxVisible);
        if (containerRef.current) observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, []);

    const totalNews = news.length;
    const canGoNext = offset < totalNews - maxVisible;
    const canGoPrev = offset > 0;

    const handleNext = () => setOffset(prev => Math.min(prev + 1, totalNews - maxVisible));
    const handlePrev = () => setOffset(prev => Math.max(prev - 1, 0));

    return (
        <div
            className="menu-news-page-container"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            ref={containerRef}
        >
            <div className="menu-news-horizontal-scroll" style={{ justifyContent: canGoNext || canGoPrev ? 'center' : 'left' }}> {/* Если стрелки есть, значит, контент не умещается и он располагается по центру */}
                {isHovered && canGoPrev && (
                    <button className="menu-news-arrow left" onClick={handlePrev}>
                        <img
                            src={leftArrowIcon}
                            alt="leftArrow"
                            style={{ cursor: 'pointer' }}
                        />
                    </button>
                )}

                {news.slice(offset, offset + maxVisible).map(newsItem => (
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

                {isHovered && canGoNext && (
                    <button className="menu-news-arrow right" onClick={handleNext}>
                        <img
                            src={rightArrowIcon}
                            alt="rightArrow"
                            style={{ cursor: 'pointer' }}
                        />
                    </button>
                )}
            </div>
        </div>
    );
};

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