import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import Modal from './Modal.jsx';
import AuthForm from './AuthForm.jsx';
import ReportIncidentForm from './ReportIncidentForm.jsx';

function Nav({ currentView, onViewChange }) {
  const { currentUser, logout } = useContext(AuthContext);
  const { isDarkMode, toggleTheme } = useTheme();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLoginClick = (e) => {
    e.preventDefault();
    setIsAuthModalOpen(true);
  };

  const handleViewChange = (view) => {
    onViewChange(view);
    setIsMenuOpen(false); // Close mobile menu when view changes
  };

  return (
    <>
      <nav className="nav container">
        <div className="nav__brand">
          <span className="nav__logo">🗺️</span>
          <h1 className="nav__title">NeighborWatch</h1>
        </div>
        
        <div className={`nav__menu ${isMenuOpen ? 'nav__menu--active' : ''}`} id="navMenu">
          <div className="nav__links">
            <button 
              className={`nav__link ${currentView === 'map' ? 'nav__link--active' : ''}`}
              onClick={() => handleViewChange('map')}
            >
              <span className="nav__icon">🗺️</span>
              Map
            </button>
            <button 
              className={`nav__link ${currentView === 'feed' ? 'nav__link--active' : ''}`}
              onClick={() => handleViewChange('feed')}
            >
              <span className="nav__icon">📋</span>
              Feed
            </button>
            {currentUser && currentUser.role === 'admin' && (
              <button 
                className={`nav__link ${currentView === 'admin' ? 'nav__link--active' : ''}`}
                onClick={() => handleViewChange('admin')}
              >
                <span className="nav__icon">⚙️</span>
                Dashboard
              </button>
            )}
          </div>
          
          <div className="nav__actions">
            <button
              className="btn btn--secondary btn--sm"
              onClick={toggleTheme}
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span>{isDarkMode ? '☀️' : '🌙'}</span>
            </button>
            {currentUser ? (
              <>
                <button
                  className="btn btn--primary btn--sm"
                  onClick={() => setIsReportModalOpen(true)}
                >
                  <span>+ Report Incident</span>
                </button>
                <div className="nav__user">
                  <button 
                    className="nav__profile-btn"
                    onClick={() => handleViewChange('profile')}
                    title={`${currentUser.username || currentUser.name}'s Profile`}
                  >
                    <div className="nav__profile-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </div>
                    <span className="nav__username">{currentUser.username || currentUser.name}</span>
                  </button>
                  <button className="nav__logout" onClick={logout} title="Logout">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16,17 21,12 16,7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                  </button>
                </div>
              </>
            ) : (
              <button
                className="btn btn--outline btn--sm"
                onClick={handleLoginClick}
              >
                Login
              </button>
            )}
          </div>
        </div>
        
        <button 
          className="nav__toggle" 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle navigation"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </nav>

      <Modal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title="Authentication"
      >
        <AuthForm onClose={() => setIsAuthModalOpen(false)} />
      </Modal>

      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Report New Incident"
      >
        <ReportIncidentForm onClose={() => setIsReportModalOpen(false)} />
      </Modal>

      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Report New Incident"
      >
        <ReportIncidentForm onClose={() => setIsReportModalOpen(false)} />
      </Modal>
    </>
  );
}

export default Nav;