import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import { commentsAPI } from '../utils/api.js';
import { toast } from 'react-toastify';

function ReplyForm({ commentId, onReplySubmitted, onCancel }) {
  const { token } = useContext(AuthContext);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!token) {
      toast.warn('Please log in to post replies', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }
    
    if (!content.trim()) {
      setError('Reply cannot be empty');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const data = await commentsAPI.createReply(commentId, content);
      console.log('Posted reply data:', data);
      setContent('');
      setError('');
      
      // Show success toast
      toast.success('Reply posted successfully!', {
        position: "top-right",
        autoClose: 2000,
      });
      
      // Notify parent component
      if (onReplySubmitted) {
        onReplySubmitted(data.reply);
      }
      
      // Cancel the reply form
      if (onCancel) {
        onCancel();
      }
      
    } catch (err) {
      const errorMessage = err.message || 'Failed to post reply';
      setError(errorMessage);
      console.error('Reply post error:', errorMessage);
      
      // Show error toast
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="reply-form">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label sr-only" htmlFor={`reply-${commentId}`}>
            Add a reply
          </label>
          <textarea
            id={`reply-${commentId}`}
            className="form-control"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a reply..."
            rows="2"
            disabled={isSubmitting}
          />
        </div>
        {error && <div className="alert alert--error">{error}</div>}
        <div className="reply-form__actions">
          <button 
            type="submit" 
            className="btn btn--primary btn--small"
            disabled={isSubmitting || !content.trim()}
          >
            {isSubmitting ? 'Posting...' : 'Reply'}
          </button>
          <button 
            type="button" 
            className="btn btn--secondary btn--small"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default ReplyForm;