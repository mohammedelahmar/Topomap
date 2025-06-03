import MapData from '../models/MapData.js';

// Get all maps (with filtering options)
export const getMaps = async (req, res) => {
  try {
    const { userId, isPublic, tags } = req.query;
    const filter = {};
    
    // Filter by owner if userId is provided
    if (userId) {
      filter.owner = userId;
    } else if (req.user) {
      // If no userId specified but user is logged in, show their maps and public maps
      filter.$or = [
        { owner: req.user.id },
        { isPublic: true }
      ];
    } else {
      // If not logged in, only show public maps
      filter.isPublic = true;
    }
    
    // Filter by public/private flag if specified
    if (isPublic !== undefined) {
      filter.isPublic = isPublic === 'true';
    }
    
    // Filter by tags if specified
    if (tags) {
      const tagArray = tags.split(',');
      filter.tags = { $in: tagArray };
    }
    
    const maps = await MapData.find(filter)
      .populate('owner', 'username')
      .select('name description center zoom tags isPublic createdAt updatedAt');
      
    res.status(200).json(maps);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching maps', error: error.message });
  }
};

// Get a specific map by ID
export const getMapById = async (req, res) => {
  try {
    const { id } = req.params;
    const map = await MapData.findById(id).populate('owner', 'username');
    
    if (!map) {
      return res.status(404).json({ message: 'Map not found' });
    }
    
    // Check access permissions
    if (!map.isPublic && (!req.user || map.owner.toString() !== req.user.id)) {
      return res.status(403).json({ message: 'You do not have permission to access this map' });
    }
    
    res.status(200).json(map);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching map', error: error.message });
  }
};

// Create a new map
export const createMap = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    const { name, description, center, zoom, features, isPublic, tags } = req.body;
    
    if (!name || !center) {
      return res.status(400).json({ message: 'Name and center coordinates are required' });
    }
    
    const newMap = new MapData({
      name,
      description,
      owner: req.user.id,
      center,
      zoom: zoom || 10,
      features: features || [],
      isPublic: isPublic || false,
      tags: tags || []
    });
    
    const savedMap = await newMap.save();
    res.status(201).json(savedMap);
  } catch (error) {
    res.status(500).json({ message: 'Error creating map', error: error.message });
  }
};

// Update an existing map
export const updateMap = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, center, zoom, features, isPublic, tags } = req.body;
    
    const map = await MapData.findById(id);
    
    if (!map) {
      return res.status(404).json({ message: 'Map not found' });
    }
    
    // Check if user has permission to update
    if (!req.user || map.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to update this map' });
    }
    
    // Update fields
    if (name) map.name = name;
    if (description !== undefined) map.description = description;
    if (center) map.center = center;
    if (zoom) map.zoom = zoom;
    if (features) map.features = features;
    if (isPublic !== undefined) map.isPublic = isPublic;
    if (tags) map.tags = tags;
    
    const updatedMap = await map.save();
    res.status(200).json(updatedMap);
  } catch (error) {
    res.status(500).json({ message: 'Error updating map', error: error.message });
  }
};

// Delete a map
export const deleteMap = async (req, res) => {
  try {
    const { id } = req.params;
    const map = await MapData.findById(id);
    
    if (!map) {
      return res.status(404).json({ message: 'Map not found' });
    }
    
    // Check if user has permission to delete
    if (!req.user || map.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to delete this map' });
    }
    
    await map.remove();
    res.status(200).json({ message: 'Map deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting map', error: error.message });
  }
};

// Add a feature to an existing map
export const addFeature = async (req, res) => {
  try {
    const { id } = req.params;
    const { feature } = req.body;
    
    if (!feature || !feature.geometry) {
      return res.status(400).json({ message: 'Valid feature data is required' });
    }
    
    const map = await MapData.findById(id);
    
    if (!map) {
      return res.status(404).json({ message: 'Map not found' });
    }
    
    // Check if user has permission
    if (!req.user || map.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to modify this map' });
    }
    
    map.features.push(feature);
    const updatedMap = await map.save();
    
    res.status(200).json(updatedMap);
  } catch (error) {
    res.status(500).json({ message: 'Error adding feature', error: error.message });
  }
};

