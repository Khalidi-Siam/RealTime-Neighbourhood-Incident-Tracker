import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import { incidentsAPI } from '../utils/api.js';

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
        const data = await incidentsAPI.checkUserReport(incidentId);
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
