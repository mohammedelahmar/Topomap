import React, { useState, useEffect } from 'react';
import MapContainer from './MapContainer';
import GoogleMapContainer from './GoogleMapContainer';
import  '../../styles/MapPlatformSelector.css'; // Assuming you have a CSS file for styles

function MapPlatformSelector({ activeFeature, setActiveFeature, isLoggedIn }) {
  const [mapPlatform, setMapPlatform] = useState(() => {
    return localStorage.getItem('preferredMapPlatform') || 'mapbox';
  });
  
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
          isLoggedIn={isLoggedIn}
        />
      ) : (
        <GoogleMapContainer 
          activeFeature={activeFeature}
          setActiveFeature={setActiveFeature}
          isLoggedIn={isLoggedIn}
        />
      )}
    </div>
  );
}

export default MapPlatformSelector;