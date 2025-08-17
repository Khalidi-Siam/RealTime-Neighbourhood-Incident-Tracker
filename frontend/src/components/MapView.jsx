import { useState, useEffect, useContext, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import { AuthContext } from '../context/AuthContext.jsx';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon issue in Leaflet
delete L.Icon.Default.prototype._getIconUrl;

// Custom marker icons for different incident severities
const createCustomIcon = (severity, isSelected = false) => {
  const colors = {
    High: isSelected ? '#ff4757' : '#ff3742',
    Medium: isSelected ? '#ffa502' : '#ff9500', 
    Low: isSelected ? '#2ed573' : '#26de81'
  };
  
  const size = isSelected ? [35, 35] : [25, 25];
  const color = colors[severity] || colors.Low;
  
  return new L.DivIcon({
    className: 'custom-marker',
    html: `
      <div class="marker-pin ${isSelected ? 'marker-selected' : ''}" style="background-color: ${color};">
        <div class="marker-icon">
          ${severity === 'High' ? '⚠️' : severity === 'Medium' ? '⚡' : '📍'}
        </div>
        <div class="marker-pulse" style="background-color: ${color};"></div>
      </div>
    `,
    iconSize: size,
    iconAnchor: [size[0]/2, size[1]],
    popupAnchor: [0, -size[1]]
  });
};

function MapView({ selectedIncident, onMarkerClick }) {
  const { currentUser } = useContext(AuthContext);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapStyle, setMapStyle] = useState('streets'); // dark, satellite, streets
  const [locationLoading, setLocationLoading] = useState(false);
  const locationRequestedRef = useRef(false); // Track when user explicitly requests location

  // Get user's current location (always ask for permission)
  const getCurrentLocation = () => {
    setLocationLoading(true);
    locationRequestedRef.current = true; // Mark that user explicitly requested location
    
    if (!navigator.geolocation) {
      console.log('Geolocation is not supported by this browser.');
      showLocationError('Geolocation is not supported by this browser. Showing Dhaka area.');
      setLocationLoading(false);
      
      // Center to Dhaka when geolocation not supported
      if (window.mapInstance) {
        window.mapInstance.setView([23.8103, 90.4125], 13, {
          animate: true,
          duration: 1.5
        });
      }
      return;
    }

    // Always ask for permission - no cached position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocationLoading(false);
        console.log('Location found:', latitude, longitude);
        
        // Center map to user location
        if (window.mapInstance) {
          window.mapInstance.setView([latitude, longitude], 15, {
            animate: true,
            duration: 1.5
          });
        }
        
        // Show success notification
        showLocationSuccess('Location found successfully!');
      },
      (error) => {
        console.log('Error getting location:', error.message);
        setLocationLoading(false);
        
        // Always return to Dhaka view on error
        if (window.mapInstance) {
          window.mapInstance.setView([23.8103, 90.4125], 13, {
            animate: true,
            duration: 1.5
          });
        }
        
        // Show user-friendly message based on error type
        let locationError = '';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            locationError = 'Location access denied. Showing Dhaka area.';
            break;
          case error.POSITION_UNAVAILABLE:
            locationError = 'Location information unavailable. Showing Dhaka area.';
            break;
          case error.TIMEOUT:
            locationError = 'Location request timed out. Showing Dhaka area.';
            break;
          default:
            locationError = 'Unable to get location. Showing Dhaka area.';
            break;
        }
        
        showLocationError(locationError);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds timeout
        maximumAge: 0 // Always get fresh location, no cache
      }
    );
  };

  // Show location success notification
  const showLocationSuccess = (message) => {
    const notification = document.createElement('div');
    notification.className = 'location-notification location-notification--success';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  };

  // Show location error notification  
  const showLocationError = (message) => {
    const notification = document.createElement('div');
    notification.className = 'location-notification location-notification--error';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 4000);
  };

  // Get tile layer configuration based on style
  const getTileLayer = () => {
    const tileLayers = {
      dark: {
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      },
      satellite: {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      },
      streets: {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }
    };
    return tileLayers[mapStyle] || tileLayers.dark;
  };

  // Fetch incidents from backend
  const fetchIncidents = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/incidents?limit=100', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch incidents');
      }

      // Add severity to incidents (client-side for now)
      const incidentsWithSeverity = data.incidents.map((incident) => ({
        ...incident,
        severity: (incident.votes.upvotes + incident.votes.downvotes) > 20
          ? 'High'
          : (incident.votes.upvotes + incident.votes.downvotes) > 10
          ? 'Medium'
          : 'Low',
      }));

      setIncidents(incidentsWithSeverity);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch incidents on component mount, don't get user location automatically
    fetchIncidents();

    const handleIncidentUpdate = () => {
      fetchIncidents();
    };

    window.addEventListener('incidentCreated', handleIncidentUpdate);
    return () => window.removeEventListener('incidentCreated', handleIncidentUpdate);
  }, []);

  // Component to handle incident centering only
  function MapController({ selectedIncident }) {
    const map = useMap();

    useEffect(() => {
      // Store map instance globally for zoom controls and location centering
      window.mapInstance = map;
    }, [map]);
    
    // Handle selected incident centering (only when incident is selected, not when cleared)
    useEffect(() => {
      if (selectedIncident && selectedIncident.location.lat && selectedIncident.location.lng) {
        map.flyTo([selectedIncident.location.lat, selectedIncident.location.lng], 15, {
          duration: 1.5,
          easeLinearity: 0.25
        });
      }
      // Don't do anything when selectedIncident becomes null - stay at current location
    }, [selectedIncident, map]);

    return null;
  }

  return (
    <div className="map-main">
      {loading && <div className="map-loading">
        <div className="loading-spinner"></div>
        <span>Loading incidents...</span>
      </div>}
      {error && <div className="map-error">
        <span>⚠️ {error}</span>
      </div>}
      
      {/* Map Style Controls */}
      <div className="map-style-controls">
        <button 
          className="style-btn location-btn"
          onClick={getCurrentLocation}
          title="Get My Location"
          disabled={locationLoading}
        >
          {locationLoading ? '🔄' : '📍'}
        </button>
        <button 
          className={`style-btn ${mapStyle === 'dark' ? 'active' : ''}`}
          onClick={() => setMapStyle('dark')}
          title="Dark Mode"
        >
          🌙
        </button>
        <button 
          className={`style-btn ${mapStyle === 'satellite' ? 'active' : ''}`}
          onClick={() => setMapStyle('satellite')}
          title="Satellite View"
        >
          🛰️
        </button>
        <button 
          className={`style-btn ${mapStyle === 'streets' ? 'active' : ''}`}
          onClick={() => setMapStyle('streets')}
          title="Street View"
        >
          🗺️
        </button>
      </div>

      {/* Legend */}
      <div className="map-legend">
        <h4>Incident Severity</h4>
        <div className="legend-item">
          <div className="legend-marker high"></div>
          <span>High Priority</span>
        </div>
        <div className="legend-item">
          <div className="legend-marker medium"></div>
          <span>Medium Priority</span>
        </div>
        <div className="legend-item">
          <div className="legend-marker low"></div>
          <span>Low Priority</span>
        </div>
      </div>

      {/* Custom Zoom Controls */}
      <div className="custom-zoom-controls">
        <button 
          className="zoom-btn zoom-in"
          onClick={() => {
            const map = window.mapInstance;
            if (map) map.zoomIn();
          }}
        >
          +
        </button>
        <button 
          className="zoom-btn zoom-out"
          onClick={() => {
            const map = window.mapInstance;
            if (map) map.zoomOut();
          }}
        >
          −
        </button>
      </div>

      <MapContainer
        center={[23.8103, 90.4125]} // Always start with Dhaka, let MapController handle centering
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        className={`custom-map ${mapStyle}`}
        zoomControl={false}
      >
        <TileLayer
          key={mapStyle} // Force re-render when style changes
          url={getTileLayer().url}
          attribution={getTileLayer().attribution}
        />

        {incidents
          .filter((incident) => incident.location.lat && incident.location.lng)
          .map((incident) => (
            <Marker
              key={incident._id}
              position={[incident.location.lat, incident.location.lng]}
              icon={createCustomIcon(
                incident.severity,
                selectedIncident && selectedIncident._id === incident._id
              )}
            >
              <Popup className="custom-popup">
                <div className="popup-content">
                  <div className="popup-header">
                    <h3>{incident.title}</h3>
                    <span className={`severity-badge ${incident.severity.toLowerCase()}`}>
                      {incident.severity}
                    </span>
                  </div>
                  <div className="popup-body">
                    <p className="category">📂 {incident.category}</p>
                    <p className="votes">
                      👍 {incident.votes.upvotes} | 👎 {incident.votes.downvotes}
                    </p>
                    <p className="date">
                      📅 {new Date(incident.date).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    className="popup-btn"
                    onClick={() => onMarkerClick(incident)}
                  >
                    View Details →
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        <MapController 
          selectedIncident={selectedIncident} 
        />
      </MapContainer>
    </div>
  );
}

export default MapView;