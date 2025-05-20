import mapboxgl from 'mapbox-gl';

class MapLayerManager {
  static handleFileImport(map, geoJsonData, setRouteData, setLayers) {
    if (!map || !geoJsonData) return;
    
    // Store the data for potential reuse after style changes
    window._lastGeoJsonData = geoJsonData;
    
    // Remove existing data layer if present
    if (map.getSource('imported-data')) {
      map.removeLayer('imported-data-layer');
      if (map.getLayer('imported-waypoints')) {
        map.removeLayer('imported-waypoints');
      }
      map.removeSource('imported-data');
    }
    
    // Make sure the map style is fully loaded
    if (!map.isStyleLoaded()) {
      map.once('style.load', () => this.handleFileImport(map, geoJsonData, setRouteData, setLayers));
      return;
    }
    
    try {
      // Add the GeoJSON data as a source
      map.addSource('imported-data', {
        type: 'geojson',
        data: geoJsonData
      });
      
      // Add a layer to visualize the data
      map.addLayer({
        id: 'imported-data-layer',
        type: 'line',
        source: 'imported-data',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3887be',
          'line-width': 5,
          'line-opacity': 0.75
        },
        filter: ['==', '$type', 'LineString']
      });
      
      // Add point layer for waypoints
      map.addLayer({
        id: 'imported-waypoints',
        type: 'circle',
        source: 'imported-data',
        paint: {
          'circle-radius': 6,
          'circle-color': '#ff7700',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        },
        filter: ['==', '$type', 'Point']
      });
      
      setLayers(prev => ({...prev, imported: true, waypoints: true}));
      
      // Fit map to the data bounds
      const bounds = new mapboxgl.LngLatBounds();
      let hasValidCoordinates = false;
      
      geoJsonData.features.forEach(feature => {
        if (feature.geometry.type === 'Point') {
          bounds.extend(feature.geometry.coordinates);
          hasValidCoordinates = true;
        } else if (feature.geometry.type === 'LineString') {
          feature.geometry.coordinates.forEach(coord => {
            bounds.extend(coord);
            hasValidCoordinates = true;
          });
        } else if (feature.geometry.type === 'Polygon') {
          feature.geometry.coordinates[0].forEach(coord => {
            bounds.extend(coord);
            hasValidCoordinates = true;
          });
        }
      });
      
      if (hasValidCoordinates) {
        map.fitBounds(bounds, { padding: 50 });
      }
      
      // Find a route feature if available for elevation profile
      const routeFeature = geoJsonData.features.find(f => 
        f.geometry.type === 'LineString' && 
        f.geometry.coordinates.length > 1
      );
      
      if (routeFeature) {
        setRouteData({
          name: routeFeature.properties?.name || 'Imported Route',
          coordinates: routeFeature.geometry.coordinates
        });
      }
    } catch (err) {
      console.error("Error importing data:", err);
    }
  }

  static reloadLayers(map, layers) {
    if (!map || !map.isStyleLoaded()) return;
    
    try {
      // Check if we have GeoJSON data to reload
      if (layers.imported) {
        // Re-add the source and layers
        if (!map.getSource('imported-data') && window._lastGeoJsonData) {
          // Add the GeoJSON data as a source
          map.addSource('imported-data', {
            type: 'geojson',
            data: window._lastGeoJsonData
          });
          
          // Add line layer
          map.addLayer({
            id: 'imported-data-layer',
            type: 'line',
            source: 'imported-data',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#3887be',
              'line-width': 5,
              'line-opacity': 0.75
            },
            filter: ['==', '$type', 'LineString']
          });
          
          // Add point layer
          map.addLayer({
            id: 'imported-waypoints',
            type: 'circle',
            source: 'imported-data',
            paint: {
              'circle-radius': 6,
              'circle-color': '#ff7700',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff'
            },
            filter: ['==', '$type', 'Point']
          });
        }
      }
    } catch (err) {
      console.error("Error reloading layers:", err);
    }
  }
}

export default MapLayerManager;