import express from 'express';
import {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  searchClients,
  toggleClientStatus,
  getClientStats
} from '../controllers/clientController';

const router = express.Router();

// Client routes
router.get('/', getAllClients);
router.get('/search', searchClients);
router.get('/stats', getClientStats);
router.get('/:id', getClientById);
router.post('/', createClient);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);
router.patch('/:id/toggle-status', toggleClientStatus);

export default router;