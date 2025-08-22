import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { toast } from 'react-toastify';

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
        <div className="voting-actions">
          <button
            className={`btn btn--icon-only ${votes.userVote === 'upvote' ? 'btn--active' : ''}`}
            onClick={() => handleVote('upvote')}
            title={`Upvote (${votes.upvotes})`}
          >
            <span role="img" aria-label="Upvote">👍</span>
            <span className="vote-count">{votes.upvotes}</span>
          </button>
          <button
            className={`btn btn--icon-only ${votes.userVote === 'downvote' ? 'btn--active' : ''}`}
            onClick={() => handleVote('downvote')}
            title={`Downvote (${votes.downvotes})`}
          >
            <span role="img" aria-label="Downvote">👎</span>
            <span className="vote-count">{votes.downvotes}</span>
          </button>
        </div>
      </div>
      {/* {currentUser && currentUser.role === 'admin' && (
        <button className="btn btn--error" onClick={handleDelete}>
          Delete Incident
        </button>
      )} */}
    </div>
  );
}

export default IncidentDetailsModal;