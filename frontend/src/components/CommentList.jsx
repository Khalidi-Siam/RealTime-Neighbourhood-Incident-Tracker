import { useState, useEffect } from 'react';
import { useContext } from 'react';
import { createPortal } from 'react-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { commentsAPI } from '../utils/api.js';
import { useSocket } from '../context/SocketContext.jsx';
import { toast } from 'react-toastify';
import { getRelativeTime } from '../utils/timeUtils.js';
import ConfirmModal from './ConfirmModal.jsx';
import ReplyForm from './ReplyForm.jsx';

function CommentList({ incidentId }) {
  const { token, currentUser } = useContext(AuthContext);
  const { socket, joinIncidentRoom, leaveIncidentRoom } = useSocket();
  const [comments, setComments] = useState([]);
  const [error, setError] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [replyingToId, setReplyingToId] = useState(null);

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
      }
    };

    // Listen for new replies
    const handleNewReply = (data) => {
      if (data.incidentId === incidentId) {
        console.log('New reply received:', data);
        
        // Update the comment's replies array
        setComments(prevComments => {
          const updateCommentsRecursively = (comments) => {
            return comments.map(comment => {
              if (comment._id === data.parentCommentId) {
                return {
                  ...comment,
                  replies: [...(comment.replies || []), data.reply]
                };
              } else if (comment.replies && comment.replies.length > 0) {
                return {
                  ...comment,
                  replies: updateCommentsRecursively(comment.replies)
                };
              }
              return comment;
            });
          };
          return updateCommentsRecursively(prevComments);
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
      }
    };

    // Register event listeners
    socket.on('new-comment', handleNewComment);
    socket.on('new-reply', handleNewReply);
    socket.on('comment-updated', handleCommentUpdate);
    socket.on('comment-deleted', handleCommentDeleted);

    // Cleanup
    return () => {
      socket.off('new-comment', handleNewComment);
      socket.off('new-reply', handleNewReply);
      socket.off('comment-updated', handleCommentUpdate);
      socket.off('comment-deleted', handleCommentDeleted);
      leaveIncidentRoom(incidentId);
    };
  }, [socket, incidentId, joinIncidentRoom, leaveIncidentRoom]);

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.comment__menu-container')) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Check if user can delete a comment (owner or admin)
  const canDeleteComment = (comment) => {
    if (!currentUser) return false;
    return currentUser.id === comment.user._id || currentUser.role === 'admin';
  };

  // Handle comment deletion
  const handleDeleteComment = async (commentId) => {
    setCommentToDelete(commentId);
    setShowConfirmModal(true);
    setOpenMenuId(null); // Close the menu
  };

  // Confirm and execute deletion
  const confirmDeleteComment = async () => {
    if (!commentToDelete) return;

    try {
      await commentsAPI.delete(commentToDelete);
      
      // Remove comment from local state
      setComments(prevComments => prevComments.filter(comment => comment._id !== commentToDelete));
      
      toast.success('Comment deleted successfully!', {
        position: "top-right",
        autoClose: 3000,
      });
      
      setShowConfirmModal(false);
      setCommentToDelete(null);
    } catch (err) {
      const errorMessage = err.message || 'Failed to delete comment';
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 4000,
      });
      
      setShowConfirmModal(false);
      setCommentToDelete(null);
    }
  };

  // Cancel deletion
  const cancelDeleteComment = () => {
    setShowConfirmModal(false);
    setCommentToDelete(null);
  };

  // Handle starting a reply
  const handleStartReply = (commentId) => {
    setReplyingToId(commentId);
    setOpenMenuId(null); // Close any open menu
  };

  // Handle canceling a reply
  const handleCancelReply = () => {
    setReplyingToId(null);
  };

  // Handle reply submission (for real-time updates)
  const handleReplySubmitted = (reply) => {
    // Reply will be added via socket event, so we just need to close the form
    setReplyingToId(null);
  };

  // Recursive component to render comments and their replies
  const renderComment = (comment, depth = 0) => (
    <div key={comment._id || comment.id} className={`comment comment--depth-${Math.min(depth, 5)}`}>
      <div className="comment__header">
        <span className="comment__author">{comment.user.username}</span>
        <div className="comment__meta">
          <span className="comment__date">
            {getRelativeTime(comment.createdAt)}
          </span>
          {canDeleteComment(comment) && (
            <div className="comment__menu-container">
              <button
                className="comment__menu-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(openMenuId === comment._id ? null : comment._id);
                }}
                title="Comment options"
                aria-label="Comment options"
              >
                ⋮
              </button>
              {openMenuId === comment._id && (
                <div className="comment__menu-dropdown">
                  <button
                    className="comment__menu-item comment__menu-item--delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteComment(comment._id);
                    }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <p className="comment__content">{comment.text}</p>
      
      {/* Reply button */}
      {currentUser && depth < 5 && (
        <div className="comment__actions">
          <button 
            className="comment__reply-btn"
            onClick={() => handleStartReply(comment._id)}
          >
            💬 Reply
          </button>
        </div>
      )}
      
      {/* Reply form */}
      {replyingToId === comment._id && (
        <div className="comment__reply-form">
          <ReplyForm 
            commentId={comment._id}
            onReplySubmitted={handleReplySubmitted}
            onCancel={handleCancelReply}
          />
        </div>
      )}
      
      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="comment__replies">
          {comment.replies.map(reply => renderComment(reply, depth + 1))}
        </div>
      )}
    </div>
  );

  return (
    <div className="comment-list">
      {error && <div className="alert alert--error">{error}</div>}
      {comments.length === 0 ? (
        <p className="comment-list__empty">No comments yet</p>
      ) : (
        comments.map((comment) => renderComment(comment, 0))
      )}
      
      {/* Confirmation Modal for Comment Deletion - Rendered at document body level */}
      {showConfirmModal && createPortal(
        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={cancelDeleteComment}
          onConfirm={confirmDeleteComment}
          title="Delete Comment"
          message="Are you sure you want to delete this comment? This action cannot be undone and will also delete all replies."
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />,
        document.body
      )}
    </div>
  );
}

export default CommentList;
