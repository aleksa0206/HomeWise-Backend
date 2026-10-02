import { Router } from 'express';
import {
  deleteBudgetHandler,
  getBudgetSummaryHandler,
  setBudgetHandler,
} from '../controllers/budgetController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { setBudgetSchema } from '../validation/budgetSchemas';

const router = Router();

router.get('/budgets/summary', authMiddleware, getBudgetSummaryHandler);
// Upsert: one planned amount per category and month.
router.put('/budgets', authMiddleware, validate(setBudgetSchema), setBudgetHandler);
router.delete('/budgets/:budgetId', authMiddleware, deleteBudgetHandler);

export default router;