// Get elevation data (would require integration with an elevation API)
export const getElevation = async (req, res) => {
  try {
    const { lng, lat } = req.query;
    
    if (!lng || !lat) {
      return res.status(400).json({ message: 'Longitude and latitude are required' });
    }
    
    // This is a placeholder - in a real implementation, you would call an elevation API
    // For example: OpenTopoData, Mapbox Terrain API, or Google Elevation API
    
    // Mock response for now
    const mockElevation = Math.floor(Math.random() * 1000);
    
    res.status(200).json({
      elevation: mockElevation,
      unit: 'meters',
      location: {
        lng: parseFloat(lng),
        lat: parseFloat(lat)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching elevation data', error: error.message });
  }
};

// Get all markers for a specific map
export const getMarkers = async (req, res) => {
  try {
    const { mapId } = req.params;
    const map = await MapData.findById(mapId);
    
    if (!map) {
      return res.status(404).json({ message: 'Map not found' });
    }
    
    // Check if user has permission to view private maps
    if (!map.isPublic && (!req.user || map.owner.toString() !== req.user.id)) {
      return res.status(403).json({ message: 'You do not have permission to view this map\'s markers' });
    }
    
    res.status(200).json(map.markers);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving markers', error: error.message });
  }
};

// Add a new marker to a map
export const addMarker = async (req, res) => {
  try {
    const { mapId } = req.params;
    const markerData = req.body;
    
    if (!markerData || !markerData.location || !markerData.title) {
      return res.status(400).json({ message: 'Marker data must include location and title' });
    }
    
    const map = await MapData.findById(mapId);
    
    if (!map) {
      return res.status(404).json({ message: 'Map not found' });
    }
    
    // Check if user has permission
    if (!req.user || map.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to modify this map' });
    }
    
    // Add the marker
    map.markers.push(markerData);
    const updatedMap = await map.save();
    
    // Return the newly created marker
    const newMarker = updatedMap.markers[updatedMap.markers.length - 1];
    res.status(201).json(newMarker);
  } catch (error) {
    res.status(500).json({ message: 'Error adding marker', error: error.message });
  }
};

// Update a marker
export const updateMarker = async (req, res) => {
  try {
    const { mapId, markerId } = req.params;
    const updates = req.body;
    
    const map = await MapData.findById(mapId);
    
    if (!map) {
      return res.status(404).json({ message: 'Map not found' });
    }
    
    // Check if user has permission
    if (!req.user || map.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to modify this map' });
    }
    
    // Find the marker to update
    const markerIndex = map.markers.findIndex(m => m._id.toString() === markerId);
    
    if (markerIndex === -1) {
      return res.status(404).json({ message: 'Marker not found' });
    }
    
    // Update marker fields
    Object.keys(updates).forEach(key => {
      if (key !== '_id' && key !== 'createdAt') {
        map.markers[markerIndex][key] = updates[key];
      }
    });
    
    map.markers[markerIndex].updatedAt = Date.now();
    
    const updatedMap = await map.save();
    res.status(200).json(updatedMap.markers[markerIndex]);
  } catch (error) {
    res.status(500).json({ message: 'Error updating marker', error: error.message });
  }
};

// Delete a marker
export const deleteMarker = async (req, res) => {
  try {
    const { mapId, markerId } = req.params;
    
    const map = await MapData.findById(mapId);
    
    if (!map) {
      return res.status(404).json({ message: 'Map not found' });
    }
    
    // Check if user has permission
    if (!req.user || map.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to modify this map' });
    }
    
    // Find and remove the marker
    const initialLength = map.markers.length;
    map.markers = map.markers.filter(m => m._id.toString() !== markerId);
    
    if (map.markers.length === initialLength) {
      return res.status(404).json({ message: 'Marker not found' });
    }
    
    await map.save();
    res.status(200).json({ message: 'Marker deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting marker', error: error.message });
  }
};