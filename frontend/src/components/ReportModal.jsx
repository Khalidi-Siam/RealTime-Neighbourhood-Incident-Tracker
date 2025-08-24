import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import { incidentsAPI } from '../utils/api.js';
import { toast } from 'react-toastify';

const ReportModal = ({ isOpen, onClose, incident, onReportSubmitted }) => {
  const { token } = useContext(AuthContext);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');

  const predefinedReasons = [
    { value: 'False information', icon: '❌', description: 'Contains incorrect or misleading information' },
    { value: 'Spam content', icon: '📧', description: 'Irrelevant or repetitive content' },
    { value: 'Inappropriate content', icon: '🚫', description: 'Contains offensive or inappropriate material' },
    { value: 'Misleading information', icon: '⚠️', description: 'Deliberately deceptive content' },
    { value: 'Other', icon: '📝', description: 'Specify your own reason' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedReason && !reason.trim()) {
      toast.error('Please provide a reason for reporting this incident');
      return;
    }

    setIsSubmitting(true);

    try {
      const reportReason = selectedReason === 'Other' ? reason : selectedReason;
      
      const data = await incidentsAPI.reportFalse(incident._id, reportReason);

      toast.success('🎉 Report submitted successfully. Admins will review it shortly.', {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      // Reset form and close modal
      setReason('');
      setSelectedReason('');
      
      // Trigger callback to refresh report status
      if (onReportSubmitted) {
        onReportSubmitted();
      }
      
      onClose();

    } catch (err) {
      console.error('Report error:', err);
      toast.error('❌ Error: ' + err.message, {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('');
      setSelectedReason('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modern-modal" onClick={handleClose}>
      <div className="modern-modal__backdrop"></div>
      <div className="modern-modal__content" onClick={(e) => e.stopPropagation()}>
        <button 
          className="modern-modal__close" 
          onClick={handleClose}
          disabled={isSubmitting}
          aria-label="Close modal"
        >
          ✕
        </button>
        
        <div className="modern-report-modal">
          <div className="modern-report-modal__header">
            <h3 className="modern-report-modal__title">
              <span className="modern-report-modal__icon">🚨</span>
              Report Incident to Admin
            </h3>
            <p className="modern-report-modal__subtitle">
              Help us maintain community safety by reporting suspicious content
            </p>
          </div>
          
          <div className="modern-incident-preview">
            <div className="modern-incident-preview__item">
              <span className="modern-incident-preview__label">Incident:</span>
              <span className="modern-incident-preview__value">{incident?.title}</span>
            </div>
            <div className="modern-incident-preview__item">
              <span className="modern-incident-preview__label">Reported by:</span>
              <span className="modern-incident-preview__value">{incident?.submittedBy?.username}</span>
            </div>
            <div className="modern-incident-preview__item">
              <span className="modern-incident-preview__label">Date:</span>
              <span className="modern-incident-preview__value">{new Date(incident?.timestamp).toLocaleDateString()}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="modern-report-modal__form">
            <div className="modern-form-group">
              <label className="modern-form-label">
                <span className="modern-form-label__icon">📋</span>
                Reason for reporting:
              </label>
              <div className="modern-reason-grid">
                {predefinedReasons.map((reasonOption) => (
                  <div
                    key={reasonOption.value}
                    className={`modern-reason-card ${selectedReason === reasonOption.value ? 'modern-reason-card--selected' : ''}`}
                    onClick={() => !isSubmitting && setSelectedReason(reasonOption.value)}
                  >
                    <div className="modern-reason-card__icon">{reasonOption.icon}</div>
                    <div className="modern-reason-card__content">
                      <div className="modern-reason-card__title">{reasonOption.value}</div>
                      <div className="modern-reason-card__description">{reasonOption.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedReason === 'Other' && (
              <div className="modern-form-group">
                <label htmlFor="customReason" className="modern-form-label">
                  <span className="modern-form-label__icon">✍️</span>
                  Please specify your reason:
                </label>
                <div className="modern-form-textarea-wrapper">
                  <textarea
                    id="customReason"
                    className="modern-form-textarea"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Please describe why you're reporting this incident..."
                    rows="4"
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>
            )}

            <div className="modern-warning-card">
              <div className="modern-warning-card__icon">⚠️</div>
              <div className="modern-warning-card__content">
                <p className="modern-warning-card__text">
                  Please ensure your report is legitimate. False reports may result in account restrictions.
                </p>
              </div>
            </div>

            <div className="modern-actions">
              <button
                type="button"
                className="modern-btn modern-btn--outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                <span className="modern-btn__icon">✕</span>
                Cancel
              </button>
              
              <div className="modern-actions__spacer"></div>
              
              <button
                type="submit"
                className={`modern-btn modern-btn--danger ${isSubmitting ? 'modern-btn--loading' : ''}`}
                disabled={isSubmitting || (!selectedReason && !reason.trim())}
              >
                {isSubmitting ? (
                  <>
                    <span className="modern-btn__spinner"></span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <span className="modern-btn__icon">🚨</span>
                    Submit Report
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
