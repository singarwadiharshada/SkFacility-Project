// routes/serviceRoutes.ts
import express from 'express';
import {
  getAllServices,
  createService,
  updateServiceStatus,
  updateServiceVisibility,
  deleteService,
  getServiceById,
  getServicesByCreatorRole,
  getSharedServices
} from '../controllers/serviceController';

const router = express.Router();

router.get('/', getAllServices);
router.get('/shared', getSharedServices);
router.get('/by-role', getServicesByCreatorRole);
router.get('/:id', getServiceById);
router.post('/', createService);
router.patch('/:id/status', updateServiceStatus);
router.patch('/:id/visibility', updateServiceVisibility);
router.delete('/:id', deleteService);

export default router;