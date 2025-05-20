import { useRef, useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

// Access the token using the proper environment variable format
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

export function useMapbox({ container, initialStyle, initialCenter = [-70.9, 42.35], initialZoom = 9, onError }) {
  const map = useRef(null);
  const [lng, setLng] = useState(initialCenter[0]);
  const [lat, setLat] = useState(initialCenter[1]);
  const [zoom, setZoom] = useState(initialZoom);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (map.current) return;
    
    if (!mapboxgl.accessToken) {
      if (onError) onError(new Error("MapBox access token is missing"));
      console.error("Mapbox access token is missing");
      return;
    }
    
    try {
      if (!container.current) {
        throw new Error("Map container element not found");
      }
      
      map.current = new mapboxgl.Map({
        container: container.current,
        style: initialStyle,
        center: initialCenter,
        zoom: initialZoom,
        pitch: 45,
      });

      // Add navigation control
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      
      // Set up events
      map.current.on('load', () => {
        console.log('Map loaded successfully');
        setIsLoaded(true);
      });

      map.current.on('error', (error) => {
        console.error('Map error:', error);
        if (onError) onError(error);
      });

      // Update state when map moves
      map.current.on('move', () => {
        setLng(map.current.getCenter().lng.toFixed(4));
        setLat(map.current.getCenter().lat.toFixed(4));
        setZoom(map.current.getZoom().toFixed(2));
      });
    } catch (error) {
      console.error("Error initializing map:", error);
      if (onError) onError(error);
    }
    
    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [container, initialStyle, initialCenter, initialZoom, onError]);

  return { map, lng, lat, zoom, isLoaded };
}

export function useDrawTools(map, activeFeature) {
  const drawRef = useRef(null);
  const [drawnFeatures, setDrawnFeatures] = useState({
    points: [],
    routes: [],
    measurements: []
  });

  // Initialize and manage drawing tools
  useEffect(() => {
    if (!map?.current || !map.current.isStyleLoaded()) return;

    // Clean up function to properly remove controls before switching
    const cleanupCurrentTool = () => {
      if (drawRef.current && map.current.hasControl(drawRef.current)) {
        try {
          // Save current features before removing
          const currentFeatures = drawRef.current.getAll().features;
          
          if (activeFeature === 'poi') {
            setDrawnFeatures(prev => ({...prev, points: currentFeatures}));
          } else if (activeFeature === 'route') {
            setDrawnFeatures(prev => ({...prev, routes: currentFeatures}));
          } else if (activeFeature === 'measure') {
            setDrawnFeatures(prev => ({...prev, measurements: currentFeatures}));
          }
          
          map.current.removeControl(drawRef.current);
        } catch (err) {
          console.error("Error cleaning up draw control:", err);
        }
        drawRef.current = null;
      }
    };

    // First clean up any existing tools
    cleanupCurrentTool();

    // Add appropriate tools based on new active feature
    try {
      switch (activeFeature) {
        case 'poi':
          drawRef.current = new MapboxDraw({
            displayControlsDefault: false,
            controls: { point: true, trash: true }
          });
          map.current.addControl(drawRef.current, 'bottom-left');
          
          // Restore previously drawn points
          if (drawnFeatures.points.length > 0) {
            drawRef.current.add({
              type: 'FeatureCollection',
              features: drawnFeatures.points
            });
          }
          break;
          
        case 'route':
          drawRef.current = new MapboxDraw({
            displayControlsDefault: false,
            controls: { line_string: true, trash: true }
          });
          map.current.addControl(drawRef.current, 'bottom-left');
          
          // Restore previously drawn routes
          if (drawnFeatures.routes.length > 0) {
            drawRef.current.add({
              type: 'FeatureCollection',
              features: drawnFeatures.routes
            });
          }
          break;
      }
    } catch (err) {
      console.error("Error setting up new tool:", err);
    }
    
    // Return cleanup function
    return cleanupCurrentTool;
  }, [map, activeFeature, drawnFeatures]);

  return { drawRef, drawnFeatures, setDrawnFeatures };
}