import express from 'express';
import {
  getClients,
  createClient,
  updateClient,
  deleteClient
} from '../controllers/clientController';

const router = express.Router();

router.route('/')
  .get(getClients)
  .post(createClient);

router.route('/:id')
  .put(updateClient)
  .delete(deleteClient);

export default router;