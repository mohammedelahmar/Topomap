import React, { useEffect } from 'react';
import { useDrawTools } from '../../../hooks/useMapbox';

function MapFeatureManager({ map, activeFeature }) {
  // Use our custom hook for drawing tools
  const { drawRef, drawnFeatures, updateDrawnFeatures: updateFeatures } = useDrawTools(map, activeFeature);

  // Set up event listeners for the active tool
  useEffect(() => {
    if (!map?.current || !drawRef?.current || !['poi', 'route', 'measure'].includes(activeFeature)) return;
    
    // Store reference to the current map instance
    const mapInstance = map.current;
    
    const updateDrawnFeatures = () => {
      if (!drawRef.current) return;
      
      const currentFeatures = drawRef.current.getAll().features;
      
      if (activeFeature === 'poi') {
        // Update drawn points
        updateFeatures({
          ...drawnFeatures,
          points: currentFeatures.filter(f => f.geometry.type === 'Point')
        });
      } else if (activeFeature === 'route') {
        // Update drawn routes
        updateFeatures({
          ...drawnFeatures,
          routes: currentFeatures.filter(f => ['LineString', 'Polygon'].includes(f.geometry.type))
        });
      } else if (activeFeature === 'measure') {
        // Update measurements
        updateFeatures({
          ...drawnFeatures,
          measurements: currentFeatures
        });
      }
    };

    mapInstance.on('draw.create', updateDrawnFeatures);
    mapInstance.on('draw.update', updateDrawnFeatures);
    mapInstance.on('draw.delete', updateDrawnFeatures);
    
    return () => {
      // Use the captured map instance in the cleanup
      mapInstance.off('draw.create', updateDrawnFeatures);
      mapInstance.off('draw.update', updateDrawnFeatures);
      mapInstance.off('draw.delete', updateDrawnFeatures);
    };
  }, [map, drawRef, activeFeature, drawnFeatures, updateFeatures]);

  // No UI rendering needed, this component manages drawing tools
  return null;
}

export default MapFeatureManager;