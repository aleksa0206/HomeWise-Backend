import { Router } from 'express';
import {
  createTransactionHandler,
  deleteTransactionHandler,
  getAllTransactionsHandler,
  getTransactionByIdHandler,
  updateTransactionHandler,
} from '../controllers/transactionController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { createTransactionSchema, updateTransactionSchema } from '../validation/transactionSchemas';

const router = Router();

router.get('/transactions', authMiddleware, getAllTransactionsHandler);
router.get('/transactions/:transactionId', authMiddleware, getTransactionByIdHandler);
router.post(
  '/transactions',
  authMiddleware,
  validate(createTransactionSchema),
  createTransactionHandler
);
router.put(
  '/transactions/:transactionId',
  authMiddleware,
  validate(updateTransactionSchema),
  updateTransactionHandler
);
router.delete('/transactions/:transactionId', authMiddleware, deleteTransactionHandler);

export default router;
