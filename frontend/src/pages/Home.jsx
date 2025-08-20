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
    setCenteredIncident(incident);
    setCenterTrigger(prev => prev + 1); // Force re-trigger even for same incident
  };

  // Function to open incident details modal
  const handleIncidentDetails = (incident) => {
    setSelectedIncident(incident);
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
      />
      
      <Modal
        isOpen={!!selectedIncident}
        onClose={() => setSelectedIncident(null)}
        title="Incident Details"
      >
        {selectedIncident && (
          <IncidentDetailsModal
            incident={selectedIncident}
            onClose={() => setSelectedIncident(null)}
          />
        )}
      </Modal>
    </div>
  );
}

export default Home;