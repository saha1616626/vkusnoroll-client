// Контекст для управления состоянием модального окна адресов доставки

import React, { createContext, useState, useContext } from 'react';

const AddressModalContext = createContext();

export const AddressModalProvider = ({ children }) => {

    const [isOpen, setIsOpen] = useState(false); // Отображение модального окна
    const [mode, setMode] = useState('select'); // Режим работы модального окна

    // Отображение модального окна
    const openModal = (mode = 'select') => {
        setMode(mode);
        setIsOpen(true);
    };

    // Скрытие модального окна
    const closeModal = () => {
        setIsOpen(false);
        setMode('select');
    };

    return (
        <AddressModalContext.Provider value={{ isOpen, openModal, closeModal, mode }}>
            {children}
        </AddressModalContext.Provider>
    );

};

export const useAddressModal = () => useContext(AddressModalContext);