import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import { incidentsAPI } from '../utils/api.js';
import { useSocket } from '../context/SocketContext.jsx';
import { toast } from 'react-toastify';

// Category colors and icons mapping - same as IncidentCard
const categoryConfig = {
  'Crime': { color: '#e53e3e', icon: '🚨' },
  'Accident': { color: '#d69e2e', icon: '🚦' },
  'Lost': { color: '#38a169', icon: '🔍' },
  'Utility': { color: '#3182ce', icon: '⚡' },
  'Other': { color: '#6b7280', icon: '📝' },
  'Safety': { color: '#e53e3e', icon: '🚨' },
  'Infrastructure': { color: '#4a5568', icon: '🏗️' },
  'Utilities': { color: '#3182ce', icon: '⚡' },
  'Traffic': { color: '#d69e2e', icon: '🚦' },
  'Animal': { color: '#38a169', icon: '🐕' },
  'Environment': { color: '#00b894', icon: '🌱' },
  'Noise': { color: '#a855f7', icon: '🔊' }
};

function IncidentDetailsModal({ incident, onClose }) {
  const { currentUser, token } = useContext(AuthContext);
  const { socket, joinIncidentRoom, leaveIncidentRoom } = useSocket();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [votes, setVotes] = useState({
    upvotes: 0,
    downvotes: 0,
    userVote: null,
  });

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await incidentsAPI.getById(incident._id);
        setDetails({ ...data.incident, severity: incident.severity });
        setVotes({
          upvotes: data.incident.votes.upvotes || 0,
          downvotes: data.incident.votes.downvotes || 0,
          userVote: data.incident.votes.userVote || null,
        });
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

    // Listen for vote updates on this incident
    const handleVoteUpdate = (data) => {
      if (data.incidentId === incident._id) {
        console.log('Vote updated for this incident:', data);
        
        // Preserve the current user's vote status, only update counts
        setVotes(prevVotes => {
          const updatedVotes = {
            upvotes: data.votes.upvotes,
            downvotes: data.votes.downvotes,
            total: data.votes.total,
            userVote: prevVotes.userVote // Keep existing userVote from current state
          };
          
          // If this vote update is from the current user, update their userVote
          if (currentUser && data.voterId === currentUser.id) {
            if (data.action === 'removed') {
              updatedVotes.userVote = null;
            } else {
              updatedVotes.userVote = data.voteType;
            }
          }
          
          return updatedVotes;
        });
      }
    };

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
    socket.on('vote-updated', handleVoteUpdate);
    socket.on('incident-deleted', handleIncidentDeleted);

    // Cleanup
    return () => {
      socket.off('vote-updated', handleVoteUpdate);
      socket.off('incident-deleted', handleIncidentDeleted);
      leaveIncidentRoom(incident._id);
    };
  }, [socket, incident?._id, joinIncidentRoom, leaveIncidentRoom, onClose]);

  const handleVote = async (voteType) => {
    if (!currentUser || !token) {
      toast.warn('Please log in to vote', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return;
    }
    
    // Store the previous vote state to determine if vote was added or removed
    const previousVote = votes.userVote;
    const isRemovingVote = previousVote === voteType;
    
    try {
      const data = await incidentsAPI.vote(incident._id, voteType);
      
      // Update votes state with the response data
      setVotes({
        upvotes: data.votes.upvotes,
        downvotes: data.votes.downvotes,
        userVote: data.votes.userVote,
      });
      setError('');
      
      // Show appropriate success toast based on vote action
      let message;
      if (isRemovingVote) {
        message = 'Vote removed successfully!';
      } else {
        message = `${voteType === 'upvote' ? 'Upvoted' : 'Downvoted'} successfully!`;
      }
      
      toast.success(message, {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (err) {
      console.error('Vote error:', err);
      const errorMessage = err.message || 'Failed to record vote';
      setError('');
      
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

        {/* Community Engagement Stats */}
        <div className="incident-details__stats">
          <div className="incident-details__stat">
            <span className="incident-details__stat-value">{votes.upvotes}</span>
            <span className="incident-details__stat-label">👍 Upvotes</span>
          </div>
          <div className="incident-details__stat">
            <span className="incident-details__stat-value">{votes.downvotes}</span>
            <span className="incident-details__stat-label">👎 Downvotes</span>
          </div>
        </div>
      </div>

      {/* Admin Actions */}
      {currentUser && currentUser.role === 'admin' && (
        <div className="incident-details__admin">
          <button className="incident-details__admin-btn">
            🗑️ Delete Incident
          </button>
        </div>
      )}
    </div>
  );
}

export default IncidentDetailsModal;