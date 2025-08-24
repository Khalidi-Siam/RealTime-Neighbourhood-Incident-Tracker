import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import { authAPI } from '../utils/api.js';

function Profile() {
  const { currentUser, token } = useContext(AuthContext);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await authAPI.getProfile();
        setProfileData(data.user);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  if (loading) {
    return (
      <div className="profile">
        <div className="container">
          <div className="profile__loading">
            <div className="loading-spinner"></div>
            <p>Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile">
        <div className="container">
          <div className="profile__error">
            <div className="error-icon">⚠️</div>
            <h2>Error Loading Profile</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser || !profileData) {
    return (
      <div className="profile">
        <div className="container">
          <div className="profile__error">
            <div className="error-icon">🔒</div>
            <h2>Access Denied</h2>
            <p>Please log in to view your profile.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile">
      <div className="container">
        <div className="profile__header">
          <h1 className="profile__title">My Profile</h1>
          <p className="profile__subtitle">Manage your account information</p>
        </div>

        <div className="profile__content">
          <div className="profile__card">
            <div className="profile__avatar-section">
              <div className="profile__avatar">
                <div className="profile__avatar-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
              </div>
              <div className="profile__avatar-info">
                <h2 className="profile__name">{profileData.username}</h2>
                <p className="profile__member-since">Member since {new Date().getFullYear()}</p>
              </div>
            </div>

            <div className="profile__details">
              <div className="profile__section">
                <h3 className="profile__section-title">Personal Information</h3>
                <div className="profile__fields">
                  <div className="profile__field">
                    <label className="profile__field-label">Full Name</label>
                    <div className="profile__field-value">
                      <span className="profile__field-icon">👤</span>
                      <span className="profile__field-text">{profileData.username}</span>
                    </div>
                  </div>

                  <div className="profile__field">
                    <label className="profile__field-label">Email Address</label>
                    <div className="profile__field-value">
                      <span className="profile__field-icon">📧</span>
                      <span className="profile__field-text">{profileData.email}</span>
                    </div>
                  </div>

                  <div className="profile__field">
                    <label className="profile__field-label">Phone Number</label>
                    <div className="profile__field-value">
                      <span className="profile__field-icon">📱</span>
                      <span className="profile__field-text">{profileData.phone || 'Not provided'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* <div className="profile__section">
                <h3 className="profile__section-title">Account Status</h3>
                <div className="profile__status">
                  <div className="profile__status-item">
                    <span className="profile__status-icon profile__status-icon--active">✓</span>
                    <span className="profile__status-text">Account Active</span>
                  </div>
                  <div className="profile__status-item">
                    <span className="profile__status-icon profile__status-icon--active">✓</span>
                    <span className="profile__status-text">Email Verified</span>
                  </div>
                </div>
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
