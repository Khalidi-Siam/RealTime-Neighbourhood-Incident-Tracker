import { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext.jsx';
import Home from './pages/Home.jsx';
import Feed from './pages/Feed.jsx';
import Profile from './pages/Profile.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import Nav from './components/Nav.jsx';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [currentView, setCurrentView] = useState('map');

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
        <Nav currentView={currentView} onViewChange={setCurrentView} />
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