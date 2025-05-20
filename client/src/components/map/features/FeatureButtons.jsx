import React from 'react';

function FeatureButtons({ 
  activeFeature, 
  setActiveFeature, 
  routeData, 
  is3DMode, 
  toggle3DTerrain 
}) {
  return (
    <div className="feature-buttons">
      <button 
        className={activeFeature === 'measure' ? 'active' : ''}
        onClick={() => setActiveFeature(activeFeature === 'measure' ? null : 'measure')}
      >
        📏 Measure
      </button>
      <button 
        className={activeFeature === 'import' ? 'active' : ''}
        onClick={() => setActiveFeature(activeFeature === 'import' ? null : 'import')}
      >
        📥 Import
      </button>
      <button 
        className={activeFeature === 'elevation' ? 'active' : ''}
        onClick={() => setActiveFeature(activeFeature === 'elevation' ? null : 'elevation')}
        disabled={!routeData}
      >
        📊 Elevation
      </button>
      <button 
        className={activeFeature === 'export' ? 'active' : ''}
        onClick={() => setActiveFeature(activeFeature === 'export' ? null : 'export')}
      >
        📤 Export
      </button>
      <button 
        className={is3DMode ? 'active' : ''}
        onClick={toggle3DTerrain}
      >
        {is3DMode ? '🗺️ 2D Map' : '🏔️ 3D Terrain'}
      </button>
    </div>
  );
}

export default FeatureButtons;