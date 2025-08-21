import { toast } from 'react-toastify';

/**
 * Utility function to handle uniform reporting logic and notifications
 * across all components with three-dot menus
 * 
 * @param {Object} incident - The incident object
 * @param {Object} currentUser - The current logged-in user
 * @param {boolean} hasReported - Whether the user has already reported this incident
 * @param {Function} onAllowReport - Callback function to execute when reporting is allowed
 * @returns {boolean} - Whether the report action should proceed
 */
export const handleReportAction = (incident, currentUser, hasReported, onAllowReport) => {
  // Case 4: Incident already verified as false
  if (incident.falseFlagVerified) {
    toast.info('This incident has already been verified as false', {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
    return false;
  }

  // Case 2: User not logged in
  if (!currentUser) {
    toast.warn('Please log in to report incidents', {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
    return false;
  }

  // Case 1: Owner trying to report their own incident
  if (incident.submittedBy._id === currentUser.id) {
    toast.warn("You can't report your own posted incident", {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
    return false;
  }

  // Case 3: User has already reported this incident
  if (hasReported) {
    toast.info("You've already reported this incident", {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
    return false;
  }

  // All checks passed - allow reporting
  if (onAllowReport) {
    onAllowReport();
  }
  return true;
};

/**
 * Check if user can delete an incident (admin or owner)
 * @param {Object} incident - The incident object
 * @param {Object} currentUser - The current logged-in user
 * @returns {boolean} - Whether the user can delete the incident
 */
export const canDeleteIncident = (incident, currentUser) => {
  if (!currentUser) return false;
  return currentUser.role === 'admin' || incident.submittedBy._id === currentUser.id;
};

/**
 * Check if user can report an incident (basic check without hasReported status)
 * @param {Object} incident - The incident object
 * @param {Object} currentUser - The current logged-in user
 * @returns {boolean} - Whether the user can potentially report the incident
 */
export const canReportIncident = (incident, currentUser) => {
  if (!currentUser) return false;
  if (currentUser.role !== 'user') return false;
  if (incident.submittedBy._id === currentUser.id) return false;
  if (incident.falseFlagVerified) return false;
  return true;
};
