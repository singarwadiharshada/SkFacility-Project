import express from 'express';
import {
  getLeads,
  createLead,
  bulkCreateLeads,
  updateLead,
  deleteLead,
  updateLeadStatus
} from '../controllers/leadController';

const router = express.Router();

router.route('/')
  .get(getLeads)
  .post(createLead);

router.route('/bulk')
  .post(bulkCreateLeads);

router.route('/:id')
  .put(updateLead)
  .delete(deleteLead);

router.route('/:id/status')
  .patch(updateLeadStatus);

export default router;