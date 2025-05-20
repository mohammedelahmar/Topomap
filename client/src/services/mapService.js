import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests if available
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Map data services
const mapService = {
  // Get all saved maps for a user
  getUserMaps: async () => {
    try {
      const response = await api.get('/maps');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch maps');
    }
  },

  // Save a map with its features
  saveMap: async (mapData) => {
    try {
      const response = await api.post('/maps', mapData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to save map');
    }
  },

  // Get a specific map by ID
  getMapById: async (mapId) => {
    try {
      const response = await api.get(`/maps/${mapId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch map');
    }
  },

  // Update an existing map
  updateMap: async (mapId, mapData) => {
    try {
      const response = await api.put(`/maps/${mapId}`, mapData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update map');
    }
  },

  // Delete a map
  deleteMap: async (mapId) => {
    try {
      const response = await api.delete(`/maps/${mapId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete map');
    }
  },

  // Get elevation data for a specific point
  getElevation: async (lng, lat) => {
    try {
      const response = await api.get(`/elevation?lng=${lng}&lat=${lat}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get elevation data');
    }
  },

  // Add a feature to a specific map
  addFeature: async (mapId, feature) => {
    try {
      const response = await api.post(`/maps/${mapId}/features`, { feature });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to save feature');
    }
  }
};

export default mapService;