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
                Admin
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
                  <span className="nav__username">{currentUser.name}</span>
                  <button className="nav__logout" onClick={logout}>
                    Logout
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