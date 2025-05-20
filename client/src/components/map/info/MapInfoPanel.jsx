import React from 'react';

function MapInfoPanel({ lng, lat, zoom, elevationData }) {
  return (
    <div className="map-info-sidebar">
      <div className="coordinates">
        Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
      </div>
      {elevationData && <div className="elevation-info">{elevationData}</div>}
    </div>
  );
}

export default MapInfoPanel;