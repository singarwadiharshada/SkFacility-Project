import express from 'express';
import {
  healthCheck,
  checkIn,
  checkOut,
  breakIn,
  breakOut,
  getTodayStatus,
  getAttendanceHistory,
  addActivity,
  getMonthSummary,
  cleanupDuplicates
} from '../controllers/managerAttendanceController';

const router = express.Router();

// Health check
router.get('/health', healthCheck);

// Attendance actions
router.post('/checkin', checkIn);
router.post('/checkout', checkOut);
router.post('/breakin', breakIn);
router.post('/breakout', breakOut);

// Get attendance data
router.get('/today/:managerId', getTodayStatus);
router.get('/history/:managerId', getAttendanceHistory);
router.get('/summary/:managerId', getMonthSummary);

// Activity logging
router.post('/activity', addActivity);

// Admin cleanup (one-time use)
router.post('/cleanup', cleanupDuplicates);

export default router;