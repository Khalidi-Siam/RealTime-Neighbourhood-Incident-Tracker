import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import CommentList from './CommentList.jsx';
import CommentForm from './CommentForm.jsx';
import { toast } from 'react-toastify';

function IncidentCard({ incident, onSelect, isSelected }) {
  const { currentUser, token } = useContext(AuthContext);
  const [votes, setVotes] = useState({
    upvotes: incident.votes.upvotes || 0,
    downvotes: incident.votes.downvotes || 0,
    userVote: incident.votes.userVote || null,
  });
  const [showComments, setShowComments] = useState(false);
  const [error, setError] = useState('');

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
    <div className={`incident-card ${isSelected ? 'incident-card--selected' : ''}`}>
      <div className="incident-card__header">
        <h3>{incident.title}</h3>
        <div className="incident-card__meta">
          <span className="incident-card__category">{incident.category}</span>
          <span className={`incident-card__severity incident-card__severity--${incident.severity}`}>
            {incident.severity}
          </span>
        </div>
      </div>
      <div className="incident-card__body">
        <p>{incident.description}</p>
        <div className="incident-card__location">
          <span role="img" aria-label="Location">📍</span>
          {incident.location.address || 'Location not specified'}
        </div>
        <div className="incident-card__reported">
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
}

export default IncidentCard;