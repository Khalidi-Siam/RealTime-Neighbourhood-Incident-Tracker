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
  const [selectedIncidentForDetails, setSelectedIncidentForDetails] = useState(null); // Track incident selected for details

  // Function to center map on incident without opening details modal
  const handleIncidentCenter = (incident) => {
    console.log('Setting centered incident:', incident.title);
    setCenteredIncident(incident);
    setCenterTrigger(prev => prev + 1); // Force re-trigger even for same incident
    // Clear details selection when locating on map
    setSelectedIncidentForDetails(null);
  };

  // Function to open incident details modal
  const handleIncidentDetails = (incident) => {
    setSelectedIncident(incident);
    setSelectedIncidentForDetails(incident); // Track which incident was selected for details
    // Clear map location selection when viewing details
    setCenteredIncident(null);
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
        onIncidentDetails={handleIncidentDetails}
        selectedIncident={centeredIncident}
        selectedIncidentForDetails={selectedIncidentForDetails}
      />
      
      <MapView 
        selectedIncident={centeredIncident} 
        centerTrigger={centerTrigger}
        onMarkerClick={handleIncidentDetails}
        onUserLocationRequest={handleUserLocationRequest}
      />
      
      <Modal
        isOpen={!!selectedIncident}
        onClose={() => {
          setSelectedIncident(null);
          // Don't clear selectedIncidentForDetails here - keep the selection persistent
        }}
        title="Incident Details"
        size="default"
      >
        {selectedIncident && (
          <div className="incident-details-modal-wrapper">
            <IncidentDetailsModal
              incident={selectedIncident}
              onClose={() => {
                setSelectedIncident(null);
                // Don't clear selectedIncidentForDetails here - keep the selection persistent
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Home;