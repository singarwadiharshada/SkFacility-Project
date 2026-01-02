import express from 'express';
import {
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  updateExpenseStatus,
  getExpenseStats,
  getExpenseSummary
} from '../controllers/expenseController';

const router = express.Router();

// All expense routes
router.get('/', getAllExpenses);
router.get('/stats', getExpenseStats);
router.get('/summary', getExpenseSummary);
router.get('/:id', getExpenseById);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.patch('/:id/status', updateExpenseStatus);
router.delete('/:id', deleteExpense);

export default router;