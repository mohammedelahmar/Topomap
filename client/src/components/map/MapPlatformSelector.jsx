import React, { useState, useEffect } from 'react';
import MapContainer from './MapContainer';
import GoogleMapContainer from './GoogleMapContainer';

function MapPlatformSelector({ activeFeature, setActiveFeature, showAuth, setShowAuth, setIsLoggedIn, onAuthSuccess }) {
  const [mapPlatform, setMapPlatform] = useState(() => {
    // Get from localStorage or default to 'mapbox'
    return localStorage.getItem('preferredMapPlatform') || 'mapbox';
  });
  
  // Save preference when changed
  useEffect(() => {
    localStorage.setItem('preferredMapPlatform', mapPlatform);
  }, [mapPlatform]);

  return (
    <div className="map-platform-container">
      <div className="platform-selector">
        <button 
          className={`platform-button ${mapPlatform === 'mapbox' ? 'active' : ''}`}
          onClick={() => setMapPlatform('mapbox')}
        >
          Mapbox
        </button>
        <button 
          className={`platform-button ${mapPlatform === 'google' ? 'active' : ''}`}
          onClick={() => setMapPlatform('google')}
        >
          Google Maps
        </button>
      </div>
      
      {mapPlatform === 'mapbox' ? (
        <MapContainer 
          activeFeature={activeFeature}
          setActiveFeature={setActiveFeature}
          showAuth={showAuth}
          setShowAuth={setShowAuth}
          setIsLoggedIn={setIsLoggedIn}
          onAuthSuccess={onAuthSuccess}
        />
      ) : (
        <GoogleMapContainer 
          activeFeature={activeFeature}
          setActiveFeature={setActiveFeature}
          showAuth={showAuth}
          setShowAuth={setShowAuth}
          setIsLoggedIn={setIsLoggedIn}
          onAuthSuccess={onAuthSuccess}
        />
      )}
    </div>
  );
}

export default MapPlatformSelector;