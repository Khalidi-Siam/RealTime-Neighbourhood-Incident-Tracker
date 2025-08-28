import { useState, useContext, forwardRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { incidentsAPI } from '../utils/api.js';
import CommentList from './CommentList.jsx';
import CommentForm from './CommentForm.jsx';
import ConfirmModal from './ConfirmModal.jsx';
import ReportModal from './ReportModal.jsx';
import useReportStatus from '../hooks/useReportStatus.jsx';
import { handleReportAction, canDeleteIncident } from '../utils/incidentActions.js';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import { getRelativeTime } from '../utils/timeUtils.js';

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

const IncidentCard = forwardRef(({ incident, onSelect, onCardClick, isSelected }, ref) => {
  const { currentUser, token } = useContext(AuthContext);
  const { hasReported, report, refreshStatus } = useReportStatus(incident._id);
  
  const [votes, setVotes] = useState({
    upvotes: incident.votes.upvotes || 0,
    downvotes: incident.votes.downvotes || 0,
    userVote: incident.votes.userVote || null,
  });
  const [showComments, setShowComments] = useState(false);
  const [error, setError] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [relativeTime, setRelativeTime] = useState(getRelativeTime(incident.timestamp));
  
  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Update relative time every minute
  useEffect(() => {
    const updateRelativeTime = () => {
      setRelativeTime(getRelativeTime(incident.timestamp));
    };
    
    // Update immediately
    updateRelativeTime();
    
    // Set interval to update every minute
    const interval = setInterval(updateRelativeTime, 60000);
    
    return () => clearInterval(interval);
  }, [incident.timestamp]);

  // Update votes when incident prop changes (for real-time updates)
  useEffect(() => {
    setVotes({
      upvotes: incident.votes.upvotes || 0,
      downvotes: incident.votes.downvotes || 0,
      userVote: incident.votes.userVote || null,
    });
  }, [incident.votes]);

  // Get category configuration
  const getCategoryConfig = (category) => {
    return categoryConfig[category] || categoryConfig['Other'];
  };

  const categoryInfo = getCategoryConfig(incident.category);

  // Check if user can delete incident (admin or owner)
  const checkCanDeleteIncident = () => {
    return canDeleteIncident(incident, currentUser);
  };

  // Check if user can report incident (user role only, not their own incident, haven't reported already)
  const checkCanReportIncident = () => {
    if (!currentUser) return false;
    if (currentUser.role !== 'user') return false;
    if (incident.submittedBy._id === currentUser.id) return false;
    if (hasReported) return false;
    return true;
  };

  // Delete incident function
  const handleDeleteIncident = async () => {
    try {
      const data = await incidentsAPI.delete(incident._id);

      // Close modals
      setShowConfirmModal(false);
      setShowMenu(false);
      
      // Show success toast
      toast.success('Incident deleted successfully', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      // Trigger page refresh or parent component update
      window.dispatchEvent(new CustomEvent('incidentDeleted', { detail: incident._id }));
    } catch (err) {
      setShowConfirmModal(false);
      toast.error('Error: ' + err.message, {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  // Show delete confirmation
  const showDeleteConfirmation = () => {
    setShowMenu(false);
    setShowConfirmModal(true);
  };

  // Handle report to admin
  const handleReportToAdmin = () => {
    // Use unified report action handler
    const shouldProceed = handleReportAction(
      incident,
      currentUser,
      hasReported,
      () => {
        // This callback will be called if reporting is allowed
        setShowMenu(false);
        setShowReportModal(true);
      }
    );

    // If reporting is not allowed, close the menu
    if (!shouldProceed) {
      setShowMenu(false);
    }
  };

  // Handle PDF download
  const handleDownloadPDF = async () => {
    setShowMenu(false);
    
    try {
      // Show loading toast
      const loadingToast = toast.loading('Generating PDF...', {
        position: "top-right",
      });

      // Fetch complete incident details
      let incidentData = incident;

      try {
        const fullData = await incidentsAPI.getById(incident._id);
        incidentData = fullData.incident || incident;
      } catch (fetchError) {
        // If fetch fails, use the existing incident data
        console.warn('Could not fetch full incident details, using available data:', fetchError);
      }

      // Create PDF with UTF-8 support
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts: true,
        floatPrecision: 16
      });

      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;
      const lineHeight = 7;
      let currentY = margin;

      // Helper function to add text with word wrapping and UTF-8 support
      const addWrappedText = (text, x, y, maxWidth, fontSize = 12) => {
        doc.setFontSize(fontSize);
        // Ensure UTF-8 encoding by properly handling the text
        const utf8Text = decodeURIComponent(encodeURIComponent(text));
        const lines = doc.splitTextToSize(utf8Text, maxWidth);
        doc.text(lines, x, y);
        return y + (lines.length * lineHeight);
      };

      // Title
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      currentY = addWrappedText('Incident Report', margin, currentY, pageWidth - 2 * margin, 20);
      currentY += 10;

      // Incident Title
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      currentY = addWrappedText(incidentData.title || 'Untitled Incident', margin, currentY, pageWidth - 2 * margin, 16);
      currentY += 10;

      // Basic Info
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      
      // Category
      const categoryInfo = getCategoryConfig(incidentData.category);
      currentY = addWrappedText(`Category: ${incidentData.category}`, margin, currentY, pageWidth - 2 * margin);
      currentY += 5;

      // Location
      currentY = addWrappedText(`Location: ${incidentData.location?.address || 'Location not specified'}`, margin, currentY, pageWidth - 2 * margin);
      if (incidentData.location?.lat && incidentData.location?.lng) {
        currentY = addWrappedText(`Coordinates: ${incidentData.location.lat}, ${incidentData.location.lng}`, margin, currentY, pageWidth - 2 * margin);
        
        // Add clickable map link
        const mapUrl = `${window.location.origin}/#map?lat=${incidentData.location.lat}&lng=${incidentData.location.lng}&incident=${incidentData._id}`;
        doc.setTextColor(0, 0, 255); // Blue color for link
        doc.setFont(undefined, 'normal');
        const linkText = 'Click here to view location on map';
        currentY = addWrappedText(linkText, margin, currentY, pageWidth - 2 * margin);
        
        // Add the actual link functionality
        doc.link(margin, currentY - lineHeight, pageWidth - 2 * margin, lineHeight, { url: mapUrl });
        
        // Reset text color
        doc.setTextColor(0, 0, 0);
      }
      currentY += 5;

      // Timestamp
      currentY = addWrappedText(`Reported: ${new Date(incidentData.timestamp).toLocaleString()}`, margin, currentY, pageWidth - 2 * margin);
      currentY += 5;

      // Submitted by
      currentY = addWrappedText(`Submitted by: ${incidentData.submittedBy?.username || 'Anonymous'}`, margin, currentY, pageWidth - 2 * margin);
      currentY += 10;

      // Description
      doc.setFont(undefined, 'bold');
      currentY = addWrappedText('Description:', margin, currentY, pageWidth - 2 * margin);
      currentY += 5;
      doc.setFont(undefined, 'normal');
      currentY = addWrappedText(incidentData.description || 'No description provided', margin, currentY, pageWidth - 2 * margin);
      currentY += 10;

      // Status
      if (incidentData.falseFlagVerified) {
        doc.setTextColor(255, 0, 0);
        doc.setFont(undefined, 'bold');
        currentY = addWrappedText('STATUS: VERIFIED AS FALSE REPORT', margin, currentY, pageWidth - 2 * margin);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        currentY += 10;
      }

      // Votes
      doc.setFont(undefined, 'bold');
      currentY = addWrappedText('Community Response:', margin, currentY, pageWidth - 2 * margin);
      currentY += 5;
      doc.setFont(undefined, 'normal');
      currentY = addWrappedText(`Upvotes: ${votes.upvotes} | Downvotes: ${votes.downvotes}`, margin, currentY, pageWidth - 2 * margin);
      currentY += 15;

      // Additional incident details if available
      if (incidentData.severity) {
        doc.setFont(undefined, 'bold');
        currentY = addWrappedText('Severity:', margin, currentY, pageWidth - 2 * margin);
        currentY += 5;
        doc.setFont(undefined, 'normal');
        currentY = addWrappedText(incidentData.severity, margin, currentY, pageWidth - 2 * margin);
        currentY += 10;
      }

      // Footer
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 30, doc.internal.pageSize.height - 10);
        doc.text('Generated by Neighbourhood Incident Tracker', margin, doc.internal.pageSize.height - 10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, doc.internal.pageSize.height - 5);
      }

      // Save the PDF
      const fileName = `incident-${incidentData._id}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      // Close loading toast and show success
      toast.dismiss(loadingToast);
      toast.success('PDF downloaded successfully!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF: ' + error.message, {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  // Handle clicking outside to close menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.incident-card__menu')) {
        setShowMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
    <div 
      ref={ref} 
      className={`incident-card ${isSelected ? 'incident-card--selected' : ''} ${incident.falseFlagVerified ? 'incident-card--false-report' : ''} ${onCardClick ? 'incident-card--clickable' : ''}`}
      onClick={onCardClick ? () => onCardClick() : undefined}
      style={onCardClick ? { cursor: 'pointer' } : undefined}
    >
      {/* False Report Banner */}
      {incident.falseFlagVerified && (
        <div className="incident-card__false-banner">
          <span className="false-banner__icon">⚠️</span>
          <span className="false-banner__text">FALSE REPORT</span>
          <span className="false-banner__verified">Verified by Admin</span>
        </div>
      )}
      
      <div className="incident-card__header">
        <div className="incident-card__header-left">
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
        {/* Three-dot menu */}
        <div className="incident-card__menu">
          <div className="incident-card__time incident-card__time--header">
            {relativeTime}
          </div>
          <button 
            className="incident-card__menu-trigger"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            aria-label="More options"
          >
            ⋮
          </button>
            {showMenu && (
              <div className="incident-card__menu-dropdown">
                <button 
                  className="incident-card__menu-item incident-card__menu-item--download"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadPDF();
                  }}
                >
                  📄 Download PDF
                </button>
                {currentUser && checkCanDeleteIncident() && (
                  <button 
                    className="incident-card__menu-item incident-card__menu-item--delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      showDeleteConfirmation();
                    }}
                  >
                    🗑️ Delete
                  </button>
                )}
                <button 
                  className="incident-card__menu-item incident-card__menu-item--report"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReportToAdmin();
                  }}
                >
                  🚨 Report to Admin
                </button>
              </div>
            )}
        </div>
      </div>
      <h4 className={`incident-card__title ${incident.falseFlagVerified ? 'incident-card__title--false' : ''}`}>
        {incident.title}
      </h4>
      <div className={`incident-card__description ${incident.falseFlagVerified ? 'incident-card__description--false' : ''}`}>
        {incident.description}
      </div>
      <div className="incident-card__stats">
        <div className="incident-card__stat">
          <span role="img" aria-label="Location">📍</span>
          <span className="incident-card__address">
            {incident.location.address || 'Location not specified'}
          </span>
        </div>
      </div>
      <div className="incident-card__footer">
        <div className="incident-card__actions">
          <button
            className={`btn btn--icon-only ${votes.userVote === 'upvote' ? 'btn--active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleVote('upvote');
            }}
            title={`Upvote (${votes.upvotes})`}
          >
            <span role="img" aria-label="Upvote">👍</span>
            <span className="vote-count">{votes.upvotes}</span>
          </button>
          <button
            className={`btn btn--icon-only ${votes.userVote === 'downvote' ? 'btn--active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleVote('downvote');
            }}
            title={`Downvote (${votes.downvotes})`}
          >
            <span role="img" aria-label="Downvote">👎</span>
            <span className="vote-count">{votes.downvotes}</span>
          </button>
          <button
            className="btn btn--icon-only"
            onClick={(e) => {
              e.stopPropagation();
              setShowComments(!showComments);
            }}
            title={showComments ? 'Hide comments' : 'Show comments'}
          >
            <span role="img" aria-label="Comments">💬</span>
          </button>
          <button 
            className="btn btn--icon-only" 
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }} 
            title="Locate on map"
          >
            <span role="img" aria-label="Locate on map">📍</span>
          </button>
        </div>
      </div>
      {error && <div className="alert alert--error">{error}</div>}
      {showComments && (
        <div className="incident-card__comments-section" onClick={(e) => e.stopPropagation()}>
          <CommentList incidentId={incident._id} />
          <CommentForm incidentId={incident._id} />
        </div>
      )}
      
      {/* Render confirmation modal using portal to ensure proper positioning */}
      {createPortal(
        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleDeleteIncident}
          title="Delete Incident"
          message="Are you sure you want to delete this incident? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />,
        document.body
      )}

      {/* Render report modal using portal to ensure proper positioning */}
      {createPortal(
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          incident={incident}
          onReportSubmitted={refreshStatus}
        />,
        document.body
      )}
    </div>
  );
});

IncidentCard.displayName = 'IncidentCard';

export default IncidentCard;