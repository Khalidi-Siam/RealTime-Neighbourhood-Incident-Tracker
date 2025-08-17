import { useEffect, useCallback } from 'react';

function AlertModal({ 
  isOpen, 
  onClose, 
  title = "Notification", 
  message = "",
  type = "success", // success, error, warning, info
  autoClose = true,
  autoCloseDelay = 3000
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
      const modal = document.querySelector('.alert-modal');
      if (modal) {
        modal.focus();
      }

      // Auto close timer
      let timer;
      if (autoClose) {
        timer = setTimeout(() => {
          onClose();
        }, autoCloseDelay);
      }

      return () => {
        // Cleanup
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', handleEsc);
        if (timer) {
          clearTimeout(timer);
        }
      };
    }
  }, [isOpen, handleEsc, onClose, autoClose, autoCloseDelay]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div 
        className="alert-modal" 
        onClick={(e) => e.stopPropagation()}
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="alert-title"
        aria-describedby="alert-message"
      >
        <div className="alert-modal-header">
          <div className={`alert-modal-icon alert-modal-icon--${type}`}>
            {getIcon()}
          </div>
          <h3 id="alert-title" className="alert-modal-title">{title}</h3>
        </div>
        
        <div className="alert-modal-body">
          <p id="alert-message" className="alert-modal-message">{message}</p>
        </div>
        
        <div className="alert-modal-actions">
          <button 
            className={`btn btn--${type}`}
            onClick={onClose}
            type="button"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export default AlertModal;
