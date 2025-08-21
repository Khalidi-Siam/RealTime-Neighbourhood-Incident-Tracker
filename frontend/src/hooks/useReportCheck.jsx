import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

/**
 * Hook to check if a user has reported a specific incident
 * This is a lightweight version for use in MapView where we don't need
 * the full useReportStatus functionality
 */
function useReportCheck(incidentId) {
  const { currentUser, token } = useContext(AuthContext);
  const [hasReported, setHasReported] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkReportStatus = async () => {
    if (!currentUser || !token || !incidentId) {
      setHasReported(false);
      return false;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/incidents/${incidentId}/user-report`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHasReported(data.hasReported || false);
        return data.hasReported || false;
      }
    } catch (err) {
      console.error('Error checking report status:', err);
      setHasReported(false);
    } finally {
      setLoading(false);
    }
    return false;
  };

  useEffect(() => {
    checkReportStatus();
  }, [incidentId, currentUser, token]);

  return { hasReported, loading, checkReportStatus };
}

export default useReportCheck;
