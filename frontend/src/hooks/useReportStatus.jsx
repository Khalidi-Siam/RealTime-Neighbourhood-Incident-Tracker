import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

const useReportStatus = (incidentId) => {
  const { currentUser, token } = useContext(AuthContext);
  const [reportStatus, setReportStatus] = useState({
    hasReported: false,
    report: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchReportStatus = async () => {
      if (!currentUser || !token || currentUser.role !== 'user') {
        setReportStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        const response = await fetch(`http://localhost:3000/api/incidents/${incidentId}/user-report`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch report status');
        }

        const data = await response.json();
        setReportStatus({
          hasReported: data.hasReported,
          report: data.report,
          loading: false,
          error: null
        });

      } catch (err) {
        setReportStatus({
          hasReported: false,
          report: null,
          loading: false,
          error: err.message
        });
      }
    };

    fetchReportStatus();
  }, [incidentId, currentUser, token]);

  const refreshStatus = () => {
    setReportStatus(prev => ({ ...prev, loading: true }));
    // The useEffect will re-run and fetch the status
  };

  return { ...reportStatus, refreshStatus };
};

export default useReportStatus;
