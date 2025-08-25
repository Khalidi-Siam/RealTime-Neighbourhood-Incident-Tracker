import { useState, useEffect, useContext, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker, useMapEvents } from 'react-leaflet';
import { AuthContext } from '../context/AuthContext.jsx';
import { incidentsAPI } from '../utils/api.js';
import { useSocket } from '../context/SocketContext.jsx';
import ReportModal from './ReportModal.jsx';
import ConfirmModal from './ConfirmModal.jsx';
import PopupContent from './PopupContent.jsx';
import MapClickModal from './MapClickModal.jsx';
import { handleReportAction, canDeleteIncident, canReportIncident } from '../utils/incidentActions.js';
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

function MapView({ selectedIncident, centerTrigger, onMarkerClick, onUserLocationRequest }) {
  const { currentUser, token } = useContext(AuthContext);
  const { socket, joinIncidentsRoom, leaveIncidentsRoom } = useSocket();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapStyle, setMapStyle] = useState('streets'); // dark, satellite, streets
  const [locationLoading, setLocationLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null); // Track which menu is open
  const locationRequestedRef = useRef(false); // Track when user explicitly requests location
  const locationRequestTimeRef = useRef(0); // Track timestamp of location request
  const markersRef = useRef({}); // Store marker references
  
  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMapClickModal, setShowMapClickModal] = useState(false);
  const [selectedIncidentForAction, setSelectedIncidentForAction] = useState(null);
  const [clickedLocation, setClickedLocation] = useState(null);

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

  // Socket.IO real-time updates
  useEffect(() => {
    if (!socket) return;

    // Join the incidents room for real-time updates
    joinIncidentsRoom();

    // Listen for new incidents
    const handleNewIncident = (data) => {
      console.log('New incident received:', data);
      setIncidents(prevIncidents => {
        // Check if incident already exists to avoid duplicates
        const exists = prevIncidents.some(incident => incident._id === data.incident._id);
        if (exists) return prevIncidents;
        
        return [data.incident, ...prevIncidents];
      });
      
      toast.success(data.message || 'New incident reported in your area!', {
        position: "top-right",
        autoClose: 4000,
      });
    };

    // Listen for incident deletions
    const handleIncidentDeleted = (data) => {
      console.log('Incident deleted:', data);
      setIncidents(prevIncidents => 
        prevIncidents.filter(incident => incident._id !== data.incidentId)
      );
      
      toast.info(data.message || 'An incident has been removed', {
        position: "top-right",
        autoClose: 3000,
      });
    };

    // Listen for vote updates
    const handleVoteUpdate = (data) => {
      console.log('Vote updated:', data);
      setIncidents(prevIncidents => 
        prevIncidents.map(incident => {
          if (incident._id === data.incidentId) {
            // Preserve the current user's vote status, only update counts
            const updatedVotes = {
              upvotes: data.votes.upvotes,
              downvotes: data.votes.downvotes,
              total: data.votes.total,
              userVote: incident.votes.userVote // Keep existing userVote from current state
            };
            
            // If this vote update is from the current user, update their userVote
            if (currentUser && data.voterId === currentUser.id) {
              if (data.action === 'removed') {
                updatedVotes.userVote = null;
              } else {
                updatedVotes.userVote = data.voteType;
              }
            }
            
            return { ...incident, votes: updatedVotes };
          }
          return incident;
        })
      );
    };

    // Listen for false report accepted (admin marks incident as false)
    const handleFalseReportAccepted = (data) => {
      console.log('False report accepted:', data);
      setIncidents(prevIncidents => 
        prevIncidents.map(incident => {
          if (incident._id === data.incidentId) {
            return { 
              ...incident, 
              falseFlagVerified: data.incident.falseFlagVerified,
              isFalseFlagged: data.incident.isFalseFlagged
            };
          }
          return incident;
        })
      );
      
      toast.info(data.message || 'An incident has been marked as false', {
        position: "top-right",
        autoClose: 3000,
      });
    };

    // Listen for false report rejected (admin restores incident)
    const handleFalseReportRejected = (data) => {
      console.log('False report rejected:', data);
      setIncidents(prevIncidents => 
        prevIncidents.map(incident => {
          if (incident._id === data.incidentId) {
            return { 
              ...incident, 
              falseFlagVerified: data.incident.falseFlagVerified,
              isFalseFlagged: data.incident.isFalseFlagged
            };
          }
          return incident;
        })
      );
      
      toast.success(data.message || 'An incident has been restored', {
        position: "top-right",
        autoClose: 3000,
      });
    };

    // Register event listeners
    socket.on('new-incident', handleNewIncident);
    socket.on('incident-deleted', handleIncidentDeleted);
    socket.on('incident-vote-updated', handleVoteUpdate);
    socket.on('incident-false-report-accepted', handleFalseReportAccepted);
    socket.on('incident-false-report-rejected', handleFalseReportRejected);

    // Cleanup
    return () => {
      socket.off('new-incident', handleNewIncident);
      socket.off('incident-deleted', handleIncidentDeleted);
      socket.off('incident-vote-updated', handleVoteUpdate);
      socket.off('incident-false-report-accepted', handleFalseReportAccepted);
      socket.off('incident-false-report-rejected', handleFalseReportRejected);
      leaveIncidentsRoom();
    };
  }, [socket, joinIncidentsRoom, leaveIncidentsRoom]);

  // Get user's current location (always ask for permission)
  const getCurrentLocation = () => {
    setLocationLoading(true);
    locationRequestedRef.current = true; // Mark that user explicitly requested location
    locationRequestTimeRef.current = Date.now(); // Record timestamp
    
    // Notify parent component that user requested location
    if (onUserLocationRequest) {
      onUserLocationRequest();
    }
    
    if (!navigator.geolocation) {
      console.log('Geolocation is not supported by this browser.');
      showLocationError('Geolocation is not supported by this browser. Showing Dhaka area.');
      setLocationLoading(false);
      
      // Center to Dhaka when geolocation not supported
      if (window.mapInstance) {
        window.mapInstance.flyTo([23.8103, 90.4125], 13, {
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
        console.log('Location found successfully:', latitude, longitude);
        
        // Close any open popups before centering to user location
        if (window.mapInstance) {
          console.log('Flying to user location:', latitude, longitude);
          window.mapInstance.closePopup();
          window.mapInstance.flyTo([latitude, longitude], 15, {
            animate: true,
            duration: 1.5
          });
        }
        
        // Clear the location request flag after map animation completes
        setTimeout(() => {
          locationRequestedRef.current = false;
          locationRequestTimeRef.current = 0;
          console.log('Location request flags cleared');
        }, 2000); // Clear after map animation completes
        
        // Show success notification
        showLocationSuccess('Location found successfully!');
      },
      (error) => {
        console.log('Error getting location:', error.message);
        setLocationLoading(false);
        
        // Always return to Dhaka view on error
        if (window.mapInstance) {
          window.mapInstance.flyTo([23.8103, 90.4125], 13, {
            animate: true,
            duration: 1.5
          });
        }
        
        // Clear location request flags after error
        setTimeout(() => {
          locationRequestedRef.current = false;
          locationRequestTimeRef.current = 0;
        }, 2000);
        
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
      const data = await incidentsAPI.getAll({
        limit: 100,
        sortBy: 'timestamp',
        order: -1
      });

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
      const data = await incidentsAPI.delete(incidentId);

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
      // If centerTrigger changed, it means user explicitly requested to locate an incident
      // This should work immediately, even after location requests
      if (selectedIncident && selectedIncident.location.lat && selectedIncident.location.lng) {
        console.log('Centering map on incident:', selectedIncident.title);
        
        // Clear location request flags since user explicitly wants to see an incident
        locationRequestedRef.current = false;
        locationRequestTimeRef.current = 0;
        
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
    }, [selectedIncident, centerTrigger, map]);

    return null;
  }

  // Component to handle map clicks for reporting incidents
  function MapClickHandler() {
    const { currentUser } = useContext(AuthContext);
    
    useMapEvents({
      click: async (e) => {
        // Only allow click-to-report if user is logged in
        if (!currentUser) {
          toast.info('Please log in to report incidents', {
            position: "top-right",
            autoClose: 3000,
          });
          return;
        }

        const { lat, lng } = e.latlng;
        
        // Try to get address from coordinates using reverse geocoding
        let address = '';
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
          );
          const data = await response.json();
          if (data && data.display_name) {
            address = data.display_name;
          }
        } catch (error) {
          console.log('Could not get address for coordinates:', error);
        }

        setClickedLocation({
          lat: lat,
          lng: lng,
          address: address || 'Selected location on map'
        });
        setShowMapClickModal(true);
      }
    });

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
          className="style-btn location-btn my-location-btn"
          onClick={getCurrentLocation}
          title="Find My Location"
          disabled={locationLoading}
        >
          {locationLoading ? (
            <span className="location-loading">🔄</span>
          ) : (
            <span className="my-location-icon">🎯</span>
          )}
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
        <MapClickHandler />
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

      {createPortal(
        <MapClickModal
          isOpen={showMapClickModal}
          onClose={() => {
            setShowMapClickModal(false);
            setClickedLocation(null);
          }}
          coordinates={clickedLocation || { lat: 0, lng: 0 }}
          address={clickedLocation?.address}
        />,
        document.body
      )}
    </div>
  );
}

export default MapView;