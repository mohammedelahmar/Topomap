import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import App from './App.jsx'

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element not found! Make sure there is a <div id="root"></div> in your HTML file');
}

const root = createRoot(container);

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
)
