import React, { useState, useRef } from 'react';
import { parseGPXFile } from '../../../utils/gpxParser';
import { parseKMLFile } from '../../../utils/kmlParser';
import '../../../styles/FileImport.css';

function FileImport({ onImport }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };
  
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFileUpload(file);
      // Reset the file input so the same file can be selected again if needed
      e.target.value = null;
    }
  };
  
  const handleFileUpload = async (file) => {
    try {
      setError(null);
      setUploading(true);
      
      // Set basic file info
      setFileInfo({
        name: file.name,
        size: (file.size / 1024).toFixed(2) + ' KB',
        type: file.type
      });
      
      // Check file type
      if (file.name.toLowerCase().endsWith('.geojson') || 
          file.name.toLowerCase().endsWith('.json') ||
          file.type === 'application/json' ||
          file.type === 'application/geo+json') {
        // Handle JSON/GeoJSON file
        await parseJsonFile(file);
      } else if (file.name.toLowerCase().endsWith('.gpx')) {
        // Handle GPX files
        await parseGpxFile(file);
      } else if (file.name.toLowerCase().endsWith('.kml')) {
        // Handle KML files
        await parseKmlFile(file);
      } else {
        setError("Unsupported file format. Please upload GeoJSON, JSON, GPX, or KML files.");
      }
    } catch (err) {
      console.error("Error processing file:", err);
      setError(`Error processing file: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };
  
  // Parse JSON/GeoJSON files
  const parseJsonFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const jsonData = JSON.parse(event.target.result);
          
          // Check if it's a valid GeoJSON
          if (jsonData.type && 
             (jsonData.type === 'FeatureCollection' || 
              jsonData.type === 'Feature' ||
              jsonData.type === 'Point' ||
              jsonData.type === 'LineString' ||
              jsonData.type === 'Polygon')) {
            
            // Call the import handler from parent
            onImport(jsonData);
            resolve();
          } else {
            reject(new Error('Invalid GeoJSON format'));
          }
        } catch (err) {
          reject(new Error(`Failed to parse JSON: ${err.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      
      // Read the file
      reader.readAsText(file);
    });
  };

  // Parse GPX files
  const parseGpxFile = async (file) => {
    try {
      console.log("Parsing GPX file:", file.name);
      const geoJsonData = await parseGPXFile(file);
      console.log("GPX parsed successfully:", geoJsonData);
      onImport(geoJsonData);
    } catch (error) {
      console.error("GPX parsing error:", error);
      throw new Error(`Failed to parse GPX file: ${error.message}`);
    }
  };

  // Parse KML files
  const parseKmlFile = async (file) => {
    try {
      console.log("Parsing KML file:", file.name);
      const geoJsonData = await parseKMLFile(file);
      console.log("KML parsed successfully:", geoJsonData);
      onImport(geoJsonData);
    } catch (error) {
      console.error("KML parsing error:", error);
      throw new Error(`Failed to parse KML file: ${error.message}`);
    }
  };

  return (
    <div className="file-import">
      <h3>Import Data</h3>
      
      {error && (
        <div className="import-error">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      
      <div 
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="drop-zone-content">
          <div className="upload-icon">📂</div>
          <p>Drag and drop files here</p>
          <p className="or-separator">OR</p>
          <button 
            className="browse-button"
            onClick={triggerFileInput}
            disabled={uploading}
          >
            {uploading ? 'Processing...' : 'Browse Files'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.geojson,.gpx,.kml,application/json,application/geo+json"
            onChange={handleFileSelect}
            style={{ display: 'none' }} // Hide the actual input
          />
          <p className="file-formats">Supported formats: GeoJSON, JSON, GPX, KML</p>
        </div>
      </div>
      
      {fileInfo && (
        <div className="file-info">
          <h4>Selected File</h4>
          <p><strong>Name:</strong> {fileInfo.name}</p>
          <p><strong>Size:</strong> {fileInfo.size}</p>
          <p><strong>Type:</strong> {fileInfo.type}</p>
        </div>
      )}
    </div>
  );
}

export default FileImport;