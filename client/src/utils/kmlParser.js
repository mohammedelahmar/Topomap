/**
 * KML file parser utility
 * Converts KML files to GeoJSON format for use with MapBox GL JS
 */
import { DOMParser } from 'xmldom';
import toGeoJSON from '@mapbox/togeojson';

/**
 * Parse a KML file and convert it to GeoJSON
 * @param {File} file - The KML file to parse
 * @returns {Promise<Object>} - A promise that resolves to GeoJSON data
 */
export const parseKMLFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const kmlString = e.target.result;
        
        // Parse KML XML
        const parser = new DOMParser();
        const kmlDoc = parser.parseFromString(kmlString, "text/xml");
        
        // Check if it's a valid KML file
        if (!kmlDoc || !kmlDoc.getElementsByTagName('kml').length) {
          reject(new Error("Invalid KML format"));
          return;
        }
        
        // Convert KML to GeoJSON
        const geoJsonData = toGeoJSON.kml(kmlDoc);
        
        // Add metadata
        geoJsonData.metadata = {
          name: file.name,
          fileType: 'kml',
          originalFormat: 'kml'
        };
        
        resolve(geoJsonData);
      } catch (error) {
        console.error("KML parsing error:", error);
        reject(new Error(`Error parsing KML file: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error("Failed to read KML file"));
    };
    
    reader.readAsText(file);
  });
};