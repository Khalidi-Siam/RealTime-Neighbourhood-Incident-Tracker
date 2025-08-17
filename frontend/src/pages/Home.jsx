import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import MapSidebar from '../components/MapSidebar.jsx';
import MapView from '../components/MapView.jsx';
import IncidentDetailsModal from '../components/IncidentDetailsModal.jsx';
import Modal from '../components/Modal.jsx';

function Home() {
  const { currentUser } = useContext(AuthContext);
  const [selectedIncident, setSelectedIncident] = useState(null);

  return (
    <div className="map-container">
      <MapSidebar 
        onIncidentSelect={setSelectedIncident} 
        selectedIncident={selectedIncident}
      />
      
      <MapView 
        selectedIncident={selectedIncident} 
        onMarkerClick={setSelectedIncident} 
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