import { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext.jsx';
import Home from './pages/Home.jsx';
import Feed from './pages/Feed.jsx';
import Profile from './pages/Profile.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import Nav from './components/Nav.jsx';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  // Initialize currentView from localStorage or URL hash, fallback to 'map'
  const getInitialView = () => {
    // Check URL hash first
    const hash = window.location.hash.slice(1);
    if (hash && ['map', 'feed', 'profile', 'admin'].includes(hash)) {
      return hash;
    }
    
    // Check localStorage
    const savedView = localStorage.getItem('currentView');
    if (savedView && ['map', 'feed', 'profile', 'admin'].includes(savedView)) {
      return savedView;
    }
    
    return 'map';
  };

  const [currentView, setCurrentView] = useState(getInitialView);

  // Handle view changes - save to localStorage and update URL
  const handleViewChange = (newView) => {
    setCurrentView(newView);
    localStorage.setItem('currentView', newView);
    window.location.hash = newView;
  };

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && ['map', 'feed', 'profile', 'admin'].includes(hash)) {
        setCurrentView(hash);
        localStorage.setItem('currentView', hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    
    // Set initial hash if none exists
    if (!window.location.hash) {
      window.location.hash = currentView;
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [currentView]);

  const renderView = () => {
    switch (currentView) {
      case 'map':
        return <Home />;
      case 'feed':
        return <Feed />;
      case 'profile':
        return <Profile />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <Home />;
    }
  };

  return (
    <ThemeProvider>
      {/* Navigation Header */}
      <header className="header">
        <Nav currentView={currentView} onViewChange={handleViewChange} />
      </header>

      {/* Main Content */}
      <main className="main">
        <div className={`view ${currentView === 'map' ? 'view--active' : ''}`} id="mapView">
          {currentView === 'map' && <Home />}
        </div>
        
        <div className={`view ${currentView === 'feed' ? 'view--active' : ''}`} id="feedView">
          {currentView === 'feed' && <Feed />}
        </div>
        
        <div className={`view ${currentView === 'profile' ? 'view--active' : ''}`} id="profileView">
          {currentView === 'profile' && <Profile />}
        </div>
        
        <div className={`view ${currentView === 'admin' ? 'view--active' : ''}`} id="adminView">
          {currentView === 'admin' && <AdminDashboard />}
        </div>
      </main>

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </ThemeProvider>
  );
}

export default App;