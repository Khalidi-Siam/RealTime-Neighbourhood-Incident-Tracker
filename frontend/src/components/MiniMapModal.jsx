import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue in Leaflet
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons for different incident severities (matching MapView)
const createCustomIcon = (severity, isSelected = false, isFalseReport = false) => {
  const colors = {
    High: isSelected ? '#ff4757' : '#ff3742',
    Medium: isSelected ? '#ffa502' : '#ff9500', 
    Low: isSelected ? '#2ed573' : '#26de81',
    False: isSelected ? '#95a5a6' : '#7f8c8d'
  };
  
  const size = isSelected ? [35, 35] : [25, 25];
  const iconSize = isSelected ? '14px' : '10px';
  let color, icon;
  
  if (isFalseReport) {
    color = colors.False;
    icon = '❌';
  } else {
    color = colors[severity] || colors.Low;
    icon = severity === 'High' ? '⚠️' : severity === 'Medium' ? '⚡' : '📍';
  }
  
  return new L.DivIcon({
    className: `custom-marker ${isFalseReport ? 'custom-marker--false' : ''}`,
    html: `
      <div class="marker-pin ${isSelected ? 'marker-selected' : ''} ${isFalseReport ? 'marker-pin--false' : ''}" style="background-color: ${color};">
        <div class="marker-icon" style="font-size: ${iconSize};">
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

// Component to handle map events and initialization
function MapEvents() {
  const map = useMap();
  
  useEffect(() => {
    // Invalidate size when component mounts
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [map]);

  return null;
}

function MiniMapModal({ isOpen, onClose, incident }) {
  const [mapReady, setMapReady] = useState(false);
  const [mapStyle, setMapStyle] = useState('streets');
  const mapRef = useRef(null);

  console.log('MiniMapModal render - isOpen:', isOpen, 'incident:', !!incident, 'mapReady:', mapReady);

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
    return tileLayers[mapStyle] || tileLayers.streets;
  };

  useEffect(() => {
    if (isOpen) {
      console.log('MiniMapModal: Setting up modal...');
      
      const handleClickOutside = (event) => {
        if (event.target.classList.contains('mini-map-modal-overlay')) {
          console.log('MiniMapModal: Clicked outside, closing...');
          onClose();
        }
      };

      const handleEscapeKey = (event) => {
        if (event.key === 'Escape') {
          console.log('MiniMapModal: Escape pressed, closing...');
          onClose();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
      
      setMapReady(false);
      const timer = setTimeout(() => {
        console.log('MiniMapModal: Setting mapReady to true');
        setMapReady(true);
      }, 200);

      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscapeKey);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && mapReady && mapRef.current) {
      console.log('MiniMapModal: Invalidating map size...');
      const timer = setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
          console.log('MiniMapModal: Map size invalidated');
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, mapReady]);

  if (!isOpen) {
    console.log('MiniMapModal: Not rendering - modal closed');
    return null;
  }

  if (!incident) {
    console.log('MiniMapModal: Not rendering - no incident');
    return null;
  }

  console.log('MiniMapModal: Incident data:', incident);

  // Validate incident location
  if (!incident.location || 
      (typeof incident.location.latitude !== 'number' && typeof incident.location.lat !== 'number') || 
      (typeof incident.location.longitude !== 'number' && typeof incident.location.lng !== 'number')) {
    return createPortal(
      <div className="mini-map-modal-overlay">
        <div className="mini-map-modal">
          <div className="mini-map-modal__header">
            <h3 className="mini-map-modal__title">Location Error</h3>
            <button
              className="mini-map-modal__close-btn"
              onClick={onClose}
              type="button"
              aria-label="Close mini map"
            >
              ×
            </button>
          </div>
          <div className="mini-map-modal__content">
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <p>This incident does not have valid location data.</p>
              <p>Location: {JSON.stringify(incident.location)}</p>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Support both latitude/longitude and lat/lng formats
  const latitude = incident.location.latitude || incident.location.lat;
  const longitude = incident.location.longitude || incident.location.lng;
  const position = [latitude, longitude];
  const isFalseReport = incident.falseFlagVerified || incident.isFalseReport;
  const tileLayer = getTileLayer();

  console.log('MiniMapModal: Position:', position, 'Map style:', mapStyle, 'Map ready:', mapReady);

  return createPortal(
    <div className="mini-map-modal-overlay">
      <div className="mini-map-modal">
        <div className="mini-map-modal__header">
          <h3 className="mini-map-modal__title">
            {incident.title}
          </h3>
          <button
            className="mini-map-modal__close-btn"
            onClick={onClose}
            type="button"
            aria-label="Close mini map"
          >
            ×
          </button>
        </div>
        <div className="mini-map-modal__content">
          {mapReady ? (
            <div className="mini-map-container">
              {/* Map Style Controls - matching main MapView design */}
              <div className="mini-map-style-controls">
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

              {/* Legend - matching main MapView design */}
              <div className="mini-map-legend">
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

              {/* Custom Zoom Controls - matching main MapView design */}
              <div className="mini-map-zoom-controls">
                <button 
                  className="zoom-btn zoom-in"
                  onClick={() => {
                    if (mapRef.current) {
                      mapRef.current.zoomIn();
                    }
                  }}
                  title="Zoom In"
                >
                  +
                </button>
                <button 
                  className="zoom-btn zoom-out"
                  onClick={() => {
                    if (mapRef.current) {
                      mapRef.current.zoomOut();
                    }
                  }}
                  title="Zoom Out"
                >
                  −
                </button>
              </div>

              <MapContainer
                center={position}
                zoom={16}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%', zIndex: 1 }}
                className={`custom-map ${mapStyle}`}
                ref={mapRef}
                key={`${incident._id}-${isOpen}-${mapStyle}`}
                whenReady={(map) => {
                  console.log('MiniMapModal: Map ready');
                  setTimeout(() => {
                    map.target.invalidateSize();
                  }, 100);
                }}
              >
                <MapEvents />
                <TileLayer
                  url={tileLayer.url}
                  attribution={tileLayer.attribution}
                  key={mapStyle}
                />
                <Marker 
                  position={position} 
                  icon={createCustomIcon(incident.severity, true, isFalseReport)}
                />
              </MapContainer>
            </div>
          ) : (
            <div className="mini-map-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
              <div style={{ textAlign: 'center' }}>
                <p>Loading map...</p>
                <p style={{ fontSize: '12px', color: '#666' }}>
                  Location: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default MiniMapModal;
