import React from 'react';

function LoadingSpinner() {
  return (
    <div className="loading-spinner-container">
      <div className="loading-spinner"></div>
      <p>Loading map...</p>
    </div>
  );
}

export default LoadingSpinner;