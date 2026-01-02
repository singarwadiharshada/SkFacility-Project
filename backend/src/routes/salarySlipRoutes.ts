import express from 'express';
import * as salarySlipController from '../controllers/salarySlipController';

const router = express.Router();

router.post('/', salarySlipController.generateSalarySlip);
router.get('/', salarySlipController.getAllSalarySlips);
router.get('/:id', salarySlipController.getSalarySlipById);
router.get('/employee/:employeeId/month/:month', salarySlipController.getSalarySlipByEmployeeAndMonth);
router.put('/:id', salarySlipController.updateSalarySlip);
router.delete('/:id', salarySlipController.deleteSalarySlip);
router.patch('/:id/email', salarySlipController.markAsEmailed);

export default router;