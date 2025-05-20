import React from 'react';
import Home from './pages/Home';
import './App.css';

function App() {
  console.log('App component rendering');
  return (
    <div className="app-container">
      <Home />
    </div>
  );
}

export default App;
