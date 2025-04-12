// Анимация загрузки данных

import React from "react";
import PropTypes from 'prop-types';

// Импорт стилей
import "./../../styles/components/loader.css"; // Общие стили

import loadingIcon from './../../assets/icons/loading.png'

const Loader = ({ isWorking }) => (
        <div className={`loader-loading ${isWorking ? 'rotate' : ''}`}>
            <img src={loadingIcon} alt="loadingIcon" className="loader-loadingIcon"/>
        </div>
);

Loader.propTypes = {
    isWorking: PropTypes.func.isRequired, // обязываем передавать функцию обновления
};

export default Loader;