import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import { toast } from 'react-toastify';

function ReportIncidentForm({ onClose, prefilledData = {} }) {
  const { currentUser } = useContext(AuthContext);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    address: prefilledData.address || '',
    lat: prefilledData.lat || '',
    lng: prefilledData.lng || '',
    category: prefilledData.category || '',
    severity: prefilledData.severity || '',
    title: prefilledData.title || '',
    description: prefilledData.description || '',
  });
  const [error, setError] = useState('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    e.stopPropagation();
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleUseCurrentLocation = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLoadingLocation(true);
    setError('');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            lat: position.coords.latitude.toString(),
            lng: position.coords.longitude.toString(),
            address: formData.address || 'Current Location',
          });
          setIsLoadingLocation(false);
        },
        (err) => {
          setError('Failed to get current location: ' + err.message);
          setIsLoadingLocation(false);
        }
      );
    } else {
      setError('Geolocation is not supported by this browser');
      setIsLoadingLocation(false);
    }
  };

  const handleNext = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (step === 1 && !formData.address) {
      setError('Please provide a valid address');
      return;
    }
    if (step === 2 && (!formData.category || !formData.title || !formData.description)) {
      setError('Please fill in all required fields');
      return;
    }
    setError('');
    if (step < 3) setStep(step + 1);
  };

  const handlePrevious = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/incidents/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          address: formData.address || undefined,
          lat: formData.lat ? formData.lat.toString() : undefined,
          lng: formData.lng ? formData.lng.toString() : undefined,
          category: formData.category,
          severity: formData.severity || 'Medium',
        }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        // Handle validation errors that come as an array of objects
        let errorMessage = 'Failed to submit incident';
        if (data.message) {
          if (Array.isArray(data.message)) {
            // If message is an array of error objects, extract the messages
            errorMessage = data.message.map(err => err.message || err).join(', ');
          } else if (typeof data.message === 'string') {
            errorMessage = data.message;
          } else {
            errorMessage = JSON.stringify(data.message);
          }
        }
        throw new Error(errorMessage);
      }
      
      // Show success toast
      toast.success('🎉 ' + (data.message || 'Incident reported successfully!'), {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      setTimeout(() => {
        onClose();
        window.dispatchEvent(new CustomEvent('incidentCreated'));
      }, 1000);
    } catch (err) {
      console.error('Submission error:', err);
      // Handle error message properly
      let errorMessage = 'An error occurred while submitting the incident';
      if (err.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (typeof err === 'object' && err !== null) {
        errorMessage = JSON.stringify(err);
      }
      setError(errorMessage);
      
      // Show error toast
      toast.error('❌ ' + errorMessage, {
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

  return (
    <div 
      className="modern-report-form" 
      onClick={(e) => e.stopPropagation()}
    >
      {/* Progress indicator */}
      <div className="modern-progress">
        <div className="modern-progress__steps">
          <div className={`modern-progress__step ${step >= 1 ? 'modern-progress__step--active' : ''}`}>
            <span className="modern-progress__step-icon">📍</span>
            <span className="modern-progress__step-label">Location</span>
          </div>
          <div className={`modern-progress__step ${step >= 2 ? 'modern-progress__step--active' : ''}`}>
            <span className="modern-progress__step-icon">📋</span>
            <span className="modern-progress__step-label">Details</span>
          </div>
          <div className={`modern-progress__step ${step >= 3 ? 'modern-progress__step--active' : ''}`}>
            <span className="modern-progress__step-icon">✅</span>
            <span className="modern-progress__step-label">Review</span>
          </div>
        </div>
        <div className="modern-progress__bar">
          <div 
            className="modern-progress__fill" 
            style={{ width: `${((step - 1) / 2) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="modern-alert modern-alert--error" role="alert">
          <span className="modern-alert__icon">❌</span>
          <span className="modern-alert__message">{error}</span>
        </div>
      )}
      
      {/* Step 1: Location */}
      {step === 1 && (
        <div className="modern-step modern-step--active">
          <div className="modern-step__header">
            <h3 className="modern-step__title">
              <span className="modern-step__icon">📍</span>
              Where did this happen?
            </h3>
            <p className="modern-step__description">
              Provide the location details for the incident
            </p>
          </div>

          <div className="modern-step__content">
            <div className="modern-form-group">
              <label htmlFor="address" className="modern-form-label">
                <span className="modern-form-label__icon">🏠</span>
                Address or Description
              </label>
              <div className="modern-form-input-wrapper">
                <input
                  type="text"
                  id="address"
                  name="address"
                  className="modern-form-input"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter address or landmark description"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="modern-form-grid">
              <div className="modern-form-group">
                <label htmlFor="lat" className="modern-form-label">
                  <span className="modern-form-label__icon">🌐</span>
                  Latitude
                </label>
                <div className="modern-form-input-wrapper">
                  <input
                    type="number"
                    id="lat"
                    name="lat"
                    className="modern-form-input"
                    value={formData.lat}
                    onChange={handleInputChange}
                    placeholder="Auto-filled"
                    step="any"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="modern-form-group">
                <label htmlFor="lng" className="modern-form-label">
                  <span className="modern-form-label__icon">🌐</span>
                  Longitude
                </label>
                <div className="modern-form-input-wrapper">
                  <input
                    type="number"
                    id="lng"
                    name="lng"
                    className="modern-form-input"
                    value={formData.lng}
                    onChange={handleInputChange}
                    placeholder="Auto-filled"
                    step="any"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              className={`modern-btn modern-btn--secondary modern-btn--location ${isLoadingLocation ? 'modern-btn--loading' : ''}`}
              onClick={handleUseCurrentLocation}
              disabled={isLoadingLocation || isSubmitting}
            >
              {isLoadingLocation ? (
                <>
                  <span className="modern-btn__spinner"></span>
                  Getting location...
                </>
              ) : (
                <>
                  <span className="modern-btn__icon">📍</span>
                  Use Current Location
                </>
              )}
            </button>
          </div>
        </div>
      )}
      
      {/* Step 2: Category & Details */}
      {step === 2 && (
        <div className="modern-step modern-step--active">
          <div className="modern-step__header">
            <h3 className="modern-step__title">
              <span className="modern-step__icon">📋</span>
              Tell us what happened
            </h3>
            <p className="modern-step__description">
              Provide details about the incident
            </p>
          </div>

          <div className="modern-step__content">
            <div className="modern-form-grid">
              <div className="modern-form-group">
                <label htmlFor="category" className="modern-form-label">
                  <span className="modern-form-label__icon">🏷️</span>
                  Category
                </label>
                <div className="modern-form-select-wrapper">
                  <select
                    id="category"
                    name="category"
                    className="modern-form-select"
                    value={formData.category}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  >
                    <option value="">Select a category</option>
                    <option value="Crime">🚔 Crime</option>
                    <option value="Accident">🚗 Accident</option>
                    <option value="Lost">🔍 Lost Item/Person</option>
                    <option value="Utility">⚡ Utility Issue</option>
                    <option value="Other">📝 Other</option>
                  </select>
                </div>
              </div>

              <div className="modern-form-group">
                <label htmlFor="severity" className="modern-form-label">
                  <span className="modern-form-label__icon">⚠️</span>
                  Severity Level
                </label>
                <div className="modern-form-select-wrapper">
                  <select
                    id="severity"
                    name="severity"
                    className="modern-form-select"
                    value={formData.severity}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  >
                    <option value="">Select severity</option>
                    <option value="Low">🟢 Low</option>
                    <option value="Medium">🟡 Medium</option>
                    <option value="High">🔴 High</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modern-form-group">
              <label htmlFor="title" className="modern-form-label">
                <span className="modern-form-label__icon">📝</span>
                Incident Title
              </label>
              <div className="modern-form-input-wrapper">
                <input
                  type="text"
                  id="title"
                  name="title"
                  className="modern-form-input"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Brief title describing the incident"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="modern-form-group">
              <label htmlFor="description" className="modern-form-label">
                <span className="modern-form-label__icon">📖</span>
                Description
              </label>
              <div className="modern-form-textarea-wrapper">
                <textarea
                  id="description"
                  name="description"
                  className="modern-form-textarea"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Provide detailed information about what happened"
                  maxLength="500"
                  rows="4"
                  disabled={isSubmitting}
                ></textarea>
                <div className="modern-form-helper">
                  <span className="modern-form-counter">
                    {formData.description.length}/500 characters
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Step 3: Review */}
      {step === 3 && (
        <div className="modern-step modern-step--active">
          <div className="modern-step__header">
            <h3 className="modern-step__title">
              <span className="modern-step__icon">✅</span>
              Review & Submit
            </h3>
            <p className="modern-step__description">
              Please review your incident report before submitting
            </p>
          </div>

          <div className="modern-step__content">
            <div className="modern-review-card">
              <div className="modern-review-item">
                <span className="modern-review-label">Title:</span>
                <span className="modern-review-value">{formData.title}</span>
              </div>
              <div className="modern-review-item">
                <span className="modern-review-label">Category:</span>
                <span className="modern-review-value">{formData.category}</span>
              </div>
              <div className="modern-review-item">
                <span className="modern-review-label">Severity:</span>
                <span className="modern-review-value">{formData.severity}</span>
              </div>
              <div className="modern-review-item">
                <span className="modern-review-label">Location:</span>
                <span className="modern-review-value">{formData.address}</span>
              </div>
              {(formData.lat && formData.lng) && (
                <div className="modern-review-item">
                  <span className="modern-review-label">Coordinates:</span>
                  <span className="modern-review-value">({formData.lat}, {formData.lng})</span>
                </div>
              )}
              <div className="modern-review-item modern-review-item--full">
                <span className="modern-review-label">Description:</span>
                <p className="modern-review-description">{formData.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Navigation Actions */}
      <div className="modern-actions">
        {step > 1 && (
          <button 
            type="button"
            className="modern-btn modern-btn--outline" 
            onClick={handlePrevious}
            disabled={isSubmitting}
          >
            <span className="modern-btn__icon">←</span>
            Previous
          </button>
        )}
        
        <div className="modern-actions__spacer"></div>
        
        {step < 3 && (
          <button 
            type="button"
            className="modern-btn modern-btn--primary" 
            onClick={handleNext}
            disabled={isSubmitting}
          >
            Next
            <span className="modern-btn__icon">→</span>
          </button>
        )}
        
        {step === 3 && (
          <button 
            type="button"
            className={`modern-btn modern-btn--primary modern-btn--submit ${isSubmitting ? 'modern-btn--loading' : ''}`}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="modern-btn__spinner"></span>
                Submitting...
              </>
            ) : (
              <>
                <span className="modern-btn__icon">🚀</span>
                Submit Report
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default ReportIncidentForm;