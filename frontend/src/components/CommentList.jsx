import { useState, useEffect } from 'react';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import { commentsAPI } from '../utils/api.js';
import { useSocket } from '../context/SocketContext.jsx';
import { toast } from 'react-toastify';

function CommentList({ incidentId }) {
  const { token } = useContext(AuthContext);
  const { socket, joinIncidentRoom, leaveIncidentRoom } = useSocket();
  const [comments, setComments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log(`Fetching comments for incident ${incidentId}`);
    const fetchComments = async () => {
      try {
        const { comments } = await commentsAPI.getByIncident(incidentId);
        console.log('Fetched comments:', comments);
        setComments(comments);
      } catch (err) {
        const errorMessage = err.message || 'Failed to load comments';
        setError(errorMessage);
        console.error('Comments fetch error:', errorMessage);
      }
    };

    fetchComments();
  }, [incidentId, token]);

  // Socket.IO real-time updates for comments
  useEffect(() => {
    if (!socket || !incidentId) return;

    // Join the specific incident room for comment updates
    joinIncidentRoom(incidentId);

    // Listen for new comments
    const handleNewComment = (data) => {
      if (data.incidentId === incidentId) {
        console.log('New comment received:', data);
        setComments(prevComments => [data.comment, ...prevComments]);
        
        toast.success(data.message || 'New comment added!', {
          position: "top-right",
          autoClose: 3000,
        });
      }
    };

    // Listen for comment updates
    const handleCommentUpdate = (data) => {
      if (data.incidentId === incidentId) {
        console.log('Comment updated:', data);
        setComments(prevComments => 
          prevComments.map(comment => 
            comment._id === data.comment._id ? data.comment : comment
          )
        );
      }
    };

    // Listen for comment deletions
    const handleCommentDeleted = (data) => {
      if (data.incidentId === incidentId) {
        console.log('Comment deleted:', data);
        setComments(prevComments => 
          prevComments.filter(comment => comment._id !== data.commentId)
        );
        
        toast.info(data.message || 'Comment has been deleted', {
          position: "top-right",
          autoClose: 3000,
        });
      }
    };

    // Register event listeners
    socket.on('new-comment', handleNewComment);
    socket.on('comment-updated', handleCommentUpdate);
    socket.on('comment-deleted', handleCommentDeleted);

    // Cleanup
    return () => {
      socket.off('new-comment', handleNewComment);
      socket.off('comment-updated', handleCommentUpdate);
      socket.off('comment-deleted', handleCommentDeleted);
      leaveIncidentRoom(incidentId);
    };
  }, [socket, incidentId, joinIncidentRoom, leaveIncidentRoom]);

  return (
    <div className="comment-list">
      {error && <div className="alert alert--error">{error}</div>}
      {comments.length === 0 ? (
        <p className="comment-list__empty">No comments yet</p>
      ) : (
        comments.map((comment) => (
          <div key={comment.id} className="comment">
            <div className="comment__header">
              <span className="comment__author">{comment.user.username}</span>
              <span className="comment__date">
                {new Date(comment.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="comment__content">{comment.text}</p>
          </div>
        ))
      )}
    </div>
  );
}

export default CommentList;