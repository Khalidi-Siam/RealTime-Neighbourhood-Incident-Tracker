import { useState, useEffect, useContext, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import { AuthContext } from '../context/AuthContext.jsx';
import ReportModal from './ReportModal.jsx';
import ConfirmModal from './ConfirmModal.jsx';
import PopupContent from './PopupContent.jsx';
import useReportStatus from '../hooks/useReportStatus.jsx';
import useReportCheck from '../hooks/useReportCheck.jsx';
import { handleReportAction, canDeleteIncident } from '../utils/incidentActions.js';
import { toast } from 'react-toastify';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon issue in Leaflet
delete L.Icon.Default.prototype._getIconUrl;

// Custom marker icons for different incident severities
const createCustomIcon = (severity, isSelected = false, isFalseReport = false) => {
  const colors = {
    High: isSelected ? '#ff4757' : '#ff3742',
    Medium: isSelected ? '#ffa502' : '#ff9500', 
    Low: isSelected ? '#2ed573' : '#26de81',
    False: isSelected ? '#95a5a6' : '#7f8c8d' // Gray color for false reports
  };
  
  const size = isSelected ? [35, 35] : [25, 25];
  let color, icon;
  
  if (isFalseReport) {
    color = colors.False;
    icon = '❌'; // X mark for false reports
  } else {
    color = colors[severity] || colors.Low;
    icon = severity === 'High' ? '⚠️' : severity === 'Medium' ? '⚡' : '📍';
  }
  
  return new L.DivIcon({
    className: `custom-marker ${isFalseReport ? 'custom-marker--false' : ''}`,
    html: `
      <div class="marker-pin ${isSelected ? 'marker-selected' : ''} ${isFalseReport ? 'marker-pin--false' : ''}" style="background-color: ${color};">
        <div class="marker-icon">
          ${icon}
        </div>
        <div class="marker-pulse ${isFalseReport ? 'marker-pulse--false' : ''}" style="background-color: ${color};"></div>
        ${isFalseReport ? '<div class="marker-false-label">FALSE</div>' : ''}
      </div>
    `,
    iconSize: size,
    iconAnchor: [size[0]/2, size[1]],
    popupAnchor: [0, -size[1]]
  });
};

function MapView({ selectedIncident, centerTrigger, onMarkerClick }) {
  const { currentUser, token } = useContext(AuthContext);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapStyle, setMapStyle] = useState('streets'); // dark, satellite, streets
  const [locationLoading, setLocationLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null); // Track which menu is open
  const locationRequestedRef = useRef(false); // Track when user explicitly requests location
  const markersRef = useRef({}); // Store marker references
  
  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedIncidentForAction, setSelectedIncidentForAction] = useState(null);

  // Check for URL parameters to center map on specific incident
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.hash.replace('#map?', ''));
    const lat = urlParams.get('lat');
    const lng = urlParams.get('lng');
    const incidentId = urlParams.get('incident');

    if (lat && lng && window.mapInstance) {
      // Center map on the coordinates from URL
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      
      setTimeout(() => {
        window.mapInstance.setView([latitude, longitude], 16, {
          animate: true,
          duration: 2
        });
      }, 500);

      // If incident ID is provided, try to find and highlight it
      if (incidentId && incidents.length > 0) {
        const targetIncident = incidents.find(incident => incident._id === incidentId);
        if (targetIncident && onMarkerClick) {
          setTimeout(() => {
            onMarkerClick(targetIncident);
          }, 1000);
        }
      }

      // Clear URL parameters after processing, but preserve the base view
      setTimeout(() => {
        window.history.replaceState({}, document.title, window.location.pathname + '#map');
      }, 2000); // Give time for map animation and incident selection
    }
  }, [incidents, onMarkerClick]);

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
      const response = await fetch('http://localhost:3000/api/incidents?limit=100&sortBy=timestamp&order=-1', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch incidents');
      }

      // Use severity from database, fallback to Medium if not provided
      const incidentsWithSeverity = data.incidents.map((incident) => ({
        ...incident,
        severity: incident.severity || 'Medium', // Use database severity or default to Medium
      }));

      setIncidents(incidentsWithSeverity);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete incident function
  const handleDeleteIncident = async (incidentId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/incidents/${incidentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete incident');
      }

      // Close modals
      setShowConfirmModal(false);
      setOpenMenuId(null);
      
      // Show success toast
      toast.success('Incident deleted successfully', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      // Refresh incidents list
      fetchIncidents();
      
      // Trigger page refresh or parent component update
      window.dispatchEvent(new CustomEvent('incidentDeleted', { detail: incidentId }));
    } catch (err) {
      setShowConfirmModal(false);
      toast.error('Error: ' + err.message, {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  // Handle report to admin with validation
  const handleReportToAdmin = async (incident) => {
    // All validation is now handled in PopupContent component
    setSelectedIncidentForAction(incident);
    setOpenMenuId(null);
    setShowReportModal(true);
  };

  // Show delete confirmation
  const showDeleteConfirmation = (incident) => {
    setSelectedIncidentForAction(incident);
    setOpenMenuId(null);
    setShowConfirmModal(true);
  };

  // Handle report status refresh (callback for when report is submitted)
  const handleReportSubmitted = () => {
    fetchIncidents(); // Refresh incidents to get updated report status
  };

  // Check if user can delete incident (admin or owner)
  const checkCanDeleteIncident = (incident) => {
    return canDeleteIncident(incident, currentUser);
  };

  // Check if user can report incident (user role only, not their own incident, haven't reported already)
  const checkCanReportIncident = (incident) => {
    return canReportIncident(incident, currentUser);
  };

  useEffect(() => {
    // Only fetch incidents on component mount, don't get user location automatically
    fetchIncidents();

    const handleIncidentUpdate = () => {
      fetchIncidents();
    };

    // Close menu when clicking outside
    const handleClickOutside = (event) => {
      if (!event.target.closest('.popup-menu')) {
        setOpenMenuId(null);
      }
    };

    window.addEventListener('incidentCreated', handleIncidentUpdate);
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      window.removeEventListener('incidentCreated', handleIncidentUpdate);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Component to handle incident centering only
  function MapController({ selectedIncident, centerTrigger }) {
    const map = useMap();

    useEffect(() => {
      // Store map instance globally for zoom controls and location centering
      window.mapInstance = map;
    }, [map]);
    
    // Handle selected incident centering (triggers every time centerTrigger changes)
    useEffect(() => {
      if (selectedIncident && selectedIncident.location.lat && selectedIncident.location.lng) {
        map.flyTo([selectedIncident.location.lat, selectedIncident.location.lng], 15, {
          duration: 1.5,
          easeLinearity: 0.25
        });

        // Auto-open popup for the selected incident after map animation
        setTimeout(() => {
          const markerRef = markersRef.current[selectedIncident._id];
          if (markerRef) {
            markerRef.openPopup();
          }
        }, 1600); // Wait for flyTo animation to complete (1.5s + 100ms buffer)
      }
      // Now this will trigger even for the same incident due to centerTrigger dependency
    }, [selectedIncident, centerTrigger, map]);

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
                selectedIncident && selectedIncident._id === incident._id,
                incident.falseFlagVerified
              )}
              ref={(ref) => {
                if (ref) {
                  markersRef.current[incident._id] = ref;
                }
              }}
            >
              <Popup className="custom-popup">
                <PopupContent
                  incident={incident}
                  openMenuId={openMenuId}
                  setOpenMenuId={setOpenMenuId}
                  onDeleteConfirmation={showDeleteConfirmation}
                  onReportToAdmin={handleReportToAdmin}
                  onMarkerClick={onMarkerClick}
                />
              </Popup>
            </Marker>
          ))}
        <MapController 
          selectedIncident={selectedIncident} 
          centerTrigger={centerTrigger}
        />
      </MapContainer>

      {/* Render modals using portal to ensure proper positioning */}
      {createPortal(
        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={() => selectedIncidentForAction && handleDeleteIncident(selectedIncidentForAction._id)}
          title="Delete Incident"
          message="Are you sure you want to delete this incident? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />,
        document.body
      )}

      {createPortal(
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          incident={selectedIncidentForAction}
          onReportSubmitted={handleReportSubmitted}
        />,
        document.body
      )}
    </div>
  );
}

export default MapView;