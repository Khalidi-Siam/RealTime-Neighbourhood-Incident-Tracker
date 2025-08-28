import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import { incidentsAPI } from '../utils/api.js';
import { useSocket } from '../context/SocketContext.jsx';
import { toast } from 'react-toastify';

// Category colors and icons mapping - same as IncidentCard
const categoryConfig = {
  'Crime': { color: '#e53e3e', icon: '🚨' },
  'Accident': { color: '#d69e2e', icon: '💥' },
  'Lost': { color: '#38a169', icon: '🔍' },
  'Utility': { color: '#3182ce', icon: '⚡' },
  'Fire': { color: '#ff6b35', icon: '🔥' },
  'Infrastructure': { color: '#4a5568', icon: '🏗️' },
  'Other': { color: '#6b7280', icon: '📝' }
};

function IncidentDetailsModal({ incident, onClose }) {
  const { currentUser, token } = useContext(AuthContext);
  const { socket, joinIncidentRoom, leaveIncidentRoom } = useSocket();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await incidentsAPI.getById(incident._id);
        setDetails({ ...data.incident, severity: incident.severity });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [incident]);

  // Socket.IO real-time updates for this specific incident
  useEffect(() => {
    if (!socket || !incident?._id) return;

    // Join the specific incident room
    joinIncidentRoom(incident._id);

    // Listen for incident deletion
    const handleIncidentDeleted = (data) => {
      if (data.incidentId === incident._id) {
        console.log('This incident was deleted:', data);
        toast.error(data.message || 'This incident has been deleted', {
          position: "top-right",
          autoClose: 3000,
        });
        onClose(); // Close the modal since the incident no longer exists
      }
    };

    // Register event listeners
    socket.on('incident-deleted', handleIncidentDeleted);

    // Cleanup
    return () => {
      socket.off('incident-deleted', handleIncidentDeleted);
      leaveIncidentRoom(incident._id);
    };
  }, [socket, incident?._id, joinIncidentRoom, leaveIncidentRoom, onClose]);

  // const handleDelete = async () => {
  //   if (!currentUser || currentUser.role !== 'admin') {
  //     setError('Only admins can delete incidents');
  //     return;
  //   }

  //   setError('');
  //   setSuccess('');
  //   try {
  //     const token = localStorage.getItem('token');
  //     const response = await fetch(`http://localhost:3000/api/incidents/${incident._id}`, {
  //       method: 'DELETE',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         Authorization: `Bearer ${token}`,
  //       },
  //     });
  //     const data = await response.json();
  //     if (!response.ok) {
  //       throw new Error(data.message || 'Failed to delete incident');
  //     }
  //     setSuccess(data.message);
  //     setTimeout(() => {
  //       onClose();
  //       window.dispatchEvent(new CustomEvent('incidentCreated')); // Trigger refresh
  //     }, 1000);
  //   } catch (err) {
  //     setError(err.message);
  //   }
  // };

  if (loading) {
    return (
      <div className="incident-details__loading">
        <div className="loading-spinner"></div>
        <p>Loading incident details...</p>
      </div>
    );
  }
  
  if (!details) return null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'low': return '🟢';
      case 'medium': return '🟡';
      case 'high': return '🔴';
      default: return '⚪';
    }
  };

  const getCategoryConfig = (category) => {
    return categoryConfig[category] || categoryConfig['Other'];
  };

  const categoryInfo = getCategoryConfig(details.category);

  return (
    <div className="incident-details">
      {error && <div className="incident-details__alert incident-details__alert--error">{error}</div>}
      {success && <div className="incident-details__alert incident-details__alert--success">{success}</div>}
      
      {/* Main Content */}
      <div className="incident-details__content">
        {/* Title and Badges */}
        <div className="incident-details__header">
          <h2 className="incident-details__title">{details.title}</h2>
          <div className="incident-details__meta">
            <span 
              className="incident-details__category"
              style={{ 
                backgroundColor: `${categoryInfo.color}15`, 
                borderColor: `${categoryInfo.color}40`,
                color: categoryInfo.color 
              }}
            >
              {categoryInfo.icon} {details.category}
            </span>
            <span className={`incident-details__severity incident-details__severity--${details.severity?.toLowerCase()}`}>
              {getSeverityIcon(details.severity)} {details.severity}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="incident-details__description">
          {details.description}
        </div>

        {/* Details Grid */}
        <div className="incident-details__grid">
          <div className="incident-details__item">
            <span className="incident-details__label">📍 Location</span>
            <span className="incident-details__value">
              {details.location.address || 'Location not specified'}
            </span>
          </div>
          
          <div className="incident-details__item">
            <span className="incident-details__label">👤 Reported by</span>
            <span className="incident-details__value">
              {details.submittedBy?.username || 'Anonymous'}
            </span>
          </div>
          
          <div className="incident-details__item">
            <span className="incident-details__label">� Date & Time</span>
            <span className="incident-details__value">
              {formatDate(details.timestamp)}
            </span>
          </div>

          {details.location.coordinates && (
            <div className="incident-details__item">
              <span className="incident-details__label">🌐 Coordinates</span>
              <span className="incident-details__value incident-details__value--mono">
                {details.location.coordinates[1].toFixed(6)}, {details.location.coordinates[0].toFixed(6)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default IncidentDetailsModal;