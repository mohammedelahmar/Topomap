import React, { useState, useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import FeatureButtons from './features/FeatureButtons';
import FeaturePanel from './features/FeaturePanel';
import '../../styles/MapContainer.css';

function GoogleMapContainer({ activeFeature, setActiveFeature, showAuth, setShowAuth, setIsLoggedIn, onAuthSuccess }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapError, setMapError] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [is3DMode, setIs3DMode] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [mapType, setMapType] = useState('roadmap'); // roadmap, satellite, hybrid, terrain

  useEffect(() => {
    // Load Google Maps API
    const loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      version: "weekly",
      libraries: ["places", "drawing", "geometry"]
    });

    loader.load()
      .then(() => {
        map.current = new google.maps.Map(mapContainer.current, {
          center: { lat: 31.5, lng: -7.0 },
          zoom: 5,
          mapTypeId: mapType,
          mapTypeControl: false, // We'll use our own controls
          fullscreenControl: false,
          streetViewControl: false
        });
        
        setMapLoaded(true);
      })
      .catch(err => {
        console.error('Error loading Google Maps:', err);
        setMapError('Failed to load Google Maps');
      });
      
    return () => {
      // Google Maps doesn't need explicit cleanup
    };
  }, []);
  
  // Update map type when it changes
  useEffect(() => {
    if (map.current && mapLoaded) {
      map.current.setMapTypeId(mapType);
    }
  }, [mapType, mapLoaded]);
  
  // Toggle 3D terrain
  const toggle3DTerrain = () => {
    if (!map.current) return;
    
    setIs3DMode(prev => {
      const newMode = !prev;
      const tiltAngle = newMode ? 45 : 0;
      
      map.current.setOptions({
        tilt: tiltAngle
      });
      
      // Enable terrain in 3D mode
      if (newMode) {
        map.current.setMapTypeId('terrain');
      } else {
        // Return to previous style
        map.current.setMapTypeId(mapType);
      }
      
      return newMode;
    });
  };
  
  // For other functionality like import, export, etc.
  // You would need to implement Google Maps versions...
  
  return (
    <div className="map-container">
      {mapError && <div className="map-error">{mapError}</div>}
      
      <div ref={mapContainer} className="map-view" />
      
      <div className="map-controls">
        <div className="map-type-controls">
          <button 
            className={mapType === 'roadmap' ? 'active' : ''}
            onClick={() => setMapType('roadmap')}
          >
            Roads
          </button>
          <button 
            className={mapType === 'satellite' ? 'active' : ''}
            onClick={() => setMapType('satellite')}
          >
            Satellite
          </button>
          <button 
            className={mapType === 'hybrid' ? 'active' : ''}
            onClick={() => setMapType('hybrid')}
          >
            Hybrid
          </button>
          <button 
            className={mapType === 'terrain' ? 'active' : ''}
            onClick={() => setMapType('terrain')}
          >
            Terrain
          </button>
        </div>
        
        <FeatureButtons
          activeFeature={activeFeature}
          setActiveFeature={setActiveFeature}
          routeData={routeData}
          is3DMode={is3DMode}
          toggle3DTerrain={toggle3DTerrain}
        />
      </div>
      
      {activeFeature && (
        <FeaturePanel
          activeFeature={activeFeature}
          setActiveFeature={setActiveFeature}
          map={map}
          routeData={routeData}
          onImport={(data) => setRouteData(data)}
        />
      )}
    </div>
  );
}

export default GoogleMapContainer;