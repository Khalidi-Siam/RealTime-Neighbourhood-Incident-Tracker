import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

function IncidentDetailsModal({ incident, onClose }) {
  const { currentUser } = useContext(AuthContext);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3000/api/incidents/${incident._id}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        
        // Check if response is actually JSON before parsing
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const textResponse = await response.text();
          throw new Error(`Server returned non-JSON response: ${textResponse.substring(0, 100)}`);
        }
        
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch incident details');
        }
        setDetails({ ...data.incident, severity: incident.severity });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [incident]);

  const handleDelete = async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      setError('Only admins can delete incidents');
      return;
    }

    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/incidents/${incident._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete incident');
      }
      setSuccess(data.message);
      setTimeout(() => {
        onClose();
        window.dispatchEvent(new CustomEvent('incidentCreated')); // Trigger refresh
      }, 1000);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!details) return null;

  return (
    <div className="incident-details">
      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">{success}</div>}
      <h3>{details.title}</h3>
      <div className="incident-details__meta">
        <span className="incident-details__category">{details.category}</span>
        <span className={`incident-details__severity incident-details__severity--${details.severity.toLowerCase()}`}>
          {details.severity}
        </span>
      </div>
      <p>{details.description}</p>
      <div className="incident-details__location">
        <span role="img" aria-label="Location">📍</span>
        {details.location.address || 'Location not specified'}
      </div>
      <div className="incident-details__reported">
        Reported by {details.submittedBy?.username || 'Anonymous'} on{' '}
        {new Date(details.timestamp).toLocaleDateString()}
      </div>
      <div className="incident-details__votes">
        <span>{details.votes.upvotes} Upvotes</span>
        <span>{details.votes.downvotes} Downvotes</span>
      </div>
      {currentUser && currentUser.role === 'admin' && (
        <button className="btn btn--error" onClick={handleDelete}>
          Delete Incident
        </button>
      )}
    </div>
  );
}

export default IncidentDetailsModal;