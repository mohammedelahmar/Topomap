import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import '../../styles/Navbar.css';

function Navbar({ isLoggedIn, setIsLoggedIn }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    authService.clearAuth();
    setIsLoggedIn(false);
    navigate('/');
  };

  return (
    <header className="navbar-container">
      <div className="navbar-brand">
        <Link to="/">
          <h1>TopoMap</h1>
        </Link>
        <p className="tagline">Interactive Terrain Mapping</p>
      </div>

      <button 
        className="mobile-menu-toggle" 
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        {menuOpen ? '✕' : '☰'}
      </button>
      
      <div className={`navbar-content ${menuOpen ? 'open' : ''}`}>
        <nav className="nav-links">
          <Link to="/" className="nav-link">Map</Link>
          {isLoggedIn && (
            <>
              <Link to="/projects" className="nav-link">My Projects</Link>
              <Link to="/profile" className="nav-link">Profile</Link>
            </>
          )}
          <Link to="/about" className="nav-link">About</Link>
        </nav>
        
        <div className="auth-container">
          {isLoggedIn ? (
            <button onClick={handleLogout} className="auth-btn logout-btn">
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          ) : (
            <>
              <Link to="/login" className="auth-btn login-btn">
                <i className="fas fa-sign-in-alt"></i> Login
              </Link>
              <Link to="/register" className="auth-btn register-btn">
                <i className="fas fa-user-plus"></i> Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;