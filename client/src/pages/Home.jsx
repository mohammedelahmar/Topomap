import React, { useState } from 'react';
import { authService } from '../services/authService';
import MapPlatformSelector from '../components/map/MapPlatformSelector';
import '../styles/layout.css';
import '../styles/Home.css';

function Home() {
  const [activeFeature, setActiveFeature] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));

  const handleAuthSuccess = () => {
    setIsLoggedIn(true);
    setShowAuth(false);
  };

  return (
    <div className="home-container">
      <div className="map-section">
        <MapPlatformSelector 
          activeFeature={activeFeature}
          setActiveFeature={setActiveFeature}
          showAuth={showAuth}
          setShowAuth={setShowAuth}
          setIsLoggedIn={setIsLoggedIn}
          onAuthSuccess={handleAuthSuccess}
        />
      </div>
    </div>
  );
}

export default Home;