import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import MapSidebar from '../components/MapSidebar.jsx';
import MapView from '../components/MapView.jsx';
import IncidentDetailsModal from '../components/IncidentDetailsModal.jsx';
import Modal from '../components/Modal.jsx';

function Home() {
  const { currentUser } = useContext(AuthContext);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [centeredIncident, setCenteredIncident] = useState(null);
  const [centerTrigger, setCenterTrigger] = useState(0); // Add trigger counter

  // Function to center map on incident without opening details modal
  const handleIncidentCenter = (incident) => {
    console.log('Setting centered incident:', incident.title);
    setCenteredIncident(incident);
    setCenterTrigger(prev => prev + 1); // Force re-trigger even for same incident
  };

  // Function to open incident details modal
  const handleIncidentDetails = (incident) => {
    setSelectedIncident(incident);
  };

  // Function to handle when user requests their location
  const handleUserLocationRequest = () => {
    // Clear any centered incident when user requests their location
    console.log('User requested location, clearing centered incident');
    setCenteredIncident(null);
  };

  return (
    <div className="map-container">
      <MapSidebar 
        onIncidentSelect={handleIncidentCenter} 
        selectedIncident={centeredIncident}
      />
      
      <MapView 
        selectedIncident={centeredIncident} 
        centerTrigger={centerTrigger}
        onMarkerClick={handleIncidentDetails}
        onUserLocationRequest={handleUserLocationRequest}
      />
      
      <Modal
        isOpen={!!selectedIncident}
        onClose={() => setSelectedIncident(null)}
        title="Incident Details"
        size="default"
      >
        {selectedIncident && (
          <div className="incident-details-modal-wrapper">
            <IncidentDetailsModal
              incident={selectedIncident}
              onClose={() => setSelectedIncident(null)}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Home;