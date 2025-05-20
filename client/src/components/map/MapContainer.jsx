import React, { useRef, useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapControls from './controls/MapControls';
import FeaturePanel from './features/FeaturePanel';
import MapInfoPanel from './info/MapInfoPanel';
import MapLayerManager from './layers/MapLayerManager';
import Auth from '../auth/Auth';
import { authService } from '../../services/authService';
import '../../styles/MapView.css';
import '../../styles/MapContainer.css';

// Set your Mapbox token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

function MapContainer({ activeFeature, setActiveFeature, showAuth, setShowAuth, setIsLoggedIn, onAuthSuccess }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapError, setMapError] = useState(null);
  const [is3DMode, setIs3DMode] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [lng, setLng] = useState(-7.0);
  const [lat, setLat] = useState(31.5);
  const [zoom, setZoom] = useState(5);
  const [layers, setLayers] = useState({
    imported: false,
    waypoints: false
  });
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/outdoors-v12');
  const [authMode, setAuthMode] = useState('login'); // Default to login mode
  
  // Initialize map
  useEffect(() => {
    let loadTimer = null;
    
    // Check if token is present
    if (!mapboxgl.accessToken || mapboxgl.accessToken === 'undefined' || mapboxgl.accessToken.trim() === '') {
      setMapError("Missing Mapbox access token. Please check your environment variables.");
      return;
    }
    
    // Don't re-initialize if map already exists
    if (map.current) return;
    
    // Make sure the container is ready before initializing
    if (!mapContainer.current) {
      console.log("Map container not available yet.");
      return;
    }
    
    const initMap = () => {
      try {
        console.log("Initializing map...");
        
        // Create map instance
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: mapStyle,
          center: [lng, lat],
          zoom: zoom,
          maxZoom: 22,
          fadeDuration: 0,
          preserveDrawingBuffer: true,
          attributionControl: false,
          antialias: true,
          localIdeographFontFamily: false
        });

        console.log("Map object created:", map.current);

        // Set a load timeout
        loadTimer = setTimeout(() => {
          console.log("Map failed to load after timeout");
          setMapError("Map initialization timed out. Please check your connection and Mapbox token.");
        }, 10000); // 10 second timeout
        
        // Wait for map to load before adding controls
        map.current.on('load', () => {
          clearTimeout(loadTimer);
          console.log('Map fully loaded');
          
          // Add navigation control after map is loaded
          map.current.addControl(new mapboxgl.NavigationControl({
            visualizePitch: true
          }), 'bottom-right');
          
          // Set map as loaded
          setMapLoaded(true);

          // Add building layer for additional detail 
          map.current.addLayer({
            'id': '3d-buildings',
            'source': 'composite',
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'paint': {
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-opacity': 0.6
            }
          });
        });

        // Remove the problematic satellite layer code in the style.load event handler
        map.current.on('style.load', () => {
          // IMPORTANT: Remove all code related to satellite layer enhancement
          // We'll handle satellite differently
          
          // Instead, just restore 3D terrain if enabled
          if (is3DMode && map.current.getStyle()) {
            try {
              // Re-add terrain source if needed
              if (!map.current.getSource('mapbox-dem')) {
                map.current.addSource('mapbox-dem', {
                  'type': 'raster-dem',
                  'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
                  'tileSize': 512,
                  'maxzoom': 14
                });
              }
              
              // Re-add sky layer if needed
              if (!map.current.getLayer('sky')) {
                map.current.addLayer({
                  'id': 'sky',
                  'type': 'sky',
                  'paint': {
                    'sky-type': 'atmosphere',
                    'sky-atmosphere-sun': [0.0, 0.0],
                    'sky-atmosphere-sun-intensity': 15
                  }
                });
              }
              
              // Reapply terrain
              map.current.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
            } catch (err) {
              console.error('Error reapplying 3D terrain after style change:', err);
            }
          }
        });
        
        // Handle errors with more detail
        map.current.on('error', (e) => {
          clearTimeout(loadTimer);
          console.error('Map error:', e);
          
          // If error is related to style loading, provide more specific guidance
          if (e.error && (e.error.message.includes('style') || e.error.message.includes('source'))) {
            console.log('Style-related error detected');
            // Try falling back to outdoors style
            if (map.current.getStyle().sprite && map.current.getStyle().sprite.includes('satellite')) {
              console.log('Error with satellite style, falling back to outdoors');
              map.current.setStyle('mapbox://styles/mapbox/outdoors-v12');
              setMapStyle('mapbox://styles/mapbox/outdoors-v12');
              // Clear the error if style is successfully changed
              setMapError(null);
              return;
            }
          }
          
          setMapError('Error loading map. Please check your MapBox token and connection.');
        });
        
        // Update coordinates when map moves
        map.current.on('move', () => {
          setLng(parseFloat(map.current.getCenter().lng.toFixed(4)));
          setLat(parseFloat(map.current.getCenter().lat.toFixed(4)));
          setZoom(parseFloat(map.current.getZoom().toFixed(2)));
        });
        
      } catch (error) {
        clearTimeout(loadTimer);
        console.error('Error initializing map:', error);
        setMapError('Failed to initialize map: ' + error.message);
      }
    };

    // Slight delay to ensure DOM is ready
    const initTimer = setTimeout(initMap, 100);
    
    return () => {
      clearTimeout(loadTimer);
      clearTimeout(initTimer);
      
      if (map.current) {
        try {
          map.current.remove();
          map.current = null;
        } catch (e) {
          console.error("Error cleaning up map:", e);
        }
      }
    };
  }, []); // Only run once on mount
  
  // Update map style when it changes
  useEffect(() => {
    if (map.current && map.current.isStyleLoaded() && mapLoaded) {
      map.current.setStyle(mapStyle);
    }
  }, [mapStyle, mapLoaded]);
  
  // Handle file imports
  const handleImport = (geoJsonData) => {
    if (map.current && mapLoaded) {
      MapLayerManager.handleFileImport(map.current, geoJsonData, setRouteData, setLayers);
    } else {
      console.error("Map not ready for importing data");
    }
  };

  const handleLogout = () => {
    authService.clearAuth();
    setIsLoggedIn(false);
  };

  const openLogin = () => {
    setAuthMode('login');
    setShowAuth(true);
  };

  const openRegister = () => {
    setAuthMode('register');
    setShowAuth(true);
  };

  const isLoggedIn = authService.isAuthenticated();

  return (
    <div className="map-container">
      {mapError && (
        <div className="map-error-container">
          <h3>Map Error</h3>
          <p>{mapError}</p>
          <button onClick={() => window.location.reload()}>Reload Map</button>
        </div>
      )}
      
      {!mapLoaded && !mapError && (
        <div className="map-loading-indicator">
          <div className="loading-spinner"></div>
          <p>Loading map...</p>
        </div>
      )}
      
      {/* Auth modal */}
      {showAuth && (
        <Auth 
          mode={authMode} 
          onClose={() => setShowAuth(false)} 
          onSuccess={onAuthSuccess} 
        />
      )}
      
      {/* Add onWheel handler to prevent event propagation issues */}
      <div 
        ref={mapContainer} 
        className="map-view" 
        style={{ width: '100%', height: '100%', minHeight: '400px' }}
      ></div>
      
      {mapLoaded && (
        <>
          <MapInfoPanel lng={lng} lat={lat} zoom={zoom} />
          
          {/* Auth buttons - moved below the MapInfoPanel to avoid conflict with coordinate search */}
          <div className="auth-buttons">
            {!isLoggedIn ? (
              <>
                <button onClick={openLogin} className="auth-button login-button">
                  <i className="fas fa-sign-in-alt"></i> Login
                </button>
                <button onClick={openRegister} className="auth-button register-button">
                  <i className="fas fa-user-plus"></i> Register
                </button>
              </>
            ) : (
              <button onClick={handleLogout} className="auth-button logout-button">
                <i className="fas fa-sign-out-alt"></i> Logout
              </button>
            )}
          </div>

          <MapControls 
            map={map}
            mapStyle={mapStyle}
            setMapStyle={setMapStyle}
            activeFeature={activeFeature}
            setActiveFeature={setActiveFeature}
            is3DMode={is3DMode}
            setIs3DMode={setIs3DMode}
            routeData={routeData}
          />
          
          {activeFeature && (
            <FeaturePanel 
              activeFeature={activeFeature} 
              setActiveFeature={setActiveFeature} 
              map={map} 
              routeData={routeData} 
              onImport={handleImport}
            />
          )}
        </>
      )}
    </div>
  );
}

export default MapContainer;