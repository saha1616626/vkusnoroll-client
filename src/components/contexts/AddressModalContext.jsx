// Контекст для управления состоянием модального окна адресов доставки

import React, { createContext, useState, useContext } from 'react';

const AddressModalContext = createContext();

export const AddressModalProvider = ({ children }) => {

    const [isOpen, setIsOpen] = useState(false); // Отображение модального окна
    const [mode, setMode] = useState('select'); // Режим работы модального окна
    const [previousMode, setPreviousMode] = useState(null); // Предыдущий режим работы модального окна
    const [editAddress, setEditAddress] = useState(null); // Редактируемый адрес

    // Отображение модального окна
    const openModal = (mode = 'select', address = null, previousMode = null) => {
        setMode(mode);
        setPreviousMode(previousMode);
        setIsOpen(true);
        setEditAddress(address);
    };

    // Скрытие модального окна
    const closeModal = () => {
        setIsOpen(false);
        setMode('select');
        setPreviousMode(null);
    };

    return (
        <AddressModalContext.Provider value={{ isOpen, openModal, closeModal, mode, editAddress, previousMode }}>
            {children}
        </AddressModalContext.Provider>
    );

};

export const useAddressModal = () => useContext(AddressModalContext);