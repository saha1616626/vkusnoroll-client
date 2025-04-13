//  Модальное окно подтверждения действия

import React from 'react';
import './../../styles/modals/confirmationModal.css';

const ConfirmationModal = ({
    isOpen,
    title = "Подтверждение действия",
    message = "Вы уверены, что хотите выполнить это действие?",
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null;

    return (
        <div className="confirmation-modal-overlay">
            <div className="confirmation-modal-container">
                <div className="confirmation-modal-header">
                    <h3>{title}</h3>
                </div>

                <div className="confirmation-modal-body">
                    <p>{message}</p>
                </div>

                <div className="confirmation-modal-footer">
                    <button className="button-control confirmation-modal-confirm-button" onClick={onConfirm}>Да</button>
                    <button className="button-control confirmation-modal-cancel-button" onClick={onCancel}>Отмена</button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;