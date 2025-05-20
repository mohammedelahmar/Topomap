import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import '../../../styles/TerrainVisualization.css';

// Access the token from environment variables
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

function TerrainVisualization() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [is3DActive, setIs3DActive] = useState(true);
  const [showContours, setShowContours] = useState(true);
  const [mapError, setMapError] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  useEffect(() => {
    if (map.current) return;
    
    let mapInitTimer;
    
    try {
      // Wait a moment to ensure container is ready
      mapInitTimer = setTimeout(() => {
        if (!mapContainer.current) {
          setMapError('Map container not found');
          return;
        }
        
        try {
          map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/outdoors-v12',
            center: [-113.72, 48.30], // Glacier National Park
            zoom: 12,
            pitch: 60,
            bearing: 0,
            antialias: true
          });

          map.current.on('error', (e) => {
            console.error('Mapbox error:', e);
            setMapError('Error loading terrain map');
          });

          map.current.on('load', () => {
            try {
              // Add terrain source
              map.current.addSource('mapbox-dem', {
                'type': 'raster-dem',
                'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
                'tileSize': 512,
                'maxzoom': 14
              });
              
              // Add sky layer for realistic 3D
              map.current.addLayer({
                'id': 'sky',
                'type': 'sky',
                'paint': {
                  'sky-type': 'atmosphere',
                  'sky-atmosphere-sun': [0.0, 0.0],
                  'sky-atmosphere-sun-intensity': 15
                }
              });

              // Add terrain to make the map 3D
              map.current.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
              
              // Add contour lines
              map.current.addSource('contours', {
                type: 'vector',
                url: 'mapbox://mapbox.mapbox-terrain-v2'
              });
              
              map.current.addLayer({
                'id': 'contours',
                'type': 'line',
                'source': 'contours',
                'source-layer': 'contour',
                'layout': {
                  'visibility': 'visible',
                  'line-join': 'round',
                  'line-cap': 'round'
                },
                'paint': {
                  'line-color': '#7a6654',
                  'line-width': [
                    'interpolate',
                    ['linear'],
                    ['get', 'ele'],
                    100, 0.5,
                    1000, 1,
                    3000, 1.5
                  ],
                  'line-opacity': 0.8
                }
              });
              
              setMapLoaded(true);
              setMapError(null);
            } catch (err) {
              console.error('Error setting up terrain map layers:', err);
              setMapError('Failed to setup terrain visualization layers');
            }
          });
        } catch (err) {
          console.error('Failed to initialize terrain map:', err);
          setMapError('Failed to initialize terrain map');
        }
      }, 200);
    } catch (error) {
      console.error('Critical error initializing terrain visualization:', error);
      setMapError('Critical error initializing terrain visualization');
    }
    
    return () => {
      clearTimeout(mapInitTimer);
      if (map.current) {
        try {
          map.current.remove();
        } catch (err) {
          console.error('Error removing terrain map:', err);
        }
        map.current = null;
      }
    };
  }, []);
  
  // Toggle 3D effect
  const toggle3D = () => {
    if (!map.current || !mapLoaded) {
      setMapError('Map not ready yet. Please wait.');
      return;
    }
    
    try {
      if (is3DActive) {
        map.current.setTerrain(null);
        map.current.setPitch(0);
      } else {
        map.current.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
        map.current.setPitch(60);
      }
      
      setIs3DActive(!is3DActive);
      setMapError(null);
    } catch (err) {
      console.error('Error toggling 3D:', err);
      setMapError('Failed to toggle 3D terrain');
    }
  };
  
  // Toggle contour lines
  const toggleContours = () => {
    if (!map.current || !mapLoaded) {
      setMapError('Map not ready yet. Please wait.');
      return;
    }
    
    try {
      const visibility = showContours ? 'none' : 'visible';
      map.current.setLayoutProperty('contours', 'visibility', visibility);
      
      setShowContours(!showContours);
      setMapError(null);
    } catch (err) {
      console.error('Error toggling contours:', err);
      setMapError('Failed to toggle contour lines');
    }
  };

  return (
    <div className="terrain-container">
      <div className="terrain-controls">
        <button 
          onClick={toggle3D} 
          disabled={!mapLoaded}
          className={!mapLoaded ? 'disabled' : ''}
        >
          {is3DActive ? 'Disable 3D' : 'Enable 3D'}
        </button>
        <button 
          onClick={toggleContours} 
          disabled={!mapLoaded}
          className={!mapLoaded ? 'disabled' : ''}
        >
          {showContours ? 'Hide Contours' : 'Show Contours'}
        </button>
      </div>
      
      {mapError ? (
        <div className="map-error">
          <p>{mapError}</p>
          <p>Please check your Mapbox access token or internet connection.</p>
          <button onClick={() => setMapError(null)}>Dismiss</button>
        </div>
      ) : !mapLoaded ? (
        <div className="loading">
          <p>Loading terrain visualization...</p>
        </div>
      ) : null}
      
      <div ref={mapContainer} className="terrain-view" />
    </div>
  );
}

export default TerrainVisualization;