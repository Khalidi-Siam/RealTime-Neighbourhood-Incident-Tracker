import { useState, useEffect } from 'react';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

function CommentList({ incidentId }) {
  const { token } = useContext(AuthContext);
  const [comments, setComments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log(`Fetching comments for incident ${incidentId}`);
    const fetchComments = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/incidents/${incidentId}/comments`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        console.log('Comments response status:', response.status);
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`HTTP ${response.status}: ${text.slice(0, 100)}`);
        }
        const { comments } = await response.json();
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