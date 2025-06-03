import React, { useState } from 'react';
import MapPlatformSelector from '../components/map/MapPlatformSelector';
import '../styles/layout.css';
import '../styles/Home.css';

function Home({ isLoggedIn }) {
  const [activeFeature, setActiveFeature] = useState(null);

  return (
    <div className="home-container">
      <div className="map-section">
        <MapPlatformSelector 
          activeFeature={activeFeature}
          setActiveFeature={setActiveFeature}
          isLoggedIn={isLoggedIn}
        />
      </div>
    </div>
  );
}

export default Home;