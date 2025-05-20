import React, { useState } from 'react';
import proj4 from 'proj4';
import '../../../styles/CoordinateSearch.css';

// Define projections: WGS84, UTM zone 29N, and a sample local (Merchich/EPSG:26191)
const WGS84 = 'EPSG:4326';
const UTM29N = '+proj=utm +zone=29 +datum=WGS84 +units=m +no_defs';
const MERCHICH = '+proj=lcc +lat_1=33 +lat_2=35 +lat_0=34 +lon_0=-6 +x_0=500000 +y_0=0 +ellps=GRS80 +units=m +no_defs';

function CoordinateSearch({ onSearch }) {
  const [coordinates, setCoordinates] = useState({
    x: '',
    y: ''
  });
  const [coordSystem, setCoordSystem] = useState('wgs84');
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChange = (e) => {
    setCoordinates({
      ...coordinates,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSystemChange = (e) => {
    setCoordSystem(e.target.value);
    setError('');
  };

  const transformCoordinates = (x, y, system) => {
    try {
      switch(system) {
        case 'wgs84':
          return [x, y];
        case 'utm':
          return proj4(UTM29N, WGS84, [x, y]);
        case 'local':
          return proj4(MERCHICH, WGS84, [x, y]);
        default:
          return [x, y];
      }
    } catch (error) {
      console.error("Coordinate transformation error:", error);
      setError("Failed to transform coordinates. Check your input values.");
      return [0, 0];
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate inputs are numbers
    const x = parseFloat(coordinates.x);
    const y = parseFloat(coordinates.y);
    
    if (isNaN(x) || isNaN(y)) {
      setError('Please enter valid numeric coordinates');
      return;
    }

    // Different validation based on coordinate system
    if (coordSystem === 'wgs84') {
      // Standard lat/lng validation
      if (x < -180 || x > 180) {
        setError('Longitude must be between -180 and 180');
        return;
      }
      
      if (y < -90 || y > 90) {
        setError('Latitude must be between -90 and 90');
        return;
      }
    }
    
    try {
      // Transform coordinates to WGS84 if needed
      const [transformedX, transformedY] = transformCoordinates(x, y, coordSystem);
      
      // Validate the transformed coordinates
      if (isNaN(transformedX) || isNaN(transformedY)) {
        setError('Transformation failed. Please check your coordinates.');
        return;
      }
      
      // Call the onSearch callback with transformed coordinates
      onSearch(transformedX, transformedY);
      
      // Clear the form
      setCoordinates({ x: '', y: '' });
      
      // Collapse the form after successful search
      setIsExpanded(false);
    } catch (error) {
      setError('Error during coordinate transformation. Please check your input.');
      console.error(error);
    }
  };

  return (
    <div className="coordinate-search">
      {!isExpanded ? (
        <button 
          className="search-toggle" 
          onClick={() => setIsExpanded(true)}
        >
          🔍 Go to Coordinates
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="search-form">
          <div className="form-system-select">
            <label htmlFor="coordSystem">Coordinate System:</label>
            <select 
              id="coordSystem" 
              name="coordSystem"
              value={coordSystem}
              onChange={handleSystemChange}
              className="system-select"
            >
              <option value="wgs84">WGS84 (Lon/Lat)</option>
              <option value="utm">UTM Zone 29N</option>
              <option value="local">Merchich (EPSG:26191)</option>
            </select>
          </div>

          <div className="form-fields">
            <div className="input-group">
              <label htmlFor="x">
                {coordSystem === 'wgs84' ? 'Longitude (X):' : 'Easting (X):'}
              </label>
              <input
                type="text"
                id="x"
                name="x"
                value={coordinates.x}
                onChange={handleChange}
                placeholder={getPlaceholder(coordSystem, 'x')}
                autoFocus
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="y">
                {coordSystem === 'wgs84' ? 'Latitude (Y):' : 'Northing (Y):'}
              </label>
              <input
                type="text"
                id="y"
                name="y"
                value={coordinates.y}
                onChange={handleChange}
                placeholder={getPlaceholder(coordSystem, 'y')}
              />
            </div>
          </div>
          
          {error && <div className="search-error">{error}</div>}
          
          <div className="search-buttons">
            <button type="button" onClick={() => setIsExpanded(false)} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="go-btn">
              Go
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// Helper function to get appropriate placeholders based on coordinate system
function getPlaceholder(system, axis) {
  switch(system) {
    case 'wgs84':
      return axis === 'x' ? '-7.634" (Longitude)' : '33.573" (Latitude)';
    case 'utm':
      return axis === 'x' ? '444456.98 (Easting)' : '3697627.12 (Northing)';
    case 'local':
      return axis === 'x' ? '500000.00 (Easting)' : '330000.00 (Northing)';
    default:
      return 'Enter value';
  }
}

export default CoordinateSearch;