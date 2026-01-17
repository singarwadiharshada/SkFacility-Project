import express from 'express';
import {
  getAllAlerts,
  getAlert,
  createAlert,
  updateAlert,
  updateAlertStatus,
  deleteAlert,
  getAlertStats
} from '../controllers/alertController';

const router = express.Router();

// Test endpoint
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Alerts API is working!',
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /api/alerts',
      'POST /api/alerts',
      'GET /api/alerts/:id',
      'PUT /api/alerts/:id',
      'PATCH /api/alerts/:id/status',
      'DELETE /api/alerts/:id',
      'GET /api/alerts/stats/overview'
    
 ] });
});

// CRUD routes
router.get('/', getAllAlerts);
router.get('/stats/overview', getAlertStats);
router.get('/:id', getAlert);
router.post('/', createAlert);
router.put('/:id', updateAlert);
router.patch('/:id/status', updateAlertStatus);
router.delete('/:id', deleteAlert);

export default router;
