import React, { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import mapService from '../../../services/mapService'; // Assuming you have a service to fetch elevation data
import '../../../styles/ElevationProfile.css';

// Access token from environment variables
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

function ElevationProfile({ route }) {
  const canvasRef = useRef(null);
  const [elevationData, setElevationData] = useState(null);
  const [stats, setStats] = useState({
    maxElevation: 0,
    minElevation: Infinity,
    totalAscent: 0,
    totalDescent: 0,
    distance: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  // Calculate distance between two points using Haversine formula
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }, []);

  // Sample a route at regular intervals to get elevation points
  const sampleRoute = useCallback(async (coordinates) => {
    setIsLoading(true);
    try {
      // For real implementation, you'd get elevation from an API
      // Here we're using a placeholder that fetches each point
      const elevationPoints = [];
      let totalDistance = 0;
      let maxElevation = 0;
      let minElevation = Infinity;
      let totalAscent = 0;
      let totalDescent = 0;
      let lastElevation = null;

      for (let i = 0; i < coordinates.length; i++) {
        const [lng, lat] = coordinates[i];

        // Calculate distance from previous point
        if (i > 0) {
          const prevCoord = coordinates[i - 1];
          const distance = calculateDistance(
            prevCoord[1], prevCoord[0],
            lat, lng
          );
          totalDistance += distance;
        }

        // Get elevation data from API
        try {
          // In a real implementation, batch these requests or use a terrain API
          const elevationResponse = await mapService.getElevation(lng, lat);
          const elevation = elevationResponse.elevation;

          // Update statistics
          maxElevation = Math.max(maxElevation, elevation);
          minElevation = Math.min(minElevation, elevation);

          if (lastElevation !== null) {
            const diff = elevation - lastElevation;
            if (diff > 0) totalAscent += diff;
            if (diff < 0) totalDescent += Math.abs(diff);
          }

          lastElevation = elevation;

          elevationPoints.push({
            distance: totalDistance,
            elevation: elevation,
            coordinates: [lng, lat]
          });
        } catch (error) {
          console.error('Error fetching elevation:', error);
          // Use a mock value as fallback
          const mockElevation = 500 + Math.random() * 500;
          elevationPoints.push({
            distance: totalDistance,
            elevation: mockElevation,
            coordinates: [lng, lat]
          });
        }
      }

      setElevationData(elevationPoints);
      setStats({
        maxElevation,
        minElevation,
        totalAscent,
        totalDescent,
        distance: totalDistance
      });
    } catch (error) {
      console.error('Error sampling route:', error);
    } finally {
      setIsLoading(false);
    }
  }, [calculateDistance]);

  // Draw the elevation profile on canvas
  useEffect(() => {
    if (!elevationData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Set style
    ctx.strokeStyle = '#0066CC';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(0, 102, 204, 0.2)';

    // Find min and max values for scaling
    const minElev = Math.min(...elevationData.map(p => p.elevation));
    const maxElev = Math.max(...elevationData.map(p => p.elevation));
    const totalDist = elevationData[elevationData.length - 1].distance;

    // Calculate scale factors
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // Draw axes
    ctx.beginPath();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    // Draw grid lines and labels
    const numHorizontalLines = 5;
    const elevationStep = (maxElev - minElev) / numHorizontalLines;

    ctx.font = '10px Arial';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= numHorizontalLines; i++) {
      const elevation = minElev + (elevationStep * i);
      const y = height - padding.bottom - (i * graphHeight / numHorizontalLines);

      // Draw grid line
      ctx.beginPath();
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 0.5;
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Draw elevation label
      ctx.fillText(Math.round(elevation) + 'm', padding.left - 5, y);
    }

    // Draw distance labels
    const numVerticalLines = 5;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let i = 0; i <= numVerticalLines; i++) {
      const distance = (totalDist * i) / numVerticalLines;
      const x = padding.left + (i * graphWidth / numVerticalLines);

      // Draw grid line
      ctx.beginPath();
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 0.5;
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();

      // Draw distance label
      ctx.fillText((distance / 1000).toFixed(1) + 'km', x, height - padding.bottom + 5);
    }

    // Draw elevation profile
    ctx.beginPath();
    ctx.strokeStyle = '#0066CC';
    ctx.lineWidth = 2;

    elevationData.forEach((point, i) => {
      const x = padding.left + (point.distance / totalDist) * graphWidth;
      const y = height - padding.bottom - ((point.elevation - minElev) / (maxElev - minElev)) * graphHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Fill area under the curve
    ctx.lineTo(padding.left + graphWidth, height - padding.bottom);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 102, 204, 0.2)';
    ctx.fill();

  }, [elevationData]);

  // Request elevation data when the route changes
  useEffect(() => {
    if (route && route.coordinates && route.coordinates.length > 1) {
      sampleRoute(route.coordinates);
    }
  }, [route, sampleRoute]);

  return (
    <div className="elevation-profile">
      <h3>Elevation Profile</h3>

      {isLoading ? (
        <div className="loading">Loading elevation data...</div>
      ) : (
        <>
          <div className="stats">
            <div className="stat-item">
              <span>Max Elevation:</span>
              <strong>{stats.maxElevation.toFixed(0)}m</strong>
            </div>
            <div className="stat-item">
              <span>Min Elevation:</span>
              <strong>{stats.minElevation.toFixed(0)}m</strong>
            </div>
            <div className="stat-item">
              <span>Total Ascent:</span>
              <strong>{stats.totalAscent.toFixed(0)}m</strong>
            </div>
            <div className="stat-item">
              <span>Total Descent:</span>
              <strong>{stats.totalDescent.toFixed(0)}m</strong>
            </div>
            <div className="stat-item">
              <span>Distance:</span>
              <strong>{(stats.distance / 1000).toFixed(2)}km</strong>
            </div>
          </div>

          <div className="chart-container">
            <canvas
              ref={canvasRef}
              width="600"
              height="200"
              className="elevation-chart"
            />
          </div>
        </>
      )}
    </div>
  );
}

export default ElevationProfile;