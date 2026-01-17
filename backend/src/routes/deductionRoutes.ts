import express from 'express';
import deductionController from '../controllers/deductionController';

const router = express.Router();

router.get('/health', (req, res) => res.status(200).json({ status: 'OK' }));

// Deduction CRUD routes
router.get('/deductions', deductionController.getAllDeductions);
router.get('/deductions/stats', deductionController.getDeductionStats);
router.get('/deductions/:id', deductionController.getDeductionById);
router.post('/deductions', deductionController.createDeduction);
router.put('/deductions/:id', deductionController.updateDeduction);
router.delete('/deductions/:id', deductionController.deleteDeduction);

// Employee related routes
router.get('/employees/active', deductionController.getActiveEmployees);
router.get('/employees/:employeeId/deductions', deductionController.getDeductionsByEmployee);

// Monthly reports
router.get('/deductions/month/:year/:month', deductionController.getDeductionsByMonth);

export default router;