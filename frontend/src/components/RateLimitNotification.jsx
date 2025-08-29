import React from 'react';
import '..assets/RateLimitNotification.css';

/**
 * Component to display rate limiting notifications
 * @param {Object} props - Component props
 * @param {boolean} props.isVisible - Whether to show the notification
 * @param {Object} props.rateLimitInfo - Rate limit information
 * @param {Function} props.onClose - Callback when notification is closed
 */
const RateLimitNotification = ({ isVisible, rateLimitInfo, onClose }) => {
  if (!isVisible || !rateLimitInfo) return null;

  const getTimeUntilReset = () => {
    if (!rateLimitInfo.resetTime) return null;
    
    const now = new Date();
    const resetTime = rateLimitInfo.resetTime;
    const diff = resetTime - now;
    
    if (diff <= 0) return 'now';
    
    const minutes = Math.ceil(diff / (1000 * 60));
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  const timeUntilReset = getTimeUntilReset();

  return (
    <div className="rate-limit-notification">
      <div className="rate-limit-notification__content">
        <div className="rate-limit-notification__icon">
          ⏱️
        </div>
        <div className="rate-limit-notification__message">
          <h4>Request Limit Reached</h4>
          <p>{rateLimitInfo.message}</p>
          {timeUntilReset && timeUntilReset !== 'now' && (
            <p className="rate-limit-notification__retry">
              You can try again in {timeUntilReset}
            </p>
          )}
          {rateLimitInfo.remaining !== undefined && (
            <p className="rate-limit-notification__details">
              Remaining requests: {rateLimitInfo.remaining}/{rateLimitInfo.limit}
            </p>
          )}
        </div>
        <button 
          className="rate-limit-notification__close"
          onClick={onClose}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default RateLimitNotification;