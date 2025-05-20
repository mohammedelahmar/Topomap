import React, { useState, useEffect, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import '../../../styles/LocationControl.css';

function LocationControl({ map }) {
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [currentMarker, setCurrentMarker] = useState(null);

  // Get user location and center map
  const getUserLocation = useCallback(() => {
    if (!map?.current) {
      console.log('Map reference not available');
      return;
    }
    
    if (!map.current.loaded()) {
      console.log('Map not fully loaded');
      return;
    }
    
    setIsLocating(true);
    setLocationError(null);
    
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(position => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Center map on user location
          map.current.flyTo({
            center: [longitude, latitude],
            zoom: 14,
            essential: true
          });
          
          // Add or update marker
          if (currentMarker) {
            currentMarker.setLngLat([longitude, latitude]);
          } else {
            // Create a pulsing dot for user location
            const el = document.createElement('div');
            el.className = 'location-marker';
            
            const newMarker = new mapboxgl.Marker({
              element: el,
              anchor: 'center'
            })
            .setLngLat([longitude, latitude])
            .addTo(map.current);
            
            setCurrentMarker(newMarker);
          }
        } catch (e) {
          console.error('Error setting location:', e);
          setLocationError('Error setting location');
        }
        
        setIsLocating(false);
      }, error => {
        console.error("Geolocation error:", error);
        setLocationError(error.message);
        setIsLocating(false);
      }, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      });
    } else {
      setLocationError("Geolocation is not supported by your browser");
      setIsLocating(false);
    }
  }, [map, currentMarker]);
  
  // Cleanup marker when component unmounts
  useEffect(() => {
    return () => {
      if (currentMarker) {
        currentMarker.remove();
      }
    };
  }, [currentMarker]);

  return (
    <div className="location-control">
      <button 
        className={`location-button ${isLocating ? 'locating' : ''}`}
        onClick={getUserLocation}
        title="Show my location"
        disabled={isLocating}
      >
        <span role="img" aria-label="location">📍</span>
      </button>
      
      {locationError && (
        <div className="location-error">
          {locationError}
        </div>
      )}
    </div>
  );
}

export default LocationControl;