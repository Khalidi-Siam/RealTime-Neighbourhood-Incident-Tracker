import { useState, useContext, forwardRef } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import CommentList from './CommentList.jsx';
import CommentForm from './CommentForm.jsx';
import { toast } from 'react-toastify';

// Category colors and icons mapping
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

const IncidentCard = forwardRef(({ incident, onSelect, isSelected }, ref) => {
  const { currentUser, token } = useContext(AuthContext);
  
  const [votes, setVotes] = useState({
    upvotes: incident.votes.upvotes || 0,
    downvotes: incident.votes.downvotes || 0,
    userVote: incident.votes.userVote || null,
  });
  const [showComments, setShowComments] = useState(false);
  const [error, setError] = useState('');

  // Get category configuration
  const getCategoryConfig = (category) => {
    return categoryConfig[category] || categoryConfig['Other'];
  };

  const categoryInfo = getCategoryConfig(incident.category);

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
      const response = await fetch(`http://localhost:3000/api/incidents/${incident._id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ voteType }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('Vote response:', data); // Debug log
      
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
    <div ref={ref} className={`incident-card ${isSelected ? 'incident-card--selected' : ''}`}>
      <div className="incident-card__header">
        <span 
          className="incident-card__category" 
          style={{
            backgroundColor: `${categoryInfo.color}20`,
            color: categoryInfo.color,
            borderColor: `${categoryInfo.color}40`
          }}
        >
          {categoryInfo.icon} {incident.category}
        </span>
        {incident.severity && (
          <span className={`incident-card__severity incident-card__severity--${incident.severity.toLowerCase()}`}>
            {incident.severity}
          </span>
        )}
        {!incident.severity && (
          <span className="incident-card__severity incident-card__severity--medium">
            Medium
          </span>
        )}
      </div>
      <h4 className="incident-card__title">{incident.title}</h4>
      <div className="incident-card__description">
        {incident.description}
      </div>
      <div className="incident-card__stats">
        <div className="incident-card__stat">
          <span role="img" aria-label="Location">📍</span>
          {incident.location.address || 'Location not specified'}
        </div>
        <div className="incident-card__time">
          Reported by {incident.submittedBy?.username || 'Anonymous'} on{' '}
          {new Date(incident.timestamp).toLocaleDateString()}
        </div>
      </div>
      <div className="incident-card__footer">
        <div className="incident-card__votes">
          <button
            className={`btn btn--icon ${votes.userVote === 'upvote' ? 'btn--active' : ''}`}
            onClick={() => handleVote('upvote')}
            title="Upvote"
          >
            <span role="img" aria-label="Upvote">👍</span> {votes.upvotes}
          </button>
          <button
            className={`btn btn--icon ${votes.userVote === 'downvote' ? 'btn--active' : ''}`}
            onClick={() => handleVote('downvote')}
            title="Downvote"
          >
            <span role="img" aria-label="Downvote">👎</span> {votes.downvotes}
          </button>
        </div>
        <div className="incident-card__comments">
          <button
            className="btn btn--icon"
            onClick={() => setShowComments(!showComments)}
            title={showComments ? 'Hide comments' : 'Show comments'}
          >
            <span role="img" aria-label="Comments">💬</span>
            {showComments ? 'Hide' : 'Show'} Comments
          </button>
        </div>
        <button className="btn btn--icon" onClick={onSelect} title="Details">
          <span role="img" aria-label="Details">🔄</span>
        </button>
      </div>
      {error && <div className="alert alert--error">{error}</div>}
      {showComments && (
        <div className="incident-card__comments-section">
          <CommentList incidentId={incident._id} />
          {currentUser && <CommentForm incidentId={incident._id} />}
        </div>
      )}
    </div>
  );
});

IncidentCard.displayName = 'IncidentCard';

export default IncidentCard;