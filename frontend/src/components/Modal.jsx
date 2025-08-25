import { useEffect, useRef } from 'react';

function Modal({ isOpen, onClose, children, title, size = 'default' }) {
  const modalRef = useRef();
  const backdropRef = useRef();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const handleBackdropClick = (event) => {
    // Only close if clicking directly on the backdrop, not on modal content
    if (event.target === backdropRef.current) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={`modal ${isOpen ? 'modal--active' : ''}`} style={{ display: isOpen ? 'flex' : 'none' }}>
      <div 
        className="modal__backdrop" 
        ref={backdropRef}
        onClick={handleBackdropClick}
      ></div>
      <div className={`modal__content ${size === 'large' ? 'modal__content--large' : ''}`} ref={modalRef}>
        <div className="modal__header">
          <h3>{title}</h3>
          <button
            className="modal__close"
            onClick={onClose}
            type="button"
          >
            &times;
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}

export default Modal;