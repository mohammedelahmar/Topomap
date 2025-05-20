import React, { useState } from 'react';
import StyleControls from './StyleControls';
import FeatureButtons from '../features/FeatureButtons';
import LocationControl from './LocationControl';
import CoordinateSearch from '../tools/CoordinateSearch';
import MapLayerManager from '../layers/MapLayerManager';
import mapboxgl from 'mapbox-gl';  // Add this import
import '../../../styles/MapControls.css';

function MapControls({ 
  map, 
  mapStyle, 
  setMapStyle, 
  activeFeature, 
  setActiveFeature, 
  is3DMode, 
  setIs3DMode,
  routeData 
}) {
  const [collapsed, setCollapsed] = useState(false);
  
  // Function to switch map styles
  const changeMapStyle = (style) => {
    if (!map?.current) return;
    
    // Don't change if already on this style
    if (mapStyle === style) return;
    
    try {
      // Show loading indicator or temporarily disable UI if needed
      
      // Store current view settings before changing style
      const currentCenter = map.current.getCenter();
      const currentZoom = map.current.getZoom();
      const currentPitch = map.current.getPitch();
      const currentBearing = map.current.getBearing();
      
      // Update state first
      setMapStyle(style);
      
      // Apply style with error handling
      try {
        map.current.setStyle(style);
      } catch (styleError) {
        console.error('Error setting style directly:', styleError);
        
        // Fallback approach - load style as JSON then apply
        fetch(style)
          .then(response => {
            if (!response.ok) throw new Error(`Failed to fetch style: ${response.statusText}`);
            return response.json();
          })
          .then(styleJson => {
            map.current.setStyle(styleJson);
          })
          .catch(fetchError => {
            console.error('Failed to fetch style JSON:', fetchError);
            // Fallback to outdoors style if satellite fails
            if (style.includes('satellite')) {
              console.log('Falling back to outdoors style');
              map.current.setStyle('mapbox://styles/mapbox/outdoors-v12');
              setMapStyle('mapbox://styles/mapbox/outdoors-v12');
            }
          });
      }
      
      // Re-add data sources and layers after style change
      map.current.once('style.load', () => {
        // Restore the previous view settings
        map.current.setCenter(currentCenter);
        map.current.setZoom(currentZoom);
        map.current.setPitch(currentPitch);
        map.current.setBearing(currentBearing);
        
        // If 3D mode is active, reapply terrain
        if (is3DMode) {
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
        
        // Reload layers if needed
        if (window._lastGeoJsonData) {
          MapLayerManager.reloadLayers(map.current, {
            imported: true,
            waypoints: true
          });
        }
      });
    } catch (error) {
      console.error('Error in style change process:', error);
    }
  };

  // Function to fly to specified coordinates
  const flyToCoordinates = (lng, lat) => {
    if (!map?.current) return;
    
    map.current.flyTo({
      center: [lng, lat],
      zoom: 14,
      essential: true,
      duration: 2000
    });
    
    // Add a temporary marker to highlight the location
    const marker = new mapboxgl.Marker({
      color: '#FF0000'
    })
    .setLngLat([lng, lat])
    .addTo(map.current);
    
    // Remove marker after a delay
    setTimeout(() => {
      marker.remove();
    }, 5000);
  };

  // Toggle 3D terrain
  const toggle3DTerrain = () => {
    if (!map?.current || !map.current.isStyleLoaded()) return;
    
    try {
      if (!is3DMode) {
        // Enable 3D terrain
        if (!map.current.getSource('mapbox-dem')) {
          map.current.addSource('mapbox-dem', {
            'type': 'raster-dem',
            'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
            'tileSize': 512,
            'maxzoom': 14
          });
        }
        
        // Add sky layer if it doesn't exist
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
        
        map.current.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
        map.current.setPitch(60); // Set a pitch for 3D view
      } else {
        // Disable 3D terrain
        map.current.setTerrain(null);
        map.current.setPitch(0); // Reset pitch to top-down view
      }
      
      setIs3DMode(!is3DMode);
    } catch (err) {
      console.error('Error toggling 3D terrain:', err);
    }
  };

  return (
    <div className={`map-controls-container ${collapsed ? 'collapsed' : ''}`}>
      <div 
        className="map-controls-toggle" 
        onClick={() => setCollapsed(!collapsed)} 
        title={collapsed ? "Open Tools Panel" : "Close Tools Panel"}
      >
        {collapsed ? '▶' : '◀'}
      </div>
      
      {!collapsed && (
        <>
          <CoordinateSearch onSearch={(x, y) => flyToCoordinates(x, y)} />
          <LocationControl map={map} />
          <StyleControls onStyleChange={changeMapStyle} currentStyle={mapStyle} />
          <FeatureButtons 
            activeFeature={activeFeature} 
            setActiveFeature={setActiveFeature} 
            routeData={routeData}
            is3DMode={is3DMode}
            toggle3DTerrain={toggle3DTerrain}
          />
        </>
      )}
    </div>
  );
}

export default MapControls;