import React from 'react';
import MeasurementTool from '../tools/MeasurementTool';
import FileImport from '../tools/FileImport';
import ExportTool from '../tools/ExportTool';
import CustomMarkerTool from '../tools/CustomMarkerTool';  // Add this import
import '../../../styles/FeaturePanel.css';

function FeaturePanel({ activeFeature, setActiveFeature, map, routeData, onImport }) {
  // Safely close the panel
  const closePanel = () => {
    // Make sure we clean up any active tools first
    setActiveFeature(null);
  };

  // Render appropriate feature component based on activeFeature
  const renderFeatureContent = () => {
    try {
      switch (activeFeature) {
        case 'measure':
          return <MeasurementTool map={map} />;
        case 'import':
          return <FileImport onImport={onImport} />;
        case 'elevation':
          return (
            <div className="placeholder-message">
              <h3>Elevation Profile</h3>
              {routeData ? (
                <p>Elevation profile functionality is coming soon!</p>
              ) : (
                <p>Please import a route first to view elevation data.</p>
              )}
            </div>
          );
        case 'export':
          return <ExportTool map={map} />;
        case 'markers': // Add this case
          return <CustomMarkerTool map={map} />;
        default:
          return <div>Select a feature to get started</div>;
      }
    } catch (error) {
      console.error("Error rendering feature content:", error);
      return (
        <div className="feature-error">
          <h3>Error Loading Feature</h3>
          <p>{error.message}</p>
          <button onClick={closePanel}>Close</button>
        </div>
      );
    }
  };

  return (
    <div className="feature-panel">
      <div className="feature-panel-header">
        <h3>{activeFeature && activeFeature.charAt(0).toUpperCase() + activeFeature.slice(1)}</h3>
        <button onClick={closePanel} className="close-button">×</button>
      </div>
      <div className="feature-panel-content">
        {renderFeatureContent()}
      </div>
    </div>
  );
}

export default FeaturePanel;