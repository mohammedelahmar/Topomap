import React, { useState, useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import '../../../styles/CustomMarkerTool.css';

function CustomMarkerTool({ map }) {
  const [markers, setMarkers] = useState([]);
  const [isAddingMarker, setIsAddingMarker] = useState(false);
  const [activeMarker, setActiveMarker] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    icon: 'pin', // default icon
    color: '#3887BE'
  });
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const markerRefs = useRef({});
  const clusterSourceAdded = useRef(false);
  const [mapInitialized, setMapInitialized] = useState(false);

  // Define callback functions first, before they're used in useEffect dependencies
  const addMarkerToMap = useCallback((marker) => {
    if (!map?.current) return;

    try {
      // Create marker element
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.color = marker.color;
      el.innerHTML = getMarkerIcon(marker.icon);
      
      // Create marker
      const mapboxMarker = new mapboxgl.Marker({
        element: el,
        draggable: false,
        anchor: 'bottom'
      })
      .setLngLat([marker.lng, marker.lat])
      .addTo(map.current);

      // Store ref for later removal
      markerRefs.current[marker.id] = mapboxMarker;

      // Add click handler
      el.addEventListener('click', () => {
        showMarkerPopup(marker);
      });
      
      console.log(`Added marker ${marker.id} to map`);
    } catch (err) {
      console.error("Error adding marker to map:", err);
    }
  }, [map]);

  // Define deleteMarker before it's used in showMarkerPopup
  const deleteMarker = useCallback((id) => {
    // Remove the marker from state
    setMarkers(current => current.filter(m => m.id !== id));
    
    // Remove the marker from the map
    if (markerRefs.current[id]) {
      markerRefs.current[id].remove();
      delete markerRefs.current[id];
    }
  }, []);

  const showMarkerPopup = useCallback((marker) => {
    if (!map?.current) return;
    
    try {
      // Validate marker data
      if (!marker || !marker.lng || !marker.lat) {
        console.error("Invalid marker data:", marker);
        return;
      }
      
      console.log("Clicked marker:", marker);
      console.log("Setting popup at coordinates:", marker.lng, marker.lat);
      
      const popupContent = document.createElement('div');
      popupContent.className = 'marker-popup';
      popupContent.innerHTML = `
        <h4>${marker.title || 'Unnamed Marker'}</h4>
        <p>${marker.description || 'No description'}</p>
        ${(marker.image && !marker.image.startsWith('data:image') || marker.image.length < 1000000) 
          ? `<img src="${marker.image}" alt="${marker.title || 'Marker'}" />` 
          : '<p>Image too large to display</p>'}
        <div class="popup-actions">
          <button class="edit-marker" data-id="${marker.id}">Edit</button>
          <button class="delete-marker" data-id="${marker.id}">Delete</button>
        </div>
      `;
      
      const popup = new mapboxgl.Popup({ closeOnClick: false })
        .setLngLat([marker.lng, marker.lat])
        .setDOMContent(popupContent)
        .addTo(map.current);
      
      // Add event listeners to popup buttons safely
      popupContent.querySelector('.edit-marker')?.addEventListener('click', () => {
        popup.remove();
        setActiveMarker(marker);
        setFormData({
          title: marker.title || '',
          description: marker.description || '',
          icon: marker.icon || 'pin',
          color: marker.color || '#3887BE',
          image: marker.image || null
        });
      });
      
      popupContent.querySelector('.delete-marker')?.addEventListener('click', () => {
        popup.remove();
        deleteMarker(marker.id);
      });
    } catch (err) {
      console.error("Error showing marker popup:", err, marker);
    }
  }, [map, deleteMarker, setActiveMarker]);

  // Define setupClustering BEFORE it's used in useEffect
  const setupClustering = useCallback(() => {
    if (!map?.current || clusterSourceAdded.current) return;
    
    try {
      console.log("Setting up marker clustering");
      
      // Add a source for clustered markers
      map.current.addSource('markers-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: markers.map(marker => ({
            type: 'Feature',
            properties: {
              id: marker.id,
              title: marker.title,
              description: marker.description,
              icon: marker.icon,
              color: marker.color,
              image: marker.image
            },
            geometry: {
              type: 'Point',
              coordinates: [marker.lng, marker.lat]
            }
          }))
        },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      });

      // Add clusters layer
      map.current.addLayer({
        id: 'marker-clusters',
        type: 'circle',
        source: 'markers-source',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#51bbd6',
            20, '#f1f075',
            100, '#f28cb1'
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20, // base radius
            20, 30, // 20+ points = 30px radius
            100, 40 // 100+ points = 40px radius
          ]
        }
      });

      // Add cluster count labels
      map.current.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'markers-source',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12
        }
      });

      // Add unclustered marker symbols
      map.current.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'markers-source',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': 10,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff'
        }
      });

      // Handle clicks on clusters
      map.current.on('click', 'marker-clusters', e => {
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ['marker-clusters']
        });
        
        const clusterId = features[0].properties.cluster_id;
        map.current.getSource('markers-source').getClusterExpansionZoom(
          clusterId,
          (err, zoom) => {
            if (err) return;
            
            map.current.easeTo({
              center: features[0].geometry.coordinates,
              zoom: zoom
            });
          }
        );
      });

      // Handle clicks on individual markers
      map.current.on('click', 'unclustered-point', e => {
        const markerId = e.features[0].properties.id;
        const marker = markers.find(m => m.id === markerId);
        if (marker) {
          showMarkerPopup(marker);
        }
      });

      // Change cursor when hovering over clusters or points
      map.current.on('mouseenter', 'marker-clusters', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });
      
      map.current.on('mouseleave', 'marker-clusters', () => {
        map.current.getCanvas().style.cursor = '';
      });
      
      map.current.on('mouseenter', 'unclustered-point', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });
      
      map.current.on('mouseleave', 'unclustered-point', () => {
        map.current.getCanvas().style.cursor = '';
      });

      clusterSourceAdded.current = true;
    } catch (err) {
      console.error("Error setting up clustering:", err);
      // Fall back to regular markers
      markers.forEach(marker => addMarkerToMap(marker));
    }
  }, [map, markers, addMarkerToMap]);

  // Now your useEffect can safely use these callbacks
  useEffect(() => {
    if (!map?.current || !mapInitialized || markers.length === 0) return;
    
    console.log("Adding markers to map, count:", markers.length);

    // Clean up existing markers
    Object.values(markerRefs.current).forEach(marker => {
      if (marker) marker.remove();
    });
    markerRefs.current = {};
    
    setTimeout(() => {
      try {
        if (markers.length > 10) {
          setupClustering();
        } else {
          markers.forEach(marker => addMarkerToMap(marker));
        }
      } catch (err) {
        console.error("Error adding markers to map:", err);
      }
    }, 300);
  }, [map, markers, mapInitialized, setupClustering, addMarkerToMap]);

  // Check if map is initialized and ready, THEN load markers
  useEffect(() => {
    if (!map?.current) return;

    const checkMapReady = () => {
      if (map.current.loaded()) {
        console.log("Map is ready, initializing markers");
        setMapInitialized(true);
        
        // Load markers from localStorage once the map is ready
        try {
          const savedMarkers = localStorage.getItem('mapMarkers');
          if (savedMarkers) {
            const parsedMarkers = JSON.parse(savedMarkers);
            setMarkers(parsedMarkers);
            console.log(`Loaded ${parsedMarkers.length} markers from localStorage`);
          }
        } catch (err) {
          console.error("Error loading saved markers:", err);
        }
        
        return;
      }
      
      // Keep polling until map is ready
      setTimeout(checkMapReady, 200);
    };

    checkMapReady();

    // Listen for style change events which might affect markers
    const styleChangeHandler = () => {
      // Re-add markers after style changes
      setTimeout(() => {
        // Clean up existing markers
        Object.values(markerRefs.current).forEach(marker => {
          if (marker) marker.remove();
        });
        markerRefs.current = {};
        clusterSourceAdded.current = false;
        
        // Re-add markers when style is loaded
        if (markers.length > 10) {
          setupClustering();
        } else {
          markers.forEach(marker => addMarkerToMap(marker));
        }
      }, 500); // Wait for style to load
    };

    map.current.on('style.load', styleChangeHandler);

    return () => {
      if (map.current) {
        map.current.off('style.load', styleChangeHandler);
      }
    };
  }, [map, setupClustering, addMarkerToMap]);

  // Save markers to localStorage when updated
  useEffect(() => {
    try {
      localStorage.setItem('mapMarkers', JSON.stringify(markers));
    } catch (err) {
      console.error("Error saving markers:", err);
    }
  }, [markers]);

  const enableMarkerPlacement = () => {
    if (!map?.current) return;
    
    setIsAddingMarker(true);
    setError(null);
    setFormData({
      title: '',
      description: '',
      icon: 'pin',
      color: '#3887BE'
    });
    setActiveMarker(null);
    
    // Change cursor to indicate marker placement mode
    map.current.getCanvas().style.cursor = 'crosshair';
    
    // Add one-time click handler to place marker
    const clickHandler = e => {
      setIsAddingMarker(false);
      map.current.getCanvas().style.cursor = '';
      
      // Create a new marker
      const newMarker = {
        id: Date.now().toString(),
        lng: e.lngLat.lng,
        lat: e.lngLat.lat,
        title: 'New Marker', // Default title
        description: '',
        icon: 'pin',
        color: '#3887BE',
        createdAt: new Date().toISOString()
      };
      
      // Show form to edit the new marker
      setActiveMarker(newMarker);
      
      // Remove click handler
      map.current.off('click', clickHandler);
    };
    
    map.current.on('click', clickHandler);
  };
  
  const saveMarker = () => {
    if (!activeMarker) return;
    
    try {
      if (!formData.title.trim()) {
        setError('Title is required');
        return;
      }
      
      // Update existing marker or add new one
      const updatedMarker = {
        ...activeMarker,
        title: formData.title,
        description: formData.description,
        icon: formData.icon,
        color: formData.color,
        image: formData.image,
        updatedAt: new Date().toISOString()
      };
      
      setMarkers(current => {
        const existing = current.findIndex(m => m.id === activeMarker.id);
        if (existing >= 0) {
          // Update existing marker
          const updated = [...current];
          updated[existing] = updatedMarker;
          return updated;
        } else {
          // Add new marker
          return [...current, updatedMarker];
        }
      });
      
      // Clean up form
      setActiveMarker(null);
      setError(null);
      
    } catch (err) {
      setError(`Error saving marker: ${err.message}`);
    }
  };
  
  const updateClusterSource = () => {
    if (!map.current?.getSource('markers-source')) return;
    
    map.current.getSource('markers-source').setData({
      type: 'FeatureCollection',
      features: markers.map(marker => ({
        type: 'Feature',
        properties: {
          id: marker.id,
          title: marker.title,
          description: marker.description,
          icon: marker.icon,
          color: marker.color,
          image: marker.image
        },
        geometry: {
          type: 'Point',
          coordinates: [marker.lng, marker.lat]
        }
      }))
    });
  };
  
  // Helper to get SVG icon for marker based on type
  const getMarkerIcon = (iconType) => {
    switch(iconType) {
      case 'star':
        return '<svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>';
      case 'flag':
        return '<svg viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"></path></svg>';
      case 'info':
        return '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"></path></svg>';
      case 'warning':
        return '<svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"></path></svg>';
      default: // pin
        return '<svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"></path></svg>';
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // For this demo, we'll simply convert to base64
    // In production, you'd upload to a server
    setIsUploading(true);
    
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          image: reader.result
        }));
        setIsUploading(false);
      };
      reader.onerror = () => {
        setError("Failed to read image file");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(`Error uploading image: ${err.message}`);
      setIsUploading(false);
    }
  };

  return (
    <div className="custom-marker-tool">
      <h3>Custom Markers</h3>
      
      {error && (
        <div className="error-message">
          {error} <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      
      <div className="marker-actions">
        <button 
          className={`action-btn ${isAddingMarker ? 'active' : ''}`}
          onClick={enableMarkerPlacement}
          disabled={isAddingMarker || !mapInitialized}
        >
          📍 Add Marker
        </button>
      </div>
      
      {activeMarker && (
        <div className="marker-form">
          <h4>{activeMarker.id ? 'Edit' : 'New'} Marker</h4>
          
          <div className="form-group">
            <label htmlFor="marker-title">Title:</label>
            <input 
              type="text" 
              id="marker-title" 
              value={formData.title} 
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Enter marker title"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="marker-desc">Description:</label>
            <textarea 
              id="marker-desc" 
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Enter marker description"
              rows="3"
            />
          </div>
          
          <div className="form-group">
            <label>Icon:</label>
            <div className="icon-options">
              {['pin', 'star', 'flag', 'info', 'warning'].map(icon => (
                <div 
                  key={icon}
                  className={`icon-option ${formData.icon === icon ? 'selected' : ''}`}
                  onClick={() => setFormData({...formData, icon})}
                  dangerouslySetInnerHTML={{ __html: getMarkerIcon(icon) }}
                />
              ))}
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="marker-color">Color:</label>
            <input 
              type="color" 
              id="marker-color" 
              value={formData.color} 
              onChange={(e) => setFormData({...formData, color: e.target.value})}
            />
          </div>
          
          <div className="form-group">
            <label>Image:</label>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
            {formData.image && (
              <div className="image-preview">
                <img src={formData.image} alt="Preview" />
                <button 
                  className="remove-image" 
                  onClick={() => setFormData({...formData, image: null})}
                >
                  ✖
                </button>
              </div>
            )}
            {isUploading && <p>Uploading...</p>}
          </div>
          
          <div className="form-buttons">
            <button 
              className="cancel-btn" 
              onClick={() => {
                setActiveMarker(null);
                setError(null);
              }}
            >
              Cancel
            </button>
            <button 
              className="save-btn"
              onClick={saveMarker}
            >
              Save
            </button>
          </div>
        </div>
      )}
      
      {!activeMarker && (
        <div className="markers-list">
          <h4>My Markers ({markers.length})</h4>
          {markers.length === 0 ? (
            <p className="no-data">No markers added yet. Click "Add Marker" to create one.</p>
          ) : (
            <ul>
              {markers.map(marker => (
                <li key={marker.id} className="marker-item">
                  <div className="marker-icon" style={{ color: marker.color }}>
                    <div dangerouslySetInnerHTML={{ __html: getMarkerIcon(marker.icon) }} />
                  </div>
                  <div className="marker-info">
                    <div className="marker-title">{marker.title}</div>
                    <div className="marker-coordinates">
                      {marker.lng.toFixed(5)}, {marker.lat.toFixed(5)}
                    </div>
                  </div>
                  <div className="marker-actions">
                    <button 
                      className="edit-btn" 
                      onClick={() => {
                        setActiveMarker(marker);
                        setFormData({
                          title: marker.title,
                          description: marker.description || '',
                          icon: marker.icon || 'pin',
                          color: marker.color || '#3887BE',
                          image: marker.image || null
                        });
                      }}
                    >
                      ✏️
                    </button>
                    <button 
                      className="delete-btn" 
                      onClick={() => deleteMarker(marker.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      
      <div className="marker-instructions">
        <p>Tips:</p>
        <ul>
          <li>Click "Add Marker" and then click on the map</li>
          <li>Customize the marker's appearance and data</li>
          <li>Click on markers on the map to view details</li>
        </ul>
      </div>
    </div>
  );
}

export default CustomMarkerTool;