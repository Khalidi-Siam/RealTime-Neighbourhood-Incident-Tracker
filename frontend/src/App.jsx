import { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import Home from './pages/Home.jsx';
import Feed from './pages/Feed.jsx';
import Profile from './pages/Profile.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import NotFound from './pages/NotFound.jsx';
import Nav from './components/Nav.jsx';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  // Helper function to extract view from hash
  const getViewFromHash = (hash) => {
    if (!hash) return null;
    
    // Handle map with parameters (e.g., "map?lat=...&lng=...")
    if (hash.startsWith('map')) {
      return 'map';
    }
    
    // Handle other exact matches
    if (['feed', 'profile', 'admin'].includes(hash)) {
      return hash;
    }
    
    // Return 404 for unknown routes
    return '404';
  };

  // Initialize currentView from localStorage or URL hash, fallback to 'map'
  const getInitialView = () => {
    // Check URL hash first - this takes priority over localStorage
    const hash = window.location.hash.slice(1);
    const viewFromHash = getViewFromHash(hash);
    if (viewFromHash) {
      return viewFromHash;
    }
    
    // Only use localStorage if there's no valid hash
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
    // Only update hash if it's a simple view change (not from PDF links)
    if (!window.location.hash.includes('?')) {
      window.location.hash = newView;
    } else {
      // If we have parameters, just change the base view
      window.location.hash = newView;
    }
  };

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      const viewFromHash = getViewFromHash(hash);
      
      if (viewFromHash) {
        setCurrentView(viewFromHash);
        // Only save to localStorage if it's a simple navigation (not PDF links with params)
        if (!hash.includes('?')) {
          localStorage.setItem('currentView', viewFromHash);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    
    // Set initial hash if none exists and no URL parameters
    if (!window.location.hash) {
      window.location.hash = currentView;
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

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
      case '404':
        return <NotFound />;
      default:
        return <NotFound />;
    }
  };

  return (
    <ThemeProvider>
      <SocketProvider>
        {/* Navigation Header - Always show for 404 pages too */}
        <header className="header">
          <Nav currentView={currentView === '404' ? 'map' : currentView} onViewChange={handleViewChange} />
        </header>

        {/* Main Content */}
        {currentView === '404' ? (
          <NotFound />
        ) : (
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
        )}

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
      </SocketProvider>
    </ThemeProvider>
  );
}

export default App;