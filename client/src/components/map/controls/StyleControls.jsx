import React from 'react';
import '../../../styles/StyleControls.css';

function StyleControls({ onStyleChange, currentStyle }) {
  const mapStyles = [
    { id: 'streets', name: 'Streets', value: 'mapbox://styles/mapbox/streets-v12' },
    { id: 'outdoors', name: 'Outdoors', value: 'mapbox://styles/mapbox/outdoors-v12' },
    // Updated satellite style to v12 to match other styles
    { id: 'satellite', name: 'Satellite', value: 'mapbox://styles/mapbox/satellite-streets-v12' },
    // If you want pure satellite, use this instead:
    // { id: 'satellite', name: 'Satellite', value: 'mapbox://styles/mapbox/satellite-v9' },
    { id: 'light', name: 'Light', value: 'mapbox://styles/mapbox/light-v11' },
    { id: 'dark', name: 'Dark', value: 'mapbox://styles/mapbox/dark-v11' }
  ];

  return (
    <div className="style-controls">
      <div className="style-buttons">
        {mapStyles.map(style => (
          <button 
            key={style.id}
            onClick={() => onStyleChange(style.value)}
            title={`Switch to ${style.name} map style`}
            className={currentStyle === style.value ? 'active' : ''}
            disabled={currentStyle === style.value}
          >
            {style.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default StyleControls;