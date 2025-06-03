import React from 'react';
import '../styles/About.css';

function About() {
  return (
    <div className="about-page">
      <div className="about-container">
        <h1>About TopoMap</h1>
        
        <section className="about-section">
          <h2>The Developer</h2>
          <div className="developer-info">
            <div className="developer-content">
              <h3>Mohammed El Ahmar</h3>
              <p>
                I'm a passionate developer with expertise in geospatial applications and web development.
                My goal with TopoMap is to provide powerful terrain visualization and analysis tools
                that are accessible to everyone, from hikers to professional cartographers.
              </p>
            </div>
          </div>
        </section>
        
        <section className="about-section">
          <h2>About the Application</h2>
          <p>
            TopoMap is an interactive terrain mapping application that allows users to visualize,
            analyze, and interact with topographic data from around the world. The application
            combines multiple mapping technologies to provide a comprehensive toolkit for outdoor
            enthusiasts, researchers, and professionals.
          </p>
          
          <div className="features-grid">
            <div className="feature-card">
              <h3>3D Terrain Visualization</h3>
              <p>Experience realistic 3D terrain rendering with adjustable exaggeration.</p>
            </div>
            
            <div className="feature-card">
              <h3>Measurement Tools</h3>
              <p>Calculate distances, areas, and elevation profiles with precision.</p>
            </div>
            
            <div className="feature-card">
              <h3>Multiple Map Sources</h3>
              <p>Switch between Mapbox and Google Maps for different perspectives.</p>
            </div>
            
            <div className="feature-card">
              <h3>File Import/Export</h3>
              <p>Work with KML, GPX, and GeoJSON files for route planning.</p>
            </div>
            
            <div className="feature-card">
              <h3>Elevation Analysis</h3>
              <p>Get detailed elevation profiles and statistics for routes.</p>
            </div>
            
            <div className="feature-card">
              <h3>User Projects</h3>
              <p>Save and organize your mapping projects in the cloud.</p>
            </div>
          </div>
        </section>
        
        <section className="about-section">
          <h2>Technology Stack</h2>
          <p>TopoMap is built with modern web technologies:</p>
          <ul className="tech-stack">
            <li>React for the frontend interface</li>
            <li>Express.js and Node.js for the backend</li>
            <li>MongoDB for data storage</li>
            <li>Mapbox GL JS and Google Maps API for mapping</li>
            <li>JWT for secure authentication</li>
          </ul>
        </section>
        
        <section className="about-section contact">
          <h2>Get in Touch</h2>
          <p>
            Have questions or suggestions? Feel free to reach out through the contact
            information below.
          </p>
          <a href="mailto:contact@topomap.example.com" className="contact-button">
            Contact Me
          </a>
        </section>
      </div>
    </div>
  );
}

export default About;