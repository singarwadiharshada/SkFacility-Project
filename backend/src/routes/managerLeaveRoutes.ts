// routes/managerLeaveRoutes.ts
import express from 'express';
import {
  applyManagerLeave,
  getManagerLeaves,
  getManagerLeaveStats,
  cancelManagerLeave,
  getAllManagerLeavesForSuperadmin,
  updateManagerLeaveStatus,
  //testManagerLeaves
} from '../controllers/managerLeaveController';

const router = express.Router();

// Test endpoint
//router.get('/test', testManagerLeaves);

// Manager routes (for managers themselves)
router.post('/apply', applyManagerLeave);
router.get('/', getManagerLeaves); // Gets only manager's own leaves
router.get('/stats', getManagerLeaveStats);
router.put('/:id/cancel', cancelManagerLeave);

// Superadmin routes (for managing manager leaves)
// Change from '/superadmin/all' to just '/superadmin' to match frontend
router.get('/superadmin', getAllManagerLeavesForSuperadmin); // Gets all manager leaves
router.put('/superadmin/:id/status', updateManagerLeaveStatus); // Approve/reject manager leaves

export default router;