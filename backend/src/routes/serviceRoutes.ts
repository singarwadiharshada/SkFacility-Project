import express from 'express';
import {
  getAllServices,
  getServiceById,
  createService,
  updateServiceStatus,
  updateService,
  deleteService,
  getServiceStats,
  seedServices
} from '../controllers/serviceController';

const router = express.Router();

// All service routes
router.get('/', getAllServices);
router.get('/stats', getServiceStats);
router.get('/:id', getServiceById);
router.post('/', createService);
router.put('/:id', updateService);
router.patch('/:id/status', updateServiceStatus);
router.delete('/:id', deleteService);
router.post('/seed', seedServices); // Development only

export default router;