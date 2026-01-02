import express from 'express';
import {
  getLeads,
  createLead,
  updateLead,
  deleteLead,
  updateLeadStatus
} from '../controllers/leadController';

const router = express.Router();

router.route('/')
  .get(getLeads)
  .post(createLead);

router.route('/:id')
  .put(updateLead)
  .delete(deleteLead);

router.route('/:id/status')
  .patch(updateLeadStatus);

export default router;