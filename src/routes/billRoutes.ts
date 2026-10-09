import { Router } from 'express';
import {
  createBillHandler,
  deleteBillHandler,
  getAllBillsHandler,
  getBillByIdHandler,
  payBillHandler,
  updateBillHandler,
} from '../controllers/billController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { createBillSchema, payBillSchema, updateBillSchema } from '../validation/billSchemas';

const router = Router();

router.get('/bills', authMiddleware, getAllBillsHandler);
router.get('/bills/:billId', authMiddleware, getBillByIdHandler);
router.post('/bills', authMiddleware, validate(createBillSchema), createBillHandler);
router.put('/bills/:billId', authMiddleware, validate(updateBillSchema), updateBillHandler);
router.post('/bills/:billId/pay', authMiddleware, validate(payBillSchema), payBillHandler);
router.delete('/bills/:billId', authMiddleware, deleteBillHandler);

export default router;
