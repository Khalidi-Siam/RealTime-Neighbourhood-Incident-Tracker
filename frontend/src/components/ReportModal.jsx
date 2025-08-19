import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import { toast } from 'react-toastify';

const ReportModal = ({ isOpen, onClose, incident, onReportSubmitted }) => {
  const { token } = useContext(AuthContext);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');

  const predefinedReasons = [
    'False information',
    'Spam content',
    'Inappropriate content',
    'Misleading information',
    'Other'
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
      
      const response = await fetch(`http://localhost:3000/api/incidents/${incident._id}/report-false`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: reportReason }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit report');
      }

      toast.success('Report submitted successfully. Admins will review it shortly.', {
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
      toast.error('Error: ' + err.message, {
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
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal modal--report" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3 className="modal__title">Report Incident to Admin</h3>
          <button 
            className="modal__close" 
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        
        <div className="modal__content">
          <div className="report-modal__incident-info">
            <h4>Incident: {incident?.title}</h4>
            <p>Reported by: {incident?.submittedBy?.username}</p>
            <p>Date: {new Date(incident?.timestamp).toLocaleDateString()}</p>
          </div>

          <form onSubmit={handleSubmit} className="report-form">
            <div className="form-group">
              <label className="form-label">Reason for reporting:</label>
              <div className="reason-options">
                {predefinedReasons.map((reasonOption) => (
                  <div
                    key={reasonOption}
                    className={`reason-option ${selectedReason === reasonOption ? 'reason-option--selected' : ''}`}
                    onClick={() => !isSubmitting && setSelectedReason(reasonOption)}
                  >
                    <span className="reason-option__text">{reasonOption}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedReason === 'Other' && (
              <div className="form-group">
                <label htmlFor="customReason" className="form-label">
                  Please specify:
                </label>
                <textarea
                  id="customReason"
                  className="form-textarea"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please describe why you're reporting this incident..."
                  rows="4"
                  disabled={isSubmitting}
                  required
                />
              </div>
            )}

            <div className="report-modal__warning">
              <p>⚠️ Please ensure your report is legitimate. False reports may result in account restrictions.</p>
            </div>

            <div className="modal__footer">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn--danger"
                disabled={isSubmitting || (!selectedReason && !reason.trim())}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
