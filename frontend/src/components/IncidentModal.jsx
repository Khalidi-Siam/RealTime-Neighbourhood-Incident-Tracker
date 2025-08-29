import { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { incidentsAPI, commentsAPI } from '../utils/api.js';
import { useSocket } from '../context/SocketContext.jsx';
import { toast } from 'react-toastify';
import { getRelativeTime } from '../utils/timeUtils.js';
import ConfirmModal from './ConfirmModal.jsx';
import ReplyForm from './ReplyForm.jsx';

// Category colors and icons mapping
const categoryConfig = {
  'Crime': { color: '#e53e3e', icon: '🚨' },
  'Accident': { color: '#d69e2e', icon: '💥' },
  'Lost': { color: '#38a169', icon: '🔍' },
  'Utility': { color: '#3182ce', icon: '⚡' },
  'Fire': { color: '#ff6b35', icon: '🔥' },
  'Infrastructure': { color: '#4a5568', icon: '🏗️' },
  'Other': { color: '#6b7280', icon: '📝' }
};

function IncidentModal({ incident, isOpen, onClose, initialFocus = 'details' }) {
  const { token, currentUser } = useContext(AuthContext);
  const { socket, joinIncidentRoom, leaveIncidentRoom } = useSocket();
  
  // Modal state
  const [activeTab, setActiveTab] = useState(initialFocus);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Comments state
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [replyingToId, setReplyingToId] = useState(null);
  const [expandedComments, setExpandedComments] = useState(new Set());
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set initial focus when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialFocus);
    }
  }, [isOpen, initialFocus]);

  // Fetch incident details when modal opens
  useEffect(() => {
    if (isOpen && incident?._id) {
      fetchIncidentDetails();
    }
  }, [isOpen, incident?._id, token]);

  // Fetch comments when switching to comments tab
  useEffect(() => {
    if (isOpen && incident?._id && activeTab === 'comments') {
      fetchComments();
    }
  }, [isOpen, incident?._id, activeTab, token]);

  // Socket.IO real-time updates
  useEffect(() => {
    if (!socket || !incident?._id || !isOpen) return;

    joinIncidentRoom(incident._id);

    // Listen for incident deletion
    const handleIncidentDeleted = (data) => {
      if (data.incidentId === incident._id) {
        console.log('This incident was deleted:', data);
        onClose();
      }
    };

    // Listen for new comments
    const handleNewComment = (data) => {
      if (data.incidentId === incident._id) {
        console.log('New comment received:', data);
        setComments(prevComments => [data.comment, ...prevComments]);
      }
    };

    // Listen for new replies
    const handleNewReply = (data) => {
      if (data.incidentId === incident._id) {
        console.log('New reply received:', data);
        
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
      if (data.incidentId === incident._id) {
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
      if (data.incidentId === incident._id) {
        console.log('Comment deleted:', data);
        setComments(prevComments => 
          prevComments.filter(comment => comment._id !== data.commentId)
        );
      }
    };

    // Register event listeners
    socket.on('incident-deleted', handleIncidentDeleted);
    socket.on('new-comment', handleNewComment);
    socket.on('new-reply', handleNewReply);
    socket.on('comment-updated', handleCommentUpdate);
    socket.on('comment-deleted', handleCommentDeleted);

    // Cleanup
    return () => {
      socket.off('incident-deleted', handleIncidentDeleted);
      socket.off('new-comment', handleNewComment);
      socket.off('new-reply', handleNewReply);
      socket.off('comment-updated', handleCommentUpdate);
      socket.off('comment-deleted', handleCommentDeleted);
      leaveIncidentRoom(incident._id);
    };
  }, [socket, incident?._id, isOpen, joinIncidentRoom, leaveIncidentRoom, onClose]);

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

  const fetchIncidentDetails = async () => {
    setLoading(true);
    try {
      const data = await incidentsAPI.getById(incident._id);
      setDetails({ ...data.incident, severity: incident.severity });
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load incident details');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    setCommentsLoading(true);
    try {
      const { comments } = await commentsAPI.getByIncident(incident._id);
      console.log('Fetched comments:', comments);
      setComments(comments);
      setCommentsError('');
    } catch (err) {
      const errorMessage = err.message || 'Failed to load comments';
      setCommentsError(errorMessage);
      console.error('Comments fetch error:', errorMessage);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Check if user can delete a comment (owner or admin)
  const canDeleteComment = (comment) => {
    if (!currentUser) return false;
    return currentUser.id === comment.user._id || currentUser.role === 'admin';
  };

  // Handle comment deletion
  const handleDeleteComment = async (commentId) => {
    setCommentToDelete(commentId);
    setShowConfirmModal(true);
    setOpenMenuId(null);
  };

  // Confirm and execute deletion
  const confirmDeleteComment = async () => {
    if (!commentToDelete) return;

    try {
      await commentsAPI.delete(commentToDelete);
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
    setOpenMenuId(null);
  };

  // Handle canceling a reply
  const handleCancelReply = () => {
    setReplyingToId(null);
  };

  // Handle reply submission
  const handleReplySubmitted = (reply) => {
    setReplyingToId(null);
  };

  // Toggle comment expansion
  const toggleCommentExpansion = (commentId) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  // Handle new comment submission
  const handleNewCommentSubmit = async (e) => {
    e.preventDefault();
    
    if (!token) {
      toast.warn('Please log in to post comments', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }
    
    if (!newComment.trim()) {
      toast.error('Comment cannot be empty', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const data = await commentsAPI.create(incident._id, newComment);
      console.log('Posted comment data:', data);
      setNewComment('');
      
      toast.success('Comment posted successfully!', {
        position: "top-right",
        autoClose: 2000,
      });
      
    } catch (err) {
      const errorMessage = err.message || 'Failed to post comment';
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Count total replies recursively
  const countReplies = (comment) => {
    if (!comment.replies || comment.replies.length === 0) return 0;
    return comment.replies.length + comment.replies.reduce((total, reply) => total + countReplies(reply), 0);
  };

  // Recursive component to render comments
  const renderComment = (comment, depth = 0, isLast = false) => {
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isExpanded = expandedComments.has(comment._id);
    const replyCount = countReplies(comment);
    
    return (
      <div key={comment._id || comment.id} className={`comment-thread ${depth > 0 ? 'comment-thread--nested' : ''}`}>
        <div className="comment-container">
          {depth > 0 && (
            <div className="comment-thread-line">
              <div className="thread-line thread-line--vertical"></div>
              {!isLast && <div className="thread-line thread-line--continue"></div>}
            </div>
          )}
          
          <div className="comment-content-wrapper">
            <div className="comment">
              <div className="comment__header">
                <div className="comment__author-info">
                  <span className="comment__author">{comment.user.username}</span>
                  <span className="comment__date">{getRelativeTime(comment.createdAt)}</span>
                </div>
                
                <div className="comment__actions">
                  {canDeleteComment(comment) && (
                    <div className="comment__menu-container">
                      <button
                        className="comment__menu-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === comment._id ? null : comment._id);
                        }}
                        title="Comment options"
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
              
              <p className="comment__text">{comment.text}</p>
              
              <div className="comment__footer">
                {currentUser && (
                  <button 
                    className="comment__reply-btn"
                    onClick={() => handleStartReply(comment._id)}
                  >
                    💬 Reply
                  </button>
                )}
                
                {hasReplies && (
                  <button 
                    className="comment__expand-btn"
                    onClick={() => toggleCommentExpansion(comment._id)}
                  >
                    {isExpanded ? '🔼' : '🔽'} {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                  </button>
                )}
              </div>
              
              {replyingToId === comment._id && (
                <div className="comment__reply-form">
                  <ReplyForm 
                    commentId={comment._id}
                    onReplySubmitted={handleReplySubmitted}
                    onCancel={handleCancelReply}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        
        {hasReplies && isExpanded && (
          <div className="comment-replies">
            {comment.replies.map((reply, index) => 
              renderComment(reply, depth + 1, index === comment.replies.length - 1)
            )}
          </div>
        )}
      </div>
    );
  };

  // Format date helper
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

  // Get severity icon helper
  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'low': return '🟢';
      case 'medium': return '🟡';
      case 'high': return '🔴';
      default: return '⚪';
    }
  };

  // Get category config helper
  const getCategoryConfig = (category) => {
    return categoryConfig[category] || categoryConfig['Other'];
  };

  if (!isOpen) return null;

  const categoryInfo = getCategoryConfig(details?.category || incident.category);

  return createPortal(
    <div 
      className="modal-overlay" 
      onClick={(e) => {
        // Only close if clicking directly on the overlay, not on modal content
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="incident-modal" onClick={(e) => e.stopPropagation()}>
        <div className="incident-modal__header">
          <div className="incident-modal__tabs">
            <button 
              className={`tab-btn ${activeTab === 'details' ? 'tab-btn--active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              📋 Details
            </button>
            <button 
              className={`tab-btn ${activeTab === 'comments' ? 'tab-btn--active' : ''}`}
              onClick={() => setActiveTab('comments')}
            >
              💬 Comments ({comments.length})
            </button>
          </div>
          <button 
            className="modal__close" 
            onClick={onClose}
            type="button"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        
        <div className="incident-modal__content">
          {activeTab === 'details' && (
            <div className="incident-details-section">
              {loading && (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Loading incident details...</p>
                </div>
              )}
              
              {error && <div className="alert alert--error">{error}</div>}
              
              {details && (
                <div className="incident-details">
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

                  <div className="incident-details__description">
                    {details.description}
                  </div>

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
                      <span className="incident-details__label">📅 Date & Time</span>
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
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="comments-section">
              <div className="new-comment-form">
                <form onSubmit={handleNewCommentSubmit}>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="form-control"
                    rows="3"
                    disabled={isSubmitting}
                  />
                  <div className="new-comment-form__actions">
                    <button 
                      type="submit" 
                      className="btn btn--primary"
                      disabled={isSubmitting || !newComment.trim()}
                    >
                      {isSubmitting ? 'Posting...' : 'Post Comment'}
                    </button>
                  </div>
                </form>
              </div>
              
              <div className="comments-list">
                {commentsLoading && <div className="loading">Loading comments...</div>}
                {commentsError && <div className="alert alert--error">{commentsError}</div>}
                {comments.length === 0 && !commentsLoading && !commentsError ? (
                  <p className="comments-list__empty">No comments yet. Be the first to comment!</p>
                ) : (
                  <div className="comments-container">
                    {comments.map((comment) => renderComment(comment, 0))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {showConfirmModal && (
          <ConfirmModal
            isOpen={showConfirmModal}
            onClose={cancelDeleteComment}
            onConfirm={confirmDeleteComment}
            title="Delete Comment"
            message="Are you sure you want to delete this comment? This action cannot be undone and will also delete all replies."
            confirmText="Delete"
            cancelText="Cancel"
            type="danger"
          />
        )}
      </div>
    </div>,
    document.body
  );
}

export default IncidentModal;