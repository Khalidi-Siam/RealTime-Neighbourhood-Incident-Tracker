import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import useReportCheck from '../hooks/useReportCheck.jsx';
import { handleReportAction, canDeleteIncident } from '../utils/incidentActions.js';

function PopupContent({ 
  incident, 
  openMenuId, 
  setOpenMenuId, 
  onDeleteConfirmation, 
  onReportToAdmin,
  onMarkerClick 
}) {
  const { currentUser } = useContext(AuthContext);
  const { hasReported } = useReportCheck(incident._id);

  const handleReportClick = () => {
    // Use unified report action handler
    const shouldProceed = handleReportAction(
      incident,
      currentUser,
      hasReported,
      () => {
        // This callback will be called if reporting is allowed
        onReportToAdmin(incident);
      }
    );

    // If reporting is not allowed, close the menu
    if (!shouldProceed) {
      setOpenMenuId(null);
    }
  };

  return (
    <div className="popup-content">
      {/* False Report Banner */}
      {incident.falseFlagVerified && (
        <div className="popup-false-banner">
          <span className="popup-false-icon">⚠️</span>
          <span className="popup-false-text">FALSE REPORT - Verified by Admin</span>
        </div>
      )}
      
      <div className="popup-header">
        <div className="popup-header-left">
          <h3 className={incident.falseFlagVerified ? 'popup-title--false' : ''}>{incident.title}</h3>
          <span className={`severity-badge ${incident.severity.toLowerCase()}`}>
            {incident.severity}
          </span>
        </div>
        {/* 3-dot menu */}
        <div className="popup-menu">
          <button 
            className="menu-trigger"
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuId(openMenuId === incident._id ? null : incident._id);
            }}
            aria-label="More options"
          >
            ⋮
          </button>
          {openMenuId === incident._id && (
            <div className="menu-dropdown">
              {canDeleteIncident(incident, currentUser) && (
                <button 
                  className="menu-item menu-item--delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConfirmation(incident);
                  }}
                >
                  🗑️ Delete
                </button>
              )}
              <button 
                className="menu-item menu-item--report"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReportClick();
                }}
              >
                🚨 Report to Admin
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="popup-body">
        <p className="category">📂 {incident.category}</p>
        <p className="votes">
          👍 {incident.votes.upvotes} | 👎 {incident.votes.downvotes}
        </p>
        <p className="date">
          📅 {new Date(incident.timestamp).toLocaleDateString()} at {new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <button
        className="popup-btn"
        onClick={() => onMarkerClick(incident)}
      >
        View Details →
      </button>
    </div>
  );
}

export default PopupContent;
