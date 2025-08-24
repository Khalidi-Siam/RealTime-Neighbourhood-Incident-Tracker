import { useTheme } from '../context/ThemeContext.jsx';

function NotFound() {
  const { isDarkMode } = useTheme();
  
  const handleGoHome = () => {
    window.location.hash = 'map';
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.hash = 'map';
    }
  };

  return (
    <div className="not-found">
      <div className="not-found__container">
        {/* 404 Animation */}
        <div className="not-found__animation">
          <div className="not-found__number">4</div>
          <div className="not-found__icon">🗺️</div>
          <div className="not-found__number">4</div>
        </div>
        
        {/* Error Message */}
        <div className="not-found__content">
          <h1 className="not-found__title">Page Not Found</h1>
          <p className="not-found__description">
            Oops! It looks like you've wandered off the map. The page you're looking for doesn't exist 
            or may have been moved to a different location.
          </p>
          
          {/* Suggestions */}
          <div className="not-found__suggestions">
            <h3 className="not-found__suggestions-title">Here's what you can do:</h3>
            <ul className="not-found__suggestions-list">
              <li>Check if the URL is spelled correctly</li>
              <li>Go back to the previous page</li>
              <li>Visit our map to explore incidents in your area</li>
              <li>Browse the incident feed for latest updates</li>
            </ul>
          </div>
          
          {/* Action Buttons */}
          <div className="not-found__actions">
            <button 
              className="btn btn--primary not-found__btn" 
              onClick={handleGoHome}
            >
              <span className="btn__icon">🏠</span>
              Go to Map
            </button>
            <button 
              className="btn btn--secondary not-found__btn" 
              onClick={handleGoBack}
            >
              <span className="btn__icon">←</span>
              Go Back
            </button>
          </div>
        </div>
        
        {/* Fun fact */}
        <div className="not-found__footer">
          <p className="not-found__fun-fact">
            💡 <strong>Did you know?</strong> Our NeighborWatch community has helped resolve thousands of local incidents!
          </p>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
