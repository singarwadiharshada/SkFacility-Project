// In src/routes/payrollRoutes.ts
import express from 'express';
import * as payrollController from '../controllers/payrollController';

const router = express.Router();

router.get('/', payrollController.getAllPayroll);
router.get('/summary', payrollController.getPayrollSummary);
router.get('/:id', payrollController.getPayrollById);
router.get('/employee/:employeeId/month/:month', payrollController.getPayrollByEmployeeAndMonth);
router.post('/process', payrollController.processPayroll);
router.post('/bulk-process', payrollController.bulkProcessPayroll);
router.put('/:id/payment-status', payrollController.updatePaymentStatus); // This should be PUT
router.delete('/:id', payrollController.deletePayroll);
router.get('/export', payrollController.exportPayroll);

export default router;