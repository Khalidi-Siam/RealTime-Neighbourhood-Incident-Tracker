import { useEffect, useCallback } from 'react';

function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action", 
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger" // danger, warning, info
}) {
  // Handle ESC key
  const handleEsc = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      // Add modal-open class to body to prevent scroll
      document.body.classList.add('modal-open');
      
      // Add event listener
      document.addEventListener('keydown', handleEsc);
      
      // Focus management
      const modal = document.querySelector('.confirm-modal');
      if (modal) {
        modal.focus();
      }
    }

    return () => {
      // Cleanup
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, handleEsc]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return '⚠️';
      case 'warning':
        return '🔔';
      case 'info':
        return 'ℹ️';
      default:
        return '❓';
    }
  };

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div 
        className="confirm-modal" 
        onClick={(e) => e.stopPropagation()}
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-message"
      >
        <div className="confirm-modal-header">
          <div className={`confirm-modal-icon confirm-modal-icon--${type}`}>
            {getIcon()}
          </div>
          <h3 id="modal-title" className="confirm-modal-title">{title}</h3>
        </div>
        
        <div className="confirm-modal-body">
          <p id="modal-message" className="confirm-modal-message">{message}</p>
        </div>
        
        <div className="confirm-modal-actions">
          <button 
            className="btn btn--secondary"
            onClick={onClose}
            type="button"
          >
            {cancelText}
          </button>
          <button 
            className={`btn btn--${type}`}
            onClick={onConfirm}
            type="button"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
