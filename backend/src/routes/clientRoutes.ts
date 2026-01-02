import express from 'express';
import {
<<<<<<< HEAD
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  searchClients,
  toggleClientStatus,
  getClientStats
=======
  getClients,
  createClient,
  updateClient,
  deleteClient
>>>>>>> 336fef579984e7f10a494ef8fec2b86fa7a775b2
} from '../controllers/clientController';

const router = express.Router();

<<<<<<< HEAD
// Client routes
router.get('/', getAllClients);
router.get('/search', searchClients);
router.get('/stats', getClientStats);
router.get('/:id', getClientById);
router.post('/', createClient);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);
router.patch('/:id/toggle-status', toggleClientStatus);
=======
router.route('/')
  .get(getClients)
  .post(createClient);

router.route('/:id')
  .put(updateClient)
  .delete(deleteClient);
>>>>>>> 336fef579984e7f10a494ef8fec2b86fa7a775b2

export default router;