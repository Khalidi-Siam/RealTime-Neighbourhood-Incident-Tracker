import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import { commentsAPI } from '../utils/api.js';
import { toast } from 'react-toastify';

function CommentForm({ incidentId }) {
  const { token } = useContext(AuthContext);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!token) {
      toast.warn('Please log in to post comments', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return;
    }
    
    if (!content.trim()) {
      setError('Comment cannot be empty');
      return;
    }
    try {
      const data = await commentsAPI.create(incidentId, content);
      console.log('Posted comment data:', data);
      setContent('');
      setError('');
      
      // Show success toast
      toast.success('Comment posted successfully!', {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      // Trigger re-fetch of comments by updating parent state (handled by CommentList)
    } catch (err) {
      const errorMessage = err.message || 'Failed to post comment';
      setError(errorMessage);
      console.error('Comment post error:', errorMessage);
      
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
    <div className="comment-form">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label sr-only" htmlFor={`comment-${incidentId}`}>
            Add a comment
          </label>
          <textarea
            id={`comment-${incidentId}`}
            className="form-control"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a comment..."
            rows="3"
          />
        </div>
        {error && <div className="alert alert--error">{error}</div>}
        <button type="submit" className="btn btn--primary btn--full-width">
          Post Comment
        </button>
      </form>
    </div>
  );
}

export default CommentForm;