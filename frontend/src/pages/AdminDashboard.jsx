import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import { authAPI, incidentsAPI } from '../utils/api.js';
import { toast } from 'react-toastify';
import ConfirmModal from '../components/ConfirmModal.jsx';

function AdminDashboard() {
  const { currentUser } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' or 'users'
  
  // Reported incidents state
  const [reportedIncidents, setReportedIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [processing, setProcessing] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Users state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [usersCurrentPage, setUsersCurrentPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(0);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Check if user is admin
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      setError('Access denied. Admin privileges required.');
      setLoading(false);
      return;
    }
    
    // Fetch total user count once when component mounts
    fetchTotalUsersCount();
    
    if (activeTab === 'reports') {
      fetchReportedIncidents();
    } else if (activeTab === 'users') {
      fetchUsers();
    }
  }, [currentUser, currentPage, usersCurrentPage, activeTab, searchQuery]);

  const fetchTotalUsersCount = async () => {
    try {
      const data = await authAPI.getUsersCount();
      setTotalUsersCount(data.totalUsers || 0);
    } catch (err) {
      try {
        // If the specific endpoint doesn't exist, fall back to getting total from pagination
        const fallbackData = await authAPI.getAllUsers(1, 1);
        setTotalUsersCount(fallbackData.pagination?.total || 0);
      } catch (fallbackErr) {
        console.error('Error fetching total users count:', fallbackErr);
        // Don't show error toast for this as it's not critical
      }
    }
  };

  const fetchReportedIncidents = async () => {
    try {
      setLoading(true);
      setError('');
      
      const data = await incidentsAPI.getReportedIncidents(currentPage, 10);
      setReportedIncidents(data.incidents);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err.message);
      toast.error('Error fetching reported incidents: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      setUsersError('');
      
      const data = await authAPI.getAllUsers(usersCurrentPage, 9, searchQuery);
      setUsers(data.users);
      setUsersTotalPages(data.pagination.totalPages);
      
      // Update total users count only when not searching and on first page
      if (!searchQuery && usersCurrentPage === 1 && data.pagination && data.pagination.total) {
        setTotalUsersCount(data.pagination.total);
      }
    } catch (err) {
      setUsersError(err.message);
      toast.error('Error fetching users: ' + err.message);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleAcceptReport = async (incidentId) => {
    setConfirmAction({
      type: 'accept',
      incidentId,
      title: 'Accept False Report',
      message: 'Are you sure you want to accept this report as false? This will mark the incident as verified false',
      confirmText: 'Accept Report',
      modalType: 'danger'
    });
    setShowConfirmModal(true);
  };

  const handleRejectReport = async (incidentId) => {
    setConfirmAction({
      type: 'reject',
      incidentId,
      title: 'Reject False Report',
      message: 'Are you sure you want to reject this false report? This will restore the incident to normal visibility.',
      confirmText: 'Reject Report',
      modalType: 'warning'
    });
    setShowConfirmModal(true);
  };

  const executeAction = async () => {
    if (!confirmAction) return;

    const { type, incidentId } = confirmAction;
    setProcessing(prev => ({ ...prev, [incidentId]: true }));

    try {
      let data;
      if (type === 'accept') {
        data = await incidentsAPI.acceptFalseReport(incidentId);
      } else {
        data = await incidentsAPI.rejectFalseReport(incidentId);
      }

      toast.success(data.message || `Report ${type}ed successfully`);
      
      // Refresh the list
      fetchReportedIncidents();
    } catch (err) {
      toast.error(`Error ${type}ing report: ` + err.message);
    } finally {
      setProcessing(prev => ({ ...prev, [incidentId]: false }));
      setShowConfirmModal(false);
      setConfirmAction(null);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Safety': '🚨',
      'Infrastructure': '🏗️',
      'Environmental': '🌿',
      'Traffic': '🚦',
      'Community': '🏘️',
      'Emergency': '🆘',
      'Other': '📋'
    };
    return icons[category] || icons['Other'];
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'Low': '#28a745',
      'Medium': '#ffc107',
      'High': '#fd7e14',
      'Critical': '#dc3545'
    };
    return colors[severity] || colors['Medium'];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="admin-dashboard">
        <div className="admin-dashboard__error">
          <h2>Access Denied</h2>
          <p>You need admin privileges to access this dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard__header">
        <div className="admin-dashboard__title">
          <h1>⚙️ Admin Dashboard</h1>
          <p>Manage reported incidents, users, and moderate content</p>
        </div>
        <div className="admin-dashboard__stats">
          <div className="admin-stat">
            <span className="admin-stat__value">{reportedIncidents.length}</span>
            <span className="admin-stat__label">Pending Reports</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat__value">{totalUsersCount}</span>
            <span className="admin-stat__label">Total Users</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="admin-dashboard__tabs">
        <button
          className={`admin-tab ${activeTab === 'reports' ? 'admin-tab--active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          📋 Reported Incidents
        </button>
        <button
          className={`admin-tab ${activeTab === 'users' ? 'admin-tab--active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 User Management
        </button>
      </div>

      {(error || usersError) && (
        <div className="admin-dashboard__error">
          <p>{error || usersError}</p>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'reports' && (
        <>
          {loading ? (
            <div className="admin-dashboard__loading">
              <div className="spinner"></div>
              <p>Loading reported incidents...</p>
            </div>
          ) : (
            <>
              {reportedIncidents.length === 0 ? (
                <div className="admin-dashboard__empty">
                  <div className="admin-dashboard__empty-icon">✅</div>
                  <h3>No Pending Reports</h3>
                  <p>All incident reports have been reviewed. Great job!</p>
                </div>
              ) : (
                <div className="admin-dashboard__content">
                  <div className="admin-dashboard__incidents">
                    {reportedIncidents.map((incident) => (
                  <div key={incident._id} className="admin-incident-card">
                    <div className="admin-incident-card__header">
                      <div className="admin-incident-card__info">
                        <div className="admin-incident-card__category">
                          <span className="category-icon">
                            {getCategoryIcon(incident.category)}
                          </span>
                          <span className="category-name">{incident.category}</span>
                          <span 
                            className="severity-badge"
                            style={{ backgroundColor: getSeverityColor(incident.severity) }}
                          >
                            {incident.severity}
                          </span>
                        </div>
                        <h3 className="admin-incident-card__title">{incident.title}</h3>
                      </div>
                      <div className="admin-incident-card__reports-count">
                        <span className="reports-badge">
                          {incident.reportCount} Report{incident.reportCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="admin-incident-card__body">
                      <p className="admin-incident-card__description">
                        {incident.description}
                      </p>
                      
                      <div className="admin-incident-card__meta">
                        <div className="meta-item">
                          <span className="meta-label">📍 Location:</span>
                          <span className="meta-value">{incident.location.address}</span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-label">👤 Submitted by:</span>
                          <span className="meta-value">{incident.submittedBy.username}</span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-label">📅 Reported on:</span>
                          <span className="meta-value">{formatDate(incident.timestamp)}</span>
                        </div>
                      </div>

                      <div className="admin-incident-card__reports">
                        <h4>False Reports:</h4>
                        <div className="reports-list">
                          {incident.reports.map((report) => (
                            <div key={report.id} className="report-item">
                              <div className="report-info">
                                <span className="report-user">
                                  👤 {report.reportedBy.username}
                                </span>
                                <span className="report-date">
                                  📅 {formatDate(report.timestamp)}
                                </span>
                              </div>
                              <div className="report-reason">
                                <strong>Reason:</strong> {report.reason}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="admin-incident-card__actions">
                      <button
                        className="btn btn--danger btn--sm"
                        onClick={() => handleAcceptReport(incident._id)}
                        disabled={processing[incident._id]}
                      >
                        {processing[incident._id] ? 'Processing...' : '✅ Accept Report'}
                      </button>
                      <button
                        className="btn btn--success btn--sm"
                        onClick={() => handleRejectReport(incident._id)}
                        disabled={processing[incident._id]}
                      >
                        {processing[incident._id] ? 'Processing...' : '❌ Reject Report'}
                      </button>
                    </div>
                  </div>
                ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="admin-dashboard__pagination">
                      <button
                        className="btn btn--secondary"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        ← Previous
                      </button>
                      <span className="pagination-info">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        className="btn btn--secondary"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Users Tab Content */}
      {activeTab === 'users' && (
        <>
          {/* Search Bar */}
          <div className="admin-dashboard__search">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search users by username or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <span className="search-icon">🔍</span>
            </div>
          </div>

          {usersLoading ? (
            <div className="admin-dashboard__loading">
              <div className="spinner"></div>
              <p>Loading users...</p>
            </div>
          ) : (
            <>
              {users.length === 0 ? (
                <div className="admin-dashboard__empty">
                  <div className="admin-dashboard__empty-icon">👥</div>
                  <h3>No Users Found</h3>
                  <p>No users match your search criteria or no users are registered.</p>
                </div>
              ) : (
                <div className="admin-dashboard__content">
                  <div className="admin-users__grid">
                    {users.map((user) => (
                      <div key={user._id} className="admin-user-card">
                        <div className="admin-user-card__header">
                          <div className="user-avatar">
                            <span className="user-avatar__icon">👤</span>
                          </div>
                          <div className="user-info">
                            <h3 className="user-name">{user.username}</h3>
                            <p className="user-email">{user.email}</p>
                          </div>
                        </div>
                        
                        <div className="admin-user-card__body">
                          <div className="user-details">
                            <div className="user-detail">
                              <span className="detail-label">📞 Phone:</span>
                              <span className="detail-value">{user.phone || 'Not provided'}</span>
                            </div>
                            <div className="user-detail">
                              <span className="detail-label">🎭 Role:</span>
                              <span className={`detail-value role-badge role-badge--${user.role}`}>
                                {user.role}
                              </span>
                            </div>
                            <div className="user-detail">
                              <span className="detail-label">📅 Joined:</span>
                              <span className="detail-value">
                                {formatDate(user.createdAt) || 'Not available'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {usersTotalPages > 1 && (
                    <div className="admin-dashboard__pagination">
                      <button
                        className="btn btn--secondary"
                        onClick={() => setUsersCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={usersCurrentPage === 1}
                      >
                        ← Previous
                      </button>
                      <span className="pagination-info">
                        Page {usersCurrentPage} of {usersTotalPages}
                      </span>
                      <button
                        className="btn btn--secondary"
                        onClick={() => setUsersCurrentPage(prev => Math.min(usersTotalPages, prev + 1))}
                        disabled={usersCurrentPage === usersTotalPages}
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {showConfirmModal && confirmAction && (
        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => {
            setShowConfirmModal(false);
            setConfirmAction(null);
          }}
          onConfirm={executeAction}
          title={confirmAction.title}
          message={confirmAction.message}
          confirmText={confirmAction.confirmText}
          type={confirmAction.modalType}
        />
      )}
    </div>
  );
}

export default AdminDashboard;
