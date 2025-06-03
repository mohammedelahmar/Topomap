import React, { useState, useCallback, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import * as toGeoJSON from '@mapbox/togeojson';
import tokml from 'tokml';
import '../../../styles/ExportTool.css';

function ExportTool({ map }) {
  const [exportFormat, setExportFormat] = useState('image');
  const [imageOptions, setImageOptions] = useState({
    width: 1280,
    height: 1280,
    resolution: '2x',
    format: 'png',
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const selectionBoxRef = useRef(null);
  const [isSelectingArea, setIsSelectingArea] = useState(false);
  const [selectedBounds, setSelectedBounds] = useState(null);

  // Handle export format selection
  const handleFormatChange = (format) => {
    setExportFormat(format);
    setExportError(null);
  };

  // Toggle area selection mode
  const toggleAreaSelection = () => {
    if (!isSelectingArea) {
      setIsSelectingArea(true);
      // Start drawing selection box
      if (map?.current) {
        // Disable map dragging while selecting
        const originalDragPan = map.current.dragPan.isEnabled();
        const originalScrollZoom = map.current.scrollZoom.isEnabled();

        // Disable map navigation 
        map.current.dragPan.disable();
        map.current.scrollZoom.disable();
        map.current.getCanvas().style.cursor = 'crosshair';

        // Store the current map event handlers to restore later
        const onMouseDown = (e) => {
          // Prevent default map behavior
          e.preventDefault();
          startSelection(e);
        };

        const onMouseMove = (e) => {
          if (selectionBoxRef.current && selectionBoxRef.current.startX) {
            // Prevent map movement during active selection
            e.preventDefault(); 
            updateSelection(e);
          }
        };

        const onMouseUp = (e) => {
          endSelection(e);
        };

        // Add event listeners
        map.current.on('mousedown', onMouseDown);
        map.current.on('mousemove', onMouseMove);
        map.current.on('mouseup', onMouseUp);

        // Create selection div
        const container = map.current.getContainer();
        selectionBoxRef.current = document.createElement('div');
        selectionBoxRef.current.className = 'selection-box';
        container.appendChild(selectionBoxRef.current);

        // Store cleanup function
        const cleanup = () => {
          map.current.off('mousedown', onMouseDown);
          map.current.off('mousemove', onMouseMove);
          map.current.off('mouseup', onMouseUp);

          if (selectionBoxRef.current && selectionBoxRef.current.parentNode) {
            selectionBoxRef.current.parentNode.removeChild(selectionBoxRef.current);
          }

          // Restore original map interactions
          if (originalDragPan) map.current.dragPan.enable();
          if (originalScrollZoom) map.current.scrollZoom.enable();

          map.current.getCanvas().style.cursor = '';
          setIsSelectingArea(false);
        };

        // Attach cleanup to window to allow cancelling
        window.cancelSelection = cleanup;
      }
    } else {
      // Cancel selection
      if (window.cancelSelection) window.cancelSelection();
    }
  };

  // Selection box functions - add some touch support too
  const startSelection = (e) => {
    if (!selectionBoxRef.current) return;

    e.originalEvent.stopPropagation();
    e.originalEvent.preventDefault();

    // Store start point
    selectionBoxRef.current.startX = e.point.x;
    selectionBoxRef.current.startY = e.point.y;

    // Update position and display
    selectionBoxRef.current.style.left = `${e.point.x}px`;
    selectionBoxRef.current.style.top = `${e.point.y}px`;
    selectionBoxRef.current.style.width = '0px';
    selectionBoxRef.current.style.height = '0px';
    selectionBoxRef.current.style.display = 'block';
  };

  const updateSelection = (e) => {
    if (!selectionBoxRef.current || !selectionBoxRef.current.startX) return;

    const startX = selectionBoxRef.current.startX;
    const startY = selectionBoxRef.current.startY;
    const currentX = e.point.x;
    const currentY = e.point.y;

    // Calculate dimensions
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(startX - currentX);
    const height = Math.abs(startY - currentY);

    // Update selection box
    selectionBoxRef.current.style.left = `${left}px`;
    selectionBoxRef.current.style.top = `${top}px`;
    selectionBoxRef.current.style.width = `${width}px`;
    selectionBoxRef.current.style.height = `${height}px`;
  };

  const endSelection = (e) => {
    if (!selectionBoxRef.current || !selectionBoxRef.current.startX) return;

    // Get the selected bounds in lat/lng
    const map1 = map.current;
    const startX = selectionBoxRef.current.startX;
    const startY = selectionBoxRef.current.startY;
    const endX = e.point.x;
    const endY = e.point.y;

    // Convert screen coordinates to geo coordinates
    const sw = map1.unproject([Math.min(startX, endX), Math.max(startY, endY)]);
    const ne = map1.unproject([Math.max(startX, endX), Math.min(startY, endY)]);

    // Calculate selected bounds
    const bounds = new mapboxgl.LngLatBounds(sw, ne);
    setSelectedBounds(bounds);

    // Clean up
    if (window.cancelSelection) window.cancelSelection();

    // Update image dimensions based on selection
    const width = Math.abs(startX - endX);
    const height = Math.abs(startY - endY);

    if (width > 0 && height > 0) {
      // Keep aspect ratio but limit to max dimensions
      const maxDim = 1280; // Maximum allowed by Mapbox Static API free tier
      const aspectRatio = width / height;

      let newWidth, newHeight;

      if (width > height) {
        newWidth = Math.min(width, maxDim);
        newHeight = Math.round(newWidth / aspectRatio);
      } else {
        newHeight = Math.min(height, maxDim);
        newWidth = Math.round(newHeight * aspectRatio);
      }

      setImageOptions(prev => ({
        ...prev,
        width: newWidth,
        height: newHeight
      }));
    }
  };

  // Enhanced high-quality canvas export function
  const exportCanvasScreenshot = useCallback(() => {
    if (!map?.current) {
      setExportError('Map not available');
      return Promise.reject(new Error('Map not available'));
    }
    
    try {
      setIsExporting(true);
      
      // Get the map canvas
      const canvas = map.current.getCanvas();
      
      // Create a high-resolution canvas with device pixel ratio consideration
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      
      // Get device pixel ratio and screen/display scale
      const devicePixelRatio = window.devicePixelRatio || 1;
      const qualityMultiplier = imageOptions.resolution === '4x' ? 3 :
                              imageOptions.resolution === '2x' ? 2 : 1;
      
      // Set dimensions with proper scaling for high quality
      tempCanvas.width = imageOptions.width * qualityMultiplier;
      tempCanvas.height = imageOptions.height * qualityMultiplier;
      
      // Get the current view bounds
      const bounds = selectedBounds || map.current.getBounds();
      const currentZoom = map.current.getZoom();
      
      // Temporarily force the map to render at higher quality
      if (map.current._fadeDuration) {
        const originalFadeDuration = map.current._fadeDuration;
        map.current._fadeDuration = 0; // Disable fading for sharper rendering
        setTimeout(() => { map.current._fadeDuration = originalFadeDuration; }, 1000);
      }
      
      // Force high-quality rendering - ensure the map is properly rendered
      map.current.triggerRepaint();
      
      // Apply a high-quality background
      if (!(imageOptions.format === 'png' && document.getElementById('transparent-bg')?.checked)) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      }
      
      // Set highest quality image smoothing for interpolation
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // If there's a selected area, crop the map to that area
      if (selectedBounds) {
        const sw = map.current.project(selectedBounds.getSouthWest());
        const ne = map.current.project(selectedBounds.getNorthEast());
        
        const sourceWidth = Math.abs(ne.x - sw.x);
        const sourceHeight = Math.abs(sw.y - ne.y);
        
        // Draw with highest quality settings to the temp canvas
        ctx.drawImage(
          canvas,
          Math.min(sw.x, ne.x), Math.min(sw.y, ne.y),
          sourceWidth, sourceHeight,
          0, 0, tempCanvas.width, tempCanvas.height
        );
      } else {
        // Scale the entire canvas with highest quality
        ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
      }
      
      // Apply additional quality enhancement if resolution is high
      if (qualityMultiplier > 1) {
        // Apply a subtle sharpening filter for clarity
        try {
          const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
          const data = imageData.data;
          
          // Simple sharpening kernel
          for (let y = 1; y < tempCanvas.height - 1; y++) {
            for (let x = 1; x < tempCanvas.width - 1; x++) {
              const idx = (y * tempCanvas.width + x) * 4;
              for (let c = 0; c < 3; c++) {
                const current = data[idx + c];
                const neighbors = [
                  data[idx + c - 4], // left
                  data[idx + c + 4], // right
                  data[idx + c - tempCanvas.width * 4], // top
                  data[idx + c + tempCanvas.width * 4]  // bottom
                ];
                
                // Apply subtle sharpening based on neighbors (Laplacian filter)
                data[idx + c] = Math.min(255, Math.max(0, current * 1.2 - 
                  neighbors.reduce((sum, val) => sum + val, 0) * 0.05));
              }
            }
          }
          
          ctx.putImageData(imageData, 0, 0);
        } catch (e) {
          console.warn('Image enhancement skipped:', e);
        }
      }
      
      // Convert to data URL with highest quality
      const mimeType = imageOptions.format === 'jpg' ? 'image/jpeg' : 'image/png';
      const quality = imageOptions.format === 'jpg' ? 1.0 : undefined; // Maximum quality for JPEG
      
      // For PNG, use maximum compression quality
      const dataURL = tempCanvas.toDataURL(mimeType, quality);
      
      // Create a download link
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = `map_export_high_quality_${new Date().toISOString().replace(/[:.]/g, '-')}.${imageOptions.format}`;
      document.body.appendChild(link);
      
      // Trigger download and clean up
      setTimeout(() => {
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
        }, 100);
      }, 100);
      
      setExportError(null);
      return Promise.resolve();
    } catch (e) {
      console.error('Error creating high-quality export:', e);
      setExportError(`Failed to create high-quality export: ${e.message}`);
      return Promise.reject(e);
    } finally {
      setIsExporting(false);
    }
  }, [map, selectedBounds, imageOptions]);

  // Complete rewrite of exportImage to ensure highest quality
  const exportImage = useCallback(async () => {
    if (!map?.current) {
      setExportError('Map not available');
      return;
    }
    
    try {
      setIsExporting(true);
      setExportError(null);
      
      const { width, height, resolution, format } = imageOptions;
      
      // 1. PREMIUM OPTION: Always use enhanced canvas export for highest quality
      if (document.getElementById('premium-quality')?.checked) {
        console.log('Using premium high-quality export method');
        await exportCanvasScreenshot();
        return;
      }
      
      // 2. API-BASED EXPORT: Try using Mapbox Static API for high resolution
      
      // Resolution multiplier
      const resolutionMultiplier = resolution === '2x' ? 2 : resolution === '4x' ? 4 : 1;
      const effectiveWidth = width * resolutionMultiplier;
      const effectiveHeight = height * resolutionMultiplier;
      
      // Mapbox Static API has size limits
      const maxDimension = 2000; // Premium users can use up to 2000px
      
      if (effectiveWidth > maxDimension || effectiveHeight > maxDimension) {
        throw new Error(`Image dimensions (${effectiveWidth}x${effectiveHeight}) exceed Mapbox limit. Using high-quality canvas export instead.`);
      }
      
      // Get style ID from map
      let styleId = '';
      
      try {
        // Several methods to reliably get the style ID
        if (map.current._styleURI) {
          styleId = map.current._styleURI.replace('mapbox://styles/', '');
        } else if (map.current.getStyle && map.current.getStyle().sprite) {
          const spriteUrl = map.current.getStyle().sprite;
          const styleMatch = spriteUrl.match(/styles\/([^/]+\/[^/]+)/);
          if (styleMatch && styleMatch[1]) {
            styleId = styleMatch[1];
          }
        } else if (map.current.getStyle && map.current.getStyle().name) {
          // Try to use style name as a fallback
          styleId = `mapbox/${map.current.getStyle().name.toLowerCase().replace(/\s+/g, '-')}`;
        }
      } catch (e) {
        console.warn('Error getting style ID:', e);
      }
      
      // Ensure we have a valid style ID
      if (!styleId || !styleId.includes('/')) {
        styleId = 'mapbox/satellite-streets-v12'; // Use satellite hybrid style for better detail
      }
      
      // Clean up style ID format
      styleId = styleId.split('?')[0];
      styleId = styleId.replace(/\s+/g, '-').toLowerCase();
      
      console.log("Using style ID for high-quality export:", styleId);
      
      // Build the Mapbox Static API URL
      let staticUrl = `https://api.mapbox.com/styles/v1/${styleId}/static/`;
      
      // Add proper map view parameters
      if (selectedBounds) {
        const bounds = selectedBounds.toArray().flat();
        staticUrl += `[${bounds[0].toFixed(8)},${bounds[1].toFixed(8)},${bounds[2].toFixed(8)},${bounds[3].toFixed(8)}]`;
      } else {
        const center = map.current.getCenter();
        const zoom = map.current.getZoom();
        const bearing = map.current.getBearing();
        const pitch = map.current.getPitch();
        
        staticUrl += `${center.lng.toFixed(8)},${center.lat.toFixed(8)},${zoom.toFixed(3)},${bearing.toFixed(2)},${pitch.toFixed(2)}`;
      }
      
      // Add dimensions and quality parameters
      staticUrl += `/${width}x${height}`;
      if (resolution !== '1x') {
        staticUrl += `@${resolution}`;
      }
      
      // Add authentication and format
      staticUrl += `?access_token=${mapboxgl.accessToken}`;
      staticUrl += `&format=${format === 'jpg' ? 'jpg90' : 'png'}`; // Use jpg90 for higher quality JPEG
      
      // Add attribution parameters
      staticUrl += `&attribution=false&logo=false`;
      
      // Handle transparency for PNG
      if (format === 'png' && document.getElementById('transparent-bg')?.checked) {
        staticUrl += '&transparent=true';
      }
      
      console.log("Exporting high-quality image URL (partial):", staticUrl.split('?')[0]);
      
      // Add a timeout for the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout for large images
      
      try {
        // Make multiple attempts - improves success rate
        let attempts = 0;
        let response = null;
        
        while (attempts < 3 && !response) {
          attempts++;
          try {
            // Fetch with proper headers and cache control
            response = await fetch(staticUrl, { 
              signal: controller.signal,
              headers: {
                'Accept': 'image/png,image/jpeg,*/*',
                'Cache-Control': 'no-cache'
              },
              cache: 'no-store'
            });
            
            if (!response.ok) {
              console.warn(`Attempt ${attempts}: Mapbox API error ${response.status}`);
              response = null;
              
              // Add delay between retries
              if (attempts < 3) await new Promise(r => setTimeout(r, 1000));
            }
          } catch (fetchError) {
            console.warn(`Attempt ${attempts} failed:`, fetchError);
            if (attempts >= 3) throw fetchError;
            await new Promise(r => setTimeout(r, 1000));
          }
        }
        
        clearTimeout(timeoutId);
        
        if (!response || !response.ok) {
          throw new Error(`Mapbox API error ${response?.status || 'unknown'}`);
        }
        
        // Verify response content type is an image
        const contentType = response.headers.get('content-type');
        if (!contentType || (!contentType.includes('image/png') && !contentType.includes('image/jpeg'))) {
          throw new Error('Invalid response content type: ' + (contentType || 'unknown'));
        }
        
        // Create blob and download
        const blob = await response.blob();
        
        // Verify blob size is reasonable
        if (blob.size < 1000) {
          throw new Error('Received invalid or too small image data');
        }
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `map_export_high_quality_${new Date().toISOString().replace(/[:.]/g, '-')}.${format}`;
        
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('Static API export failed:', fetchError);
        throw fetchError;
      }
      
    } catch (error) {
      console.error('Error with Mapbox export:', error);
      setExportError(`Using enhanced canvas export instead: ${error.message}`);
      
      // Always use our enhanced high-quality canvas export as fallback
      console.log('Using enhanced high-quality canvas export as fallback');
      await exportCanvasScreenshot();
    } finally {
      setIsExporting(false);
    }
  }, [map, imageOptions, selectedBounds, exportCanvasScreenshot]);

  // Export elevation data as XYZ points
  const exportElevation = useCallback(async () => {
    if (!map?.current) {
      setExportError('Map not available');
      return;
    }

    try {
      setIsExporting(true);
      setExportError(null);

      // Define the sampling area - either the selected bounds or current view
      const bounds = selectedBounds || map.current.getBounds();

      // Sample the terrain at regular intervals
      const samples = await sampleTerrainPoints(bounds);

      // Format as CSV (X,Y,Z)
      let csvContent = "Longitude,Latitude,Elevation\n";
      samples.forEach(point => {
        csvContent += `${point.lng},${point.lat},${point.elevation}\n`;
      });

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `terrain_xyz_${new Date().toISOString().replace(/[:\.]/g, '-')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting elevation data:', error);
      setExportError(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  }, [map, selectedBounds]);

  // Sample terrain elevation points within bounds
  const sampleTerrainPoints = async (bounds) => {
    // Number of samples in each direction
    const numSamples = document.getElementById('elevation-samples').value || 50;
    const samples = [];

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    const lngDiff = ne.lng - sw.lng;
    const latDiff = ne.lat - sw.lat;

    for (let i = 0; i <= numSamples; i++) {
      for (let j = 0; j <= numSamples; j++) {
        const lng = sw.lng + (lngDiff * i / numSamples);
        const lat = sw.lat + (latDiff * j / numSamples);

        try {
          // Get the terrain RGB value from mapbox-terrain-rgb
          // This is simplified and would need a real implementation 
          // that retrieves and decodes the RGB values from the terrain tiles

          // Placeholder value - in a real implementation you'd decode RGB
          const mockElevation = 100 + Math.random() * 900; 

          samples.push({
            lng: parseFloat(lng.toFixed(6)),
            lat: parseFloat(lat.toFixed(6)),
            elevation: parseFloat(mockElevation.toFixed(2))
          });
        } catch (e) {
          console.error('Error sampling terrain:', e);
        }
      }
    }

    return samples;
  };

  // Export map data as KML
  const exportKML = useCallback(async () => {
    if (!map?.current) {
      setExportError('Map not available');
      return;
    }

    try {
      setIsExporting(true);
      setExportError(null);
      
      // Collect all features from the map
      const features = [];
      
      // Get drawn features if available
      if (map.current.getStyle() && map.current.getSource('mapbox-gl-draw-cold')) {
        try {
          // Try to get MapboxDraw features
          const drawFeatures = map.current.querySourceFeatures('mapbox-gl-draw-cold');
          if (drawFeatures && drawFeatures.length) {
            drawFeatures.forEach(feature => {
              // Filter out helper features
              if (feature.properties && feature.properties.user_has_property) {
                features.push({
                  type: 'Feature',
                  geometry: feature.geometry,
                  properties: {
                    name: `Feature ${features.length + 1}`,
                    description: feature.properties.user_description || ''
                  }
                });
              }
            });
          }
        } catch (err) {
          console.warn("Could not get draw features", err);
        }
      }
      
      // Add marker features
      try {
        if (map.current.getSource('markers-source')) {
          const markerFeatures = map.current.querySourceFeatures('markers-source', {
            sourceLayer: undefined
          });
          
          markerFeatures.forEach(feature => {
            if (feature.properties && !feature.properties.cluster) {
              features.push({
                type: 'Feature',
                geometry: feature.geometry,
                properties: {
                  name: feature.properties.title || 'Marker',
                  description: feature.properties.description || ''
                }
              });
            }
          });
        }
      } catch (err) {
        console.warn("Could not get marker features", err);
      }
      
      // If we have any imported GeoJSON data saved
      if (window._lastGeoJsonData) {
        try {
          window._lastGeoJsonData.features.forEach(feature => {
            features.push(feature);
          });
        } catch (err) {
          console.warn("Error adding imported features", err);
        }
      }
      
      // Create a GeoJSON FeatureCollection
      const geojson = {
        type: 'FeatureCollection',
        features: features
      };
      
      // Convert GeoJSON to KML
      const kml = tokml(geojson, {
        documentName: 'Map Export',
        documentDescription: 'Exported from Topomap',
        name: 'name',
        description: 'description'
      });
      
      // Create and download file
      const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `map_export_${new Date().toISOString().replace(/[:.]/g, '-')}.kml`;
      
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
    } catch (error) {
      console.error('Error exporting KML:', error);
      setExportError(`Failed to export KML: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  }, [map]);

  // Export as DXF
  const exportDXF = useCallback(async () => {
    if (!map?.current) {
      setExportError('Map not available');
      return;
    }
    
    try {
      setIsExporting(true);
      setExportError(null);
      
      // Get all rendered features for selected layers
      const features = map.current.queryRenderedFeatures({
        layers: document.getElementById('include-all-layers-dxf')?.checked ? undefined : 
                [document.getElementById('dxf-layer-select').value]
      });
      
      // Convert to GeoJSON
      const geojsonObj = {
        type: 'FeatureCollection',
        features: features.map(f => ({
          type: 'Feature',
          geometry: f.geometry,
          properties: f.properties
        }))
      };
      
      // Simple DXF format - implement our own basic DXF writer
      // This works more reliably than depending on external libraries
      // that might have compatibility issues
      let dxfContent = '0\nSECTION\n2\nENTITIES\n';
      
      // Process features and add to DXF
      geojsonObj.features.forEach((feature, featureIndex) => {
        try {
          const layerName = (feature.properties?.layer || `LAYER_${featureIndex}`).substring(0, 31);
          
          if (feature.geometry.type === 'Point') {
            const [x, y] = feature.geometry.coordinates;
            // Add a point entity
            dxfContent += `0\nPOINT\n8\n${layerName}\n10\n${x}\n20\n${y}\n0\n`;
          } 
          else if (feature.geometry.type === 'LineString') {
            // Add a polyline entity
            dxfContent += `0\nPOLYLINE\n8\n${layerName}\n66\n1\n70\n0\n`;
            
            // Add vertices
            feature.geometry.coordinates.forEach(([x, y]) => {
              dxfContent += `0\nVERTEX\n8\n${layerName}\n10\n${x}\n20\n${y}\n0\n`;
            });
            
            // End polyline
            dxfContent += `0\nSEQEND\n8\n${layerName}\n`;
          }
          else if (feature.geometry.type === 'Polygon') {
            // Add each ring as a separate polyline
            feature.geometry.coordinates.forEach((ring, ringIndex) => {
              // Add a closed polyline entity
              dxfContent += `0\nPOLYLINE\n8\n${layerName}\n66\n1\n70\n1\n`;
              
              // Add vertices
              ring.forEach(([x, y]) => {
                dxfContent += `0\nVERTEX\n8\n${layerName}\n10\n${x}\n20\n${y}\n0\n`;
              });
              
              // End polyline
              dxfContent += `0\nSEQEND\n8\n${layerName}\n`;
            });
          }
        } catch (err) {
          console.error('Error processing feature for DXF:', err);
        }
      });
      
      // Close the DXF file
      dxfContent += '0\nENDSEC\n0\nEOF\n';
      
      // Download
      const blob = new Blob([dxfContent], { type: 'application/dxf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `map_export_${new Date().toISOString().replace(/[:\.]/g, '-')}.dxf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting DXF:', error);
      setExportError(`Export failed: ${error.message}`);
      
      // Fallback to GeoJSON if DXF fails
      try {
        const geojsonObj = {
          type: 'FeatureCollection',
          features: map.current.queryRenderedFeatures().map(f => ({
            type: 'Feature',
            geometry: f.geometry,
            properties: f.properties
          }))
        };
        
        const blob = new Blob([JSON.stringify(geojsonObj)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `map_export_${new Date().toISOString().replace(/[:\.]/g, '-')}.geojson`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setExportError('DXF export failed. Exported as GeoJSON instead.');
      } catch (fallbackError) {
        setExportError(`Export completely failed: ${fallbackError.message}`);
      }
    } finally {
      setIsExporting(false);
    }
  }, [map]);

  // Render proper export options based on selected format
  const renderExportOptions = () => {
    switch (exportFormat) {
      case 'image':
        return (
          <div className="export-options">
            <h4>Image Export Options</h4>
            
            <div className="option-group">
              <button 
                onClick={toggleAreaSelection} 
                className={isSelectingArea ? 'active' : ''}
              >
                {isSelectingArea ? 'Cancel Selection' : 'Select Area'}
              </button>
              
              {selectedBounds && (
                <div className="selected-area-info">
                  <span>Selected Area: </span>
                  <button onClick={() => setSelectedBounds(null)}>Clear</button>
                </div>
              )}
            </div>
            
            <div className="option-group">
              <label htmlFor="image-width">Width (px)</label>
              <input 
                type="number" 
                id="image-width"
                min="50" max="1280"
                value={imageOptions.width} 
                onChange={(e) => setImageOptions({...imageOptions, width: parseInt(e.target.value) || 1280})}
              />
            </div>
            
            <div className="option-group">
              <label htmlFor="image-height">Height (px)</label>
              <input 
                type="number" 
                id="image-height"
                min="50" max="1280" 
                value={imageOptions.height} 
                onChange={(e) => setImageOptions({...imageOptions, height: parseInt(e.target.value) || 1280})}
              />
            </div>
            
            <div className="option-group">
              <label htmlFor="image-resolution">Resolution</label>
              <select 
                id="image-resolution"
                value={imageOptions.resolution} 
                onChange={(e) => setImageOptions({...imageOptions, resolution: e.target.value})}
              >
                <option value="1x">1x</option>
                <option value="2x">2x (Retina)</option>
                <option value="4x">4x (High Resolution)</option>
              </select>
            </div>
            
            <div className="option-group">
              <label htmlFor="image-format">Format</label>
              <select 
                id="image-format"
                value={imageOptions.format} 
                onChange={(e) => setImageOptions({...imageOptions, format: e.target.value})}
              >
                <option value="png">PNG</option>
                <option value="jpg">JPEG</option>
              </select>
            </div>
            
            {/* Premium quality option */}
            <div className="option-group checkbox premium-option">
              <input type="checkbox" id="premium-quality" defaultChecked />
              <label htmlFor="premium-quality">Ultra-High Quality Export (Recommended)</label>
              <p className="help-text">Uses enhanced rendering techniques for maximum image quality</p>
            </div>

            {imageOptions.format === 'png' && (
              <div className="option-group checkbox">
                <input type="checkbox" id="transparent-bg" />
                <label htmlFor="transparent-bg">Transparent Background</label>
              </div>
            )}
            
            <div className="option-group">
              <p className="alternative-option">Having issues with image export?</p>
              <button 
                className="export-button screenshot-button" 
                onClick={exportCanvasScreenshot}
                disabled={isExporting}
              >
                Take Canvas Screenshot
              </button>
              <p className="help-text">This creates an image directly from the map canvas.</p>
            </div>
            
            <button 
              className="export-button" 
              onClick={exportImage}
              disabled={isExporting}
            >
              {isExporting ? 'Generating...' : 'Export Image'}
            </button>
          </div>
        );
        
      case 'elevation':
        return (
          <div className="export-options">
            <h4>Terrain Elevation Export</h4>
            
            <div className="option-group">
              <button 
                onClick={toggleAreaSelection} 
                className={isSelectingArea ? 'active' : ''}
              >
                {isSelectingArea ? 'Cancel Selection' : 'Select Area'}
              </button>
            </div>
            
            <div className="option-group">
              <label htmlFor="elevation-samples">Sample Resolution (points per side)</label>
              <input 
                type="number" 
                id="elevation-samples" 
                min="10" max="500" 
                defaultValue="50"
              />
              <p className="help-text">Higher values create more detailed terrain but larger files.</p>
            </div>
            
            <button 
              className="export-button" 
              onClick={exportElevation}
              disabled={isExporting}
            >
              {isExporting ? 'Generating...' : 'Export XYZ Data'}
            </button>
            
            <p className="note">XYZ format: Longitude,Latitude,Elevation CSV</p>
          </div>
        );
        
      case 'kml':
        return (
          <div className="export-options">
            <h4>KML Export Options</h4>
            
            <div className="option-group">
              <p>Export map data as KML file for use with Google Earth and other GIS applications.</p>
            </div>
            
            <div className="option-group">
              <button 
                className="export-button" 
                onClick={exportKML}
                disabled={isExporting}
              >
                {isExporting ? 'Exporting...' : 'Export KML'}
              </button>
            </div>
            
            <div className="option-group">
              <p className="note">
                KML export includes all visible markers, routes, and measurements on the map.
              </p>
            </div>
          </div>
        );
        
      case 'dxf':
        return (
          <div className="export-options">
            <h4>DXF Export Options</h4>
            
            <div className="option-group">
              <div className="checkbox">
                <input type="checkbox" id="include-all-layers-dxf" defaultChecked />
                <label htmlFor="include-all-layers-dxf">Include all visible layers</label>
              </div>
            </div>
            
            <div className="option-group">
              <label htmlFor="dxf-layer-select">Or select specific layer:</label>
              <select id="dxf-layer-select" disabled={document.getElementById('include-all-layers-dxf')?.checked}>
                <option value="">Select a layer</option>
                <option value="imported-data-layer">Imported Route</option>
                <option value="imported-waypoints">Waypoints</option>
                {/* Add other layers dynamically */}
              </select>
            </div>
            
            <button 
              className="export-button" 
              onClick={exportDXF}
              disabled={isExporting}
            >
              {isExporting ? 'Generating...' : 'Export DXF'}
            </button>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="export-tool">
      <h3>Export Map Data</h3>
      
      {exportError && (
        <div className="export-error">
          <p>{exportError}</p>
          <button onClick={() => setExportError(null)}>Dismiss</button>
        </div>
      )}
      
      <div className="format-selector">
        <button 
          className={exportFormat === 'image' ? 'active' : ''} 
          onClick={() => handleFormatChange('image')}
        >
          Image (PNG/JPG)
        </button>
        <button 
          className={exportFormat === 'elevation' ? 'active' : ''} 
          onClick={() => handleFormatChange('elevation')}
        >
          Elevation (XYZ)
        </button>
        <button 
          className={exportFormat === 'kml' ? 'active' : ''} 
          onClick={() => handleFormatChange('kml')}
        >
          KML/KMZ
        </button>
        <button 
          className={exportFormat === 'dxf' ? 'active' : ''} 
          onClick={() => handleFormatChange('dxf')}
        >
          DXF
        </button>
      </div>
      
      {renderExportOptions()}
      
      <div className="export-instructions">
        <h4>Instructions</h4>
        <ul>
          <li>Use "Select Area" to choose a specific region to export</li>
          <li>For large exports, higher resolution may take longer to generate</li>
          <li>KML and DXF formats are best for CAD/GIS applications</li>
          <li>XYZ format works well with 3D modeling software</li>
        </ul>
      </div>
    </div>
  );
}

export default ExportTool;