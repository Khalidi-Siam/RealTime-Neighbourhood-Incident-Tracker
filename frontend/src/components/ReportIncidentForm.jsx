import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import { toast } from 'react-toastify';

function ReportIncidentForm({ onClose }) {
  const { currentUser } = useContext(AuthContext);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    address: '',
    lat: '',
    lng: '',
    category: '',
    severity: '',
    title: '',
    description: '',
  });
  const [error, setError] = useState('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

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
      toast.success(data.message || 'Incident reported successfully!', {
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
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  return (
    <form 
      className="report-form" 
      onSubmit={(e) => e.preventDefault()}
      onClick={(e) => e.stopPropagation()}
    >
      {error && <div className="alert alert--error">{error}</div>}
      
      {step === 1 && (
        <div className="report-form__step">
          <h3>📍 Location</h3>
          <div className="form-group">
            <label htmlFor="address">Address or Description</label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Enter address or description"
            />
          </div>
          <div className="form-group">
            <label htmlFor="lat">Latitude</label>
            <input
              type="number"
              id="lat"
              name="lat"
              value={formData.lat}
              onChange={handleInputChange}
              placeholder="Latitude"
            />
          </div>
          <div className="form-group">
            <label htmlFor="lng">Longitude</label>
            <input
              type="number"
              id="lng"
              name="lng"
              value={formData.lng}
              onChange={handleInputChange}
              placeholder="Longitude"
            />
          </div>
          <button
            className="btn btn--secondary"
            onClick={handleUseCurrentLocation}
            disabled={isLoadingLocation}
          >
            <span role="img" aria-label="Use Current Location">📍</span>
            {isLoadingLocation ? 'Loading...' : 'Use Current Location'}
          </button>
        </div>
      )}
      
      {step === 2 && (
        <div className="report-form__step">
          <h3>📋 Category & Details</h3>
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
            >
              <option value="">Select a category</option>
              <option>Crime</option>
              <option>Accident</option>
              <option>Lost</option>
              <option>Utility</option>
              <option>Other</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="severity">Severity</label>
            <select
              id="severity"
              name="severity"
              value={formData.severity}
              onChange={handleInputChange}
            >
              <option value="">Select severity</option>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter incident title"
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe the incident"
              maxLength="500"
            ></textarea>
            <small>{formData.description.length}/500 characters</small>
          </div>
        </div>
      )}
      
      {step === 3 && (
        <div className="report-form__step">
          <h3>✅ Review & Submit</h3>
          <div className="report-form__review">
            <p><strong>Title:</strong> {formData.title}</p>
            <p><strong>Description:</strong> {formData.description}</p>
            <p><strong>Category:</strong> {formData.category}</p>
            <p><strong>Severity:</strong> {formData.severity}</p>
            <p><strong>Location:</strong> {formData.address}</p>
            <p><strong>Coordinates:</strong> ({formData.lat}, {formData.lng})</p>
          </div>
        </div>
      )}
      
      <div className="report-form__actions">
        {step > 1 && (
          <button className="btn btn--secondary" onClick={handlePrevious}>
            ← Previous
          </button>
        )}
        {step < 3 && (
          <button className="btn btn--primary" onClick={handleNext}>
            Next →
          </button>
        )}
        {step === 3 && (
          <button className="btn btn--primary" onClick={handleSubmit}>
            Submit Report
          </button>
        )}
      </div>
    </form>
  );
}

export default ReportIncidentForm;