import express from 'express';
import {
  getAllLeaves,
  getEmployeeLeaves,
  getSupervisorLeaves,
  applyForLeave,
  updateLeaveStatus,
  getSupervisorEmployees,
  getLeaveStats
} from '../controllers/leaveController';
import Employee from '../models/Employee';

const router = express.Router();

// Test route to check employee data
router.get('/test/employees', async (req, res) => {
  try {
    const employees = await Employee.find().limit(5);
    res.json({
      count: employees.length,
      employees: employees.map(emp => ({
        id: emp._id,
        employeeId: emp.employeeId,
        name: emp.name,
        department: emp.department,
        phone: emp.phone,
        status: emp.status
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Public routes (no auth needed)
router.post('/apply', applyForLeave);
router.get('/employee/:employeeId', getEmployeeLeaves);
router.get('/supervisor', getSupervisorLeaves);
router.get('/supervisor/employees', getSupervisorEmployees);
router.get('/', getAllLeaves);
router.put('/:id/status', updateLeaveStatus);
router.get('/stats', getLeaveStats);

export default router;