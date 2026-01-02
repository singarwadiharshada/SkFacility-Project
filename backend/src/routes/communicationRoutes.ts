import express from 'express';
import {
  getCommunications,
  createCommunication,
  deleteCommunication
} from '../controllers/communicationController';

const router = express.Router();

router.route('/')
  .get(getCommunications)
  .post(createCommunication);

router.route('/:id')
  .delete(deleteCommunication);

export default router;