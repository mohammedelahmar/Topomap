// filepath: c:\Users\PC\Documents\topomap\client\src\services\markerService.js
import api from './api';

const markerService = {
  // Get all markers for a map
  getMarkers: async (mapId) => {
    try {
      const response = await api.get(`/maps/${mapId}/markers`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get markers');
    }
  },

  // Add a new marker
  addMarker: async (mapId, markerData) => {
    try {
      const response = await api.post(`/maps/${mapId}/markers`, markerData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to add marker');
    }
  },

  // Update a marker
  updateMarker: async (mapId, markerId, updates) => {
    try {
      const response = await api.put(`/maps/${mapId}/markers/${markerId}`, updates);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update marker');
    }
  },

  // Delete a marker
  deleteMarker: async (mapId, markerId) => {
    try {
      const response = await api.delete(`/maps/${mapId}/markers/${markerId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete marker');
    }
  }
};

export default markerService;