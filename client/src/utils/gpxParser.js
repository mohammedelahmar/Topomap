/**
 * GPX file parser utility
 * Converts GPX files to GeoJSON format for use with MapBox GL JS
 */
import { DOMParser } from 'xmldom';
import toGeoJSON from '@mapbox/togeojson';

/**
 * Parse a GPX file and convert it to GeoJSON
 * @param {File} file - The GPX file to parse
 * @returns {Promise<Object>} - A promise that resolves to GeoJSON data
 */
export const parseGPXFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const gpxString = e.target.result;
        
        // Parse GPX XML
        const parser = new DOMParser();
        const gpxDoc = parser.parseFromString(gpxString, "text/xml");
        
        // Check if it's a valid GPX file
        if (!gpxDoc || !gpxDoc.getElementsByTagName('gpx').length) {
          reject(new Error("Invalid GPX format"));
          return;
        }
        
        // Convert GPX to GeoJSON
        const geoJsonData = toGeoJSON.gpx(gpxDoc);
        
        // Add metadata
        geoJsonData.metadata = {
          name: file.name,
          fileType: 'gpx',
          originalFormat: 'gpx'
        };
        
        resolve(geoJsonData);
      } catch (error) {
        console.error("GPX parsing error:", error);
        reject(new Error(`Error parsing GPX file: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error("Failed to read GPX file"));
    };
    
    reader.readAsText(file);
  });
};