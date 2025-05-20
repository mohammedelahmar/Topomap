import React, { useState, useEffect, useCallback, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import * as turf from '@turf/turf';
import '../../../styles/MeasurementTool.css';

// Globals to ensure persistence across component life cycles
if (!window.measurementTools) {
  window.measurementTools = {
    drawInstance: null,
    popup: null,
    eventHandlersAttached: false,
    mapRef: null,
    lastFeatures: null
  };
}

function MeasurementTool({ map }) {
  const drawRef = useRef(null);
  const initTimerRef = useRef(null);
  const popupRef = useRef(null);
  const [measurements, setMeasurements] = useState([]);
  const [activeTool, setActiveTool] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [error, setError] = useState(null);
  const [isToolReady, setIsToolReady] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState(null);

  // Load saved measurements from localStorage
  useEffect(() => {
    const savedMeasurements = localStorage.getItem('mapMeasurements');
    if (savedMeasurements) {
      try {
        setMeasurements(JSON.parse(savedMeasurements));
      } catch (err) {
        console.error("Error parsing saved measurements:", err);
      }
    }
  }, []);

  // Helper function to save measurements to localStorage
  const saveMeasurementsToStorage = useCallback((measurementData) => {
    try {
      localStorage.setItem('mapMeasurements', JSON.stringify(measurementData));
    } catch (err) {
      console.error("Error saving measurements to localStorage:", err);
    }
  }, []);
  
  // Helper to save feature data to localStorage
  const saveFeaturesToStorage = useCallback(() => {
    if (!drawRef.current) return;
    try {
      const features = drawRef.current.getAll();
      localStorage.setItem('mapDrawFeatures', JSON.stringify(features));
      // Also store in window for persistence
      window.measurementTools.lastFeatures = features;
    } catch (err) {
      console.error("Error saving features to localStorage:", err);
    }
  }, []);

  // Helper function to show measurement popup
  const showMeasurementPopup = useCallback((feature, lngLat) => {
    if (!feature || !feature.geometry) return;
    
    let popupContent = '';
    
    try {
      if (feature.geometry.type === 'LineString') {
        const line = turf.lineString(feature.geometry.coordinates);
        const length = turf.length(line, { units: 'kilometers' });
        
        popupContent = `
          <div class="measurement-popup-content">
            <strong>Distance:</strong> ${length < 1 
              ? `${(length * 1000).toFixed(2)} m` 
              : `${length.toFixed(2)} km`}
          </div>
        `;
      } else if (feature.geometry.type === 'Polygon') {
        const polygon = turf.polygon(feature.geometry.coordinates);
        const area = turf.area(polygon) / 1000000;
        const ring = turf.lineString(feature.geometry.coordinates[0]);
        const perimeter = turf.length(ring, { units: 'kilometers' });
        
        popupContent = `
          <div class="measurement-popup-content">
            <strong>Area:</strong> ${area < 1 
              ? `${(area * 1000000).toFixed(2)} m²` 
              : `${area.toFixed(4)} km²`}
            <br>
            <strong>Perimeter:</strong> ${perimeter < 1 
              ? `${(perimeter * 1000).toFixed(2)} m` 
              : `${perimeter.toFixed(2)} km`}
          </div>
        `;
      }
      
      if (popupContent && map?.current) {
        if (!popupRef.current) {
          popupRef.current = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: 'measurement-popup',
            maxWidth: '250px',
            anchor: 'bottom'
          });
        }
        
        popupRef.current
          .setLngLat(lngLat)
          .setHTML(popupContent)
          .addTo(map.current);
      }
    } catch (err) {
      console.error("Error showing measurement popup:", err);
    }
  }, [map]);

  // Update measurements function
  const updateMeasurements = useCallback(() => {
    if (!drawRef.current) return;
    
    try {
      const data = drawRef.current.getAll();
      if (!data || data.features.length === 0) {
        setMeasurements([]);
        saveMeasurementsToStorage([]);
        return;
      }

      // Process all features
      const newMeasurements = data.features.map(feature => {
        const measurement = {
          id: feature.id,
          type: feature.geometry.type,
          timestamp: new Date().toISOString(),
        };

        if (feature.geometry.type === 'LineString') {
          if (feature.geometry.coordinates.length >= 2) {
            const line = turf.lineString(feature.geometry.coordinates);
            const length = turf.length(line, { units: 'kilometers' });
            measurement.distance = length;
          }
        } else if (feature.geometry.type === 'Polygon') {
          if (feature.geometry.coordinates && 
              feature.geometry.coordinates[0] && 
              feature.geometry.coordinates[0].length > 2) {
            
            const polygon = turf.polygon(feature.geometry.coordinates);
            const area = turf.area(polygon) / 1000000; // Convert to sq km

            const ring = turf.lineString(feature.geometry.coordinates[0]);
            const perimeter = turf.length(ring, { units: 'kilometers' });

            measurement.area = area;
            measurement.perimeter = perimeter;
          }
        }

        return measurement;
      });

      setMeasurements(newMeasurements);
      saveMeasurementsToStorage(newMeasurements);
      
    } catch (err) {
      console.error("Error calculating measurements:", err);
      setError("Error calculating measurements: " + err.message);
    }
  }, [saveMeasurementsToStorage]);

  // Attach persistent event handlers that will work even when component is unmounted
  const attachPersistentEventHandlers = useCallback(() => {
    if (!map?.current || window.measurementTools.eventHandlersAttached) return;
    
    try {
      // Store map reference for future use
      window.measurementTools.mapRef = map.current;
      
      // Persistent popup for hover measurements
      if (!window.measurementTools.popup) {
        window.measurementTools.popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          className: 'measurement-popup',
          maxWidth: '250px',
          anchor: 'bottom'
        });
      }
      
      // Define persistent hover handler
      const handlePersistentHover = (e) => {
        try {
          if (!window.measurementTools.mapRef || !window.measurementTools.drawInstance) return;
          
          // Use a bounding box for hit detection
          const bbox = [
            [e.point.x - 10, e.point.y - 10],
            [e.point.x + 10, e.point.y + 10]
          ];
          
          // Query features
          const features = window.measurementTools.mapRef.queryRenderedFeatures(bbox);
          
          // Filter for draw features
          const drawFeatures = features.filter(f => 
            f.layer && f.layer.id && 
            (f.layer.id.startsWith('gl-draw') || f.layer.id.includes('draw')) && 
            f.properties && f.properties.id
          );
          
          if (drawFeatures.length > 0) {
            const featureId = drawFeatures[0].properties.id;
            
            // Get the full feature if possible
            let fullFeature;
            if (window.measurementTools.drawInstance.get) {
              fullFeature = window.measurementTools.drawInstance.get(featureId);
            } else if (window.measurementTools.lastFeatures) {
              // Fallback to stored features
              fullFeature = window.measurementTools.lastFeatures.features.find(f => f.id === featureId);
            }
            
            if (fullFeature) {
              let popupContent = '';
              
              // Calculate measurements
              if (fullFeature.geometry.type === 'LineString') {
                const line = turf.lineString(fullFeature.geometry.coordinates);
                const length = turf.length(line, { units: 'kilometers' });
                
                popupContent = `
                  <div class="measurement-popup-content">
                    <strong>Distance:</strong> ${length < 1 
                      ? `${(length * 1000).toFixed(2)} m` 
                      : `${length.toFixed(2)} km`}
                  </div>
                `;
              } else if (fullFeature.geometry.type === 'Polygon') {
                const polygon = turf.polygon(fullFeature.geometry.coordinates);
                const area = turf.area(polygon) / 1000000;
                const ring = turf.lineString(fullFeature.geometry.coordinates[0]);
                const perimeter = turf.length(ring, { units: 'kilometers' });
                
                popupContent = `
                  <div class="measurement-popup-content">
                    <strong>Area:</strong> ${area < 1 
                      ? `${(area * 1000000).toFixed(2)} m²` 
                      : `${area.toFixed(4)} km²`}
                    <br>
                    <strong>Perimeter:</strong> ${perimeter < 1 
                      ? `${(perimeter * 1000).toFixed(2)} m` 
                      : `${perimeter.toFixed(2)} km`}
                  </div>
                `;
              }
              
              if (popupContent) {
                window.measurementTools.popup
                  .setLngLat(e.lngLat)
                  .setHTML(popupContent)
                  .addTo(window.measurementTools.mapRef);
                
                window.measurementTools.mapRef.getCanvas().style.cursor = 'pointer';
              }
            }
          } else {
            if (window.measurementTools.popup) window.measurementTools.popup.remove();
            if (window.measurementTools.mapRef) {
              window.measurementTools.mapRef.getCanvas().style.cursor = '';
            }
          }
        } catch (err) {
          console.error("Error in persistent hover handler:", err);
        }
      };
      
      // Handle mouseout
      const handlePersistentMouseout = () => {
        try {
          if (window.measurementTools.popup) {
            window.measurementTools.popup.remove();
          }
          if (window.measurementTools.mapRef) {
            window.measurementTools.mapRef.getCanvas().style.cursor = '';
          }
        } catch (err) {
          console.error("Error in mouseout handler:", err);
        }
      };
      
      // Handle clicks to enter edit mode
      const handlePersistentDoubleClick = (e) => {
        try {
          if (!window.measurementTools.mapRef || !window.measurementTools.drawInstance) return;
          
          // Already in a drawing mode? Skip
          const currentMode = window.measurementTools.drawInstance.getMode();
          if (currentMode && currentMode.includes('draw')) return;
          
          // Use a bounding box for hit detection
          const bbox = [
            [e.point.x - 8, e.point.y - 8],
            [e.point.x + 8, e.point.y + 8]
          ];
          
          // Query features
          const features = window.measurementTools.mapRef.queryRenderedFeatures(bbox);
          
          // Filter for draw features
          const drawFeatures = features.filter(f => 
            f.layer && f.layer.id && 
            (f.layer.id.startsWith('gl-draw') || f.layer.id.includes('draw')) && 
            f.properties && f.properties.id
          );
          
          if (drawFeatures.length > 0) {
            const featureId = drawFeatures[0].properties.id;
            
            if (featureId) {
              console.log(`Double-click: entering direct_select for feature ${featureId}`);
              
              // Select first, then edit
              window.measurementTools.drawInstance.changeMode('simple_select', { featureId });
              
              // Short delay before entering edit mode
              setTimeout(() => {
                if (window.measurementTools.drawInstance) {
                  window.measurementTools.drawInstance.changeMode('direct_select', { featureId });
                }
              }, 50);
            }
          }
        } catch (err) {
          console.error("Error in double-click handler:", err);
        }
      };
      
      // Auto-save handler for any feature updates
      const handlePersistentUpdate = () => {
        try {
          if (!window.measurementTools.drawInstance) return;
          
          // Save the updated features
          const features = window.measurementTools.drawInstance.getAll();
          localStorage.setItem('mapDrawFeatures', JSON.stringify(features));
          window.measurementTools.lastFeatures = features;
        } catch (err) {
          console.error("Error in update handler:", err);
        }
      };
      
      // Clean up existing handlers first
      map.current.off('mousemove', 'persistent-hover');
      map.current.off('mouseout', 'persistent-mouseout');
      map.current.off('dblclick', 'persistent-dblclick');
      map.current.off('draw.update', 'persistent-update');
      
      // Add the persistent event handlers with names so we can reference them later
      map.current.on('mousemove', handlePersistentHover);
      map.current.on('mouseout', handlePersistentMouseout);
      map.current.on('dblclick', handlePersistentDoubleClick);
      map.current.on('draw.update', handlePersistentUpdate);
      
      // Mark as attached
      window.measurementTools.eventHandlersAttached = true;
      
      console.log("Persistent event handlers attached");
    } catch (err) {
      console.error("Error attaching persistent event handlers:", err);
    }
  }, [map]);

  // Main effect for initializing the measurement tool
  useEffect(() => {
    try {
      console.log("MeasurementTool mounted, map exists:", !!map?.current);
      
      // Create a persistent MapboxDraw instance if it doesn't exist
      if (!window.measurementTools.drawInstance) {
        try {
          window.measurementTools.drawInstance = new MapboxDraw({
            displayControlsDefault: false,
            controls: {
              polygon: true,
              line_string: true,
              trash: true
            },
            styles: [
              // Line styling
              {
                id: 'gl-draw-line',
                type: 'line',
                filter: ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
                layout: {
                  'line-cap': 'round',
                  'line-join': 'round'
                },
                paint: {
                  'line-color': '#3b82f6',
                  'line-width': 4
                }
              },
              {
                id: 'gl-draw-polygon',
                type: 'fill',
                filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
                paint: {
                  'fill-color': '#3b82f6',
                  'fill-outline-color': '#3b82f6',
                  'fill-opacity': 0.2
                }
              },
              {
                id: 'gl-draw-polygon-stroke',
                type: 'line',
                filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
                layout: {
                  'line-cap': 'round',
                  'line-join': 'round'
                },
                paint: {
                  'line-color': '#3b82f6',
                  'line-width': 3
                }
              },
              // Static styles (when not in drawing mode)
              {
                'id': 'gl-draw-line-static',
                'type': 'line',
                'filter': ['all', ['==', '$type', 'LineString'], ['==', 'mode', 'static']],
                'layout': {
                  'line-cap': 'round',
                  'line-join': 'round'
                },
                'paint': {
                  'line-color': '#3b82f6',
                  'line-width': 3
                }
              },
              {
                'id': 'gl-draw-polygon-fill-static',
                'type': 'fill',
                'filter': ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'static']],
                'paint': {
                  'fill-color': '#3b82f6',
                  'fill-outline-color': '#3b82f6',
                  'fill-opacity': 0.1
                }
              },
              {
                'id': 'gl-draw-polygon-stroke-static',
                'type': 'line',
                'filter': ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'static']],
                'layout': {
                  'line-cap': 'round',
                  'line-join': 'round'
                },
                'paint': {
                  'line-color': '#3b82f6',
                  'line-width': 3
                }
              },
              // Vertex styling - Enhanced for better visibility
              {
                'id': 'gl-draw-polygon-and-line-vertex-inactive',
                'type': 'circle',
                'filter': ['all', ['==', 'meta', 'vertex'], ['!=', 'active', 'true']],
                'paint': {
                  'circle-radius': 8,
                  'circle-color': '#ffffff',
                  'circle-stroke-color': '#3b82f6',
                  'circle-stroke-width': 3
                }
              },
              // Active vertices (during editing)
              {
                'id': 'gl-draw-polygon-and-line-vertex-active',
                'type': 'circle',
                'filter': ['all', ['==', 'meta', 'vertex'], ['==', 'active', 'true']],
                'paint': {
                  'circle-radius': 9,
                  'circle-color': '#ffffff',
                  'circle-stroke-color': '#ff3333',
                  'circle-stroke-width': 3
                }
              },
              // Midpoints for adding new vertices
              {
                'id': 'gl-draw-polygon-midpoint',
                'type': 'circle',
                'filter': ['all', ['==', 'meta', 'midpoint']],
                'paint': {
                  'circle-radius': 4,
                  'circle-color': '#fbb03b',
                  'circle-stroke-color': '#fff',
                  'circle-stroke-width': 1
                }
              }
            ]
          });
        } catch (err) {
          console.error("Error creating MapboxDraw instance:", err);
          setError("Failed to initialize drawing tool: " + err.message);
          return;
        }
      }

      drawRef.current = window.measurementTools.drawInstance;
      
      // Setup map polling
      const setupMapPolling = () => {
        let attempts = 0;
        const maxAttempts = 20;
        const pollInterval = 300;

        const pollForMapReady = () => {
          if (attempts >= maxAttempts) {
            setError("Map not ready after multiple attempts. Please try again.");
            return;
          }
          
          attempts++;
          
          if (map?.current && map.current.loaded()) {
            console.log("Map is ready, initializing draw tool");
            try {
              initDrawTool();
              setIsToolReady(true);
              setError(null);
            } catch (err) {
              console.error("Error in initDrawTool:", err);
              setError("Failed to initialize tool: " + err.message);
            }
          } else {
            console.log(`Map not ready yet, attempt ${attempts}/${maxAttempts}`);
            initTimerRef.current = setTimeout(pollForMapReady, pollInterval);
          }
        };

        pollForMapReady();
      };
      
      // Initialize drawing tool
      function initDrawTool() {
        if (!map?.current) {
          throw new Error("Map reference is not available");
        }
        
        // Clean up any existing controls before adding
        try {
          if (map.current.hasControl && map.current.hasControl(drawRef.current)) {
            map.current.removeControl(drawRef.current);
          }
        } catch (err) {
          console.error("Error cleaning up draw control:", err);
        }
        
        // Add draw control to the map
        map.current.addControl(drawRef.current, 'top-left');
        
        // Load any saved features
        try {
          const savedFeatures = localStorage.getItem('mapDrawFeatures');
          if (savedFeatures) {
            const featuresData = JSON.parse(savedFeatures);
            drawRef.current.set(featuresData);
            window.measurementTools.lastFeatures = featuresData;
            updateMeasurements();
          }
        } catch (err) {
          console.error("Error loading saved features:", err);
        }
        
        // Set up regular event handlers for this component instance
        const drawCreate = () => {
          try {
            updateMeasurements();
            saveFeaturesToStorage();
          } catch (err) {
            console.error("Error in drawCreate handler:", err);
          }
        };
        
        const drawUpdate = () => {
          try {
            updateMeasurements();
            saveFeaturesToStorage();
          } catch (err) {
            console.error("Error in drawUpdate handler:", err);
          }
        };
        
        const drawDelete = () => {
          try {
            updateMeasurements();
            saveFeaturesToStorage();
          } catch (err) {
            console.error("Error in drawDelete handler:", err);
          }
        };
        
        const drawModeChange = (e) => {
          try {
            setIsDrawing(e.mode && e.mode.includes('draw'));
          } catch (err) {
            console.error("Error in drawModeChange handler:", err);
          }
        };
        
        const drawSelectionChange = () => {
          try {
            updateMeasurements();
          } catch (err) {
            console.error("Error in drawSelectionChange handler:", err);
          }
        };
        
        // Remove any existing event listeners
        try {
          map.current.off('draw.create');
          map.current.off('draw.update');
          map.current.off('draw.delete');
          map.current.off('draw.modechange');
          map.current.off('draw.selectionchange');
        } catch (err) {
          console.error("Error removing event listeners:", err);
        }
        
        // Add event listeners
        try {
          map.current.on('draw.create', drawCreate);
          map.current.on('draw.update', drawUpdate);
          map.current.on('draw.delete', drawDelete);
          map.current.on('draw.modechange', drawModeChange);
          map.current.on('draw.selectionchange', drawSelectionChange);
        } catch (err) {
          console.error("Error adding event listeners:", err);
        }
        
        // Set up persistent handlers that will survive component unmount
        attachPersistentEventHandlers();
      }
      
      setupMapPolling();
      
      // Cleanup function
      return () => {
        console.log("MeasurementTool unmounting, cleaning up");
        
        try {
          if (initTimerRef.current) {
            clearTimeout(initTimerRef.current);
            initTimerRef.current = null;
          }
          
          // Remove temporary popup (but keep the persistent one)
          if (popupRef.current) {
            popupRef.current.remove();
            popupRef.current = null;
          }
          
          // Clean up regular component event listeners
          if (map?.current) {
            map.current.off('draw.create');
            map.current.off('draw.update');
            map.current.off('draw.delete');
            map.current.off('draw.modechange');
            map.current.off('draw.selectionchange');
            
            // Save any unsaved changes before unmounting
            if (drawRef.current) {
              saveFeaturesToStorage();
            }
            
            // Do NOT remove the persistent draw control or event handlers
            // They need to stay active when the component is unmounted
          }
        } catch (err) {
          console.error("Error in cleanup function:", err);
        }
      };
    } catch (err) {
      console.error("Fatal error in MeasurementTool:", err);
      setError("An unexpected error occurred: " + err.message);
      return () => {};
    }
  }, [map, saveMeasurementsToStorage, saveFeaturesToStorage, updateMeasurements, showMeasurementPopup, attachPersistentEventHandlers]);

  const activateDrawingMode = (mode) => {
    if (!drawRef.current) {
      setError("Drawing tool not initialized");
      return;
    }
    
    try {
      console.log(`Activating drawing mode: ${mode}`);
      drawRef.current.changeMode(mode);
      setActiveTool(mode);
      setIsDrawing(true);
      setError(null);
    } catch (err) {
      console.error(`Error activating drawing mode ${mode}:`, err);
      setError(`Failed to activate measurement tool: ${err.message}`);
    }
  };

  const deleteAll = () => {
    if (!drawRef.current) {
      setError("Drawing tool not initialized");
      return;
    }
    
    try {
      drawRef.current.deleteAll();
      setMeasurements([]);
      saveMeasurementsToStorage([]);
      saveFeaturesToStorage();
      setIsDrawing(false);
      setError(null);
    } catch (err) {
      console.error("Error deleting drawings:", err);
      setError("Failed to clear measurements: " + err.message);
    }
  };

  const deleteMeasurement = (id) => {
    if (!drawRef.current) return;
    
    try {
      drawRef.current.delete(id);
      setMeasurements(prevMeasurements => {
        const updated = prevMeasurements.filter(m => m.id !== id);
        saveMeasurementsToStorage(updated);
        return updated;
      });
      saveFeaturesToStorage();
    } catch (err) {
      console.error("Error deleting measurement:", err);
    }
  };

  // Render with error boundary
  try {
    return (
      <div className="measurement-tool">
        <h3>Measurement Tools</h3>
        
        {error && (
          <div className="error-message">
            {error} <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}
        
        <div className="tool-buttons">
          <button 
            className={`tool-btn ${activeTool === 'draw_line_string' ? 'active' : ''}`}
            onClick={() => activateDrawingMode('draw_line_string')}
            disabled={!isToolReady}
          >
            📏 Measure Distance
          </button>
          
          <button 
            className={`tool-btn ${activeTool === 'draw_polygon' ? 'active' : ''}`}
            onClick={() => activateDrawingMode('draw_polygon')}
            disabled={!isToolReady}
          >
            📐 Measure Area
          </button>
          
          <button 
            className="tool-btn clear-btn" 
            onClick={deleteAll}
            disabled={!isToolReady || measurements.length === 0}
          >
            🗑️ Clear All
          </button>
        </div>
        
        {!isToolReady && !error && (
          <div className="initializing-message">
            <p>Initializing measurement tools...</p>
          </div>
        )}
        
        {isDrawing && (
          <div className="drawing-instructions">
            <p>
              {activeTool === 'draw_line_string' 
                ? '📏 Click on the map to start measuring distance. Click multiple points to create a path. Double-click to finish.' 
                : '📐 Click on the map to start measuring area. Click multiple points to create a polygon. Click back on the first point to close the shape.'}
            </p>
          </div>
        )}
        
        <div className="measurement-results">
          {measurements.length === 0 && !isDrawing && !error && isToolReady && (
            <p className="no-data">Click a tool button above to start measuring</p>
          )}
          
          {measurements.length > 0 && (
            <div className="measurement-history">
              <h4>Measurements</h4>
              <ul className="measurement-list">
                {measurements.map((m, index) => (
                  <li key={m.id} className="measurement-item">
                    <div className="measurement-header">
                      <span className="measurement-number">#{index + 1}</span>
                      <span className="measurement-type">{m.type === 'LineString' ? 'Distance' : 'Area'}</span>
                      <button 
                        className="delete-measurement" 
                        onClick={() => deleteMeasurement(m.id)}
                        title="Remove this measurement"
                      >
                        ×
                      </button>
                    </div>
                    <div className="measurement-details">
                      {m.distance && (
                        <div className="result">
                          <span>Distance:</span>
                          <strong>
                            {m.distance < 1 
                              ? `${(m.distance * 1000).toFixed(2)} m` 
                              : `${m.distance.toFixed(2)} km`}
                          </strong>
                        </div>
                      )}
                      
                      {m.area && (
                        <div className="result">
                          <span>Area:</span>
                          <strong>
                            {m.area < 1 
                              ? `${(m.area * 1000000).toFixed(2)} m²` 
                              : `${m.area.toFixed(4)} km²`}
                          </strong>
                        </div>
                      )}
                      
                      {m.perimeter && (
                        <div className="result">
                          <span>Perimeter:</span>
                          <strong>
                            {m.perimeter < 1 
                              ? `${(m.perimeter * 1000).toFixed(2)} m` 
                              : `${m.perimeter.toFixed(2)} km`}
                          </strong>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="instructions">
          <p>Tips:</p>
          <ul>
            <li>Double-click on any measurement to edit it</li> 
            <li>Hover over measurements to see details</li>
            <li>Drag vertices to adjust measurements</li>
          </ul>
        </div>
      </div>
    );
  } catch (err) {
    console.error("Error rendering MeasurementTool component:", err);
    return (
      <div className="measurement-tool error-state">
        <h3>Measurement Tool Error</h3>
        <p>Sorry, an error occurred while rendering the measurement tool.</p>
        <p>Error details: {err.message}</p>
      </div>
    );
  }
}

export default MeasurementTool;