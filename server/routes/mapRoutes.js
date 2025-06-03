import express from 'express';
import { 
  getMaps, 
  getMapById, 
  createMap, 
  updateMap, 
  deleteMap,
  addFeature,
  getElevation,
  getMarkers,
  addMarker,
  updateMarker,
  deleteMarker
} from '../controllers/mapController.js';
import auth from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/maps', getMaps);
router.get('/maps/:id', getMapById);
router.get('/elevation', getElevation);

// Protected routes (require authentication)
router.post('/maps', auth.auth, createMap);
router.put('/maps/:id', auth.auth, updateMap);
router.delete('/maps/:id', auth.auth, deleteMap);
router.post('/maps/:id/features', auth.auth, addFeature);

// Marker routes
router.get('/maps/:mapId/markers', getMarkers);
router.post('/maps/:mapId/markers', auth.auth, addMarker);
router.put('/maps/:mapId/markers/:markerId', auth.auth, updateMarker);
router.delete('/maps/:mapId/markers/:markerId', auth.auth, deleteMarker);

export default router;