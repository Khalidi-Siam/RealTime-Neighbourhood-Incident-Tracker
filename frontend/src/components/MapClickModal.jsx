import { useState } from 'react';
import ReportIncidentForm from './ReportIncidentForm.jsx';

function MapClickModal({ isOpen, onClose, coordinates, address }) {
  const [showReportForm, setShowReportForm] = useState(false);

  if (!isOpen) return null;

  const handleReportHere = () => {
    setShowReportForm(true);
  };

  const handleCloseReportForm = () => {
    setShowReportForm(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      {!showReportForm ? (
        <div className="map-click-modal" onClick={(e) => e.stopPropagation()}>
          <div className="map-click-modal__header">
            <h3 className="map-click-modal__title">
              <span className="map-click-modal__icon">📍</span>
              Report Incident Here?
            </h3>
            <button
              className="map-click-modal__close"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="map-click-modal__content">
            <div className="map-click-modal__location">
              <div className="map-click-modal__location-item">
                <span className="map-click-modal__location-label">📍 Location:</span>
                <span className="map-click-modal__location-value">
                  {address || 'Selected location on map'}
                </span>
              </div>
              <div className="map-click-modal__location-item">
                <span className="map-click-modal__location-label">🌐 Coordinates:</span>
                <span className="map-click-modal__location-value">
                  {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                </span>
              </div>
            </div>

            <p className="map-click-modal__description">
              Do you want to report an incident at this location? The coordinates will be automatically filled in the report form.
            </p>
          </div>

          <div className="map-click-modal__actions">
            <button
              className="map-click-modal__btn map-click-modal__btn--secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="map-click-modal__btn map-click-modal__btn--primary"
              onClick={handleReportHere}
            >
              <span className="map-click-modal__btn-icon">📝</span>
              Report Incident Here
            </button>
          </div>
        </div>
      ) : (
        <div className="modal-content modal-content--large" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">
              <span className="modal-icon">📝</span>
              Report Incident
            </h2>
            <button
              className="modal-close"
              onClick={handleCloseReportForm}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="modal-body">
            <ReportIncidentForm 
              onClose={handleCloseReportForm}
              prefilledData={{
                lat: coordinates.lat.toString(),
                lng: coordinates.lng.toString(),
                address: address || 'Selected location on map'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default MapClickModal;
