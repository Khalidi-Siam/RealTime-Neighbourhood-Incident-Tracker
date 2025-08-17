import { useState, useEffect, useContext } from 'react';
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
  const [mapCenter, setMapCenter] = useState([23.8103, 90.4125]); // Default to Dhaka, Bangladesh
  const [mapZoom, setMapZoom] = useState(13);
  const [locationLoading, setLocationLoading] = useState(true);

  // Get user's current location
  const getCurrentLocation = () => {
    setLocationLoading(true);
    
    if (!navigator.geolocation) {
      console.log('Geolocation is not supported by this browser.');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMapCenter([latitude, longitude]);
        setMapZoom(15); // Zoom in closer when we have user's location
        setLocationLoading(false);
        console.log('Location found:', latitude, longitude);
      },
      (error) => {
        console.log('Error getting location:', error.message);
        // Keep default Dhaka location
        setLocationLoading(false);
        
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
        
        // Show temporary notification
        const notification = document.createElement('div');
        notification.className = 'location-notification';
        notification.textContent = locationError;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 4000);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds timeout
        maximumAge: 300000 // 5 minutes cache
      }
    );
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
    // Get user's location first
    getCurrentLocation();
    
    // Then fetch incidents
    fetchIncidents();

    const handleIncidentUpdate = () => {
      fetchIncidents();
    };

    window.addEventListener('incidentCreated', handleIncidentUpdate);
    return () => window.removeEventListener('incidentCreated', handleIncidentUpdate);
  }, []);

  // Component to handle map centering and marker highlighting
  function MapController({ selectedIncident, mapCenter, mapZoom }) {
    const map = useMap();

    useEffect(() => {
      // Store map instance globally for zoom controls
      window.mapInstance = map;
    }, [map]);

    // Handle initial map centering
    useEffect(() => {
      if (mapCenter && mapCenter[0] && mapCenter[1]) {
        map.setView(mapCenter, mapZoom, {
          animate: true,
          duration: 1.5
        });
      }
    }, [mapCenter, mapZoom, map]);
    
    // Handle selected incident centering
    useEffect(() => {
      if (selectedIncident && selectedIncident.location.lat && selectedIncident.location.lng) {
        map.flyTo([selectedIncident.location.lat, selectedIncident.location.lng], 15, {
          duration: 1.5,
          easeLinearity: 0.25
        });
      }
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
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        className={`custom-map ${mapStyle}`}
        zoomControl={false}
        key={`${mapCenter[0]}-${mapCenter[1]}`} // Force re-render when center changes
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
          mapCenter={mapCenter}
          mapZoom={mapZoom}
        />
      </MapContainer>
    </div>
  );
}

export default MapView;