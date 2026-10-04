import { Router } from 'express';
import {
  claimChoreHandler,
  completeChoreHandler,
  createChoreHandler,
  deleteChoreHandler,
  getAllChoresHandler,
  getChoreByIdHandler,
  reopenChoreHandler,
  updateChoreHandler,
} from '../controllers/choreController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { createChoreSchema, updateChoreSchema } from '../validation/choreSchemas';

const router = Router();

router.get('/chores', authMiddleware, getAllChoresHandler);
router.get('/chores/:choreId', authMiddleware, getChoreByIdHandler);
router.post('/chores', authMiddleware, validate(createChoreSchema), createChoreHandler);
router.put('/chores/:choreId', authMiddleware, validate(updateChoreSchema), updateChoreHandler);
router.post('/chores/:choreId/claim', authMiddleware, claimChoreHandler);
router.post('/chores/:choreId/complete', authMiddleware, completeChoreHandler);
router.post('/chores/:choreId/reopen', authMiddleware, reopenChoreHandler);
router.delete('/chores/:choreId', authMiddleware, deleteChoreHandler);

export default router;
