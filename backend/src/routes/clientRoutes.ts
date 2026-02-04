import express from 'express';
import {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  searchClients,
  toggleClientStatus,
  getClientStats,
  getCRMStats
} from '../controllers/clientController';

const router = express.Router();

// Important: Define specific routes BEFORE parameter routes
router.get('/', getAllClients);
router.get('/search', searchClients);
router.get('/stats', getClientStats);
router.get('/crm-stats', getCRMStats);  // Specific route before :id
router.get('/:id', getClientById);      // Parameter route comes last
router.post('/', createClient);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);
router.patch('/:id/toggle-status', toggleClientStatus);

export default router;