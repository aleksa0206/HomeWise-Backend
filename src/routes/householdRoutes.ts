import { Router } from 'express';
import {
  getMyHouseholdHandler,
  updateMyHouseholdHandler,
} from '../controllers/householdController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';
import { updateHouseholdSchema } from '../validation/householdSchemas';

const router = Router();

router.get('/households/me', authMiddleware, getMyHouseholdHandler);
router.put(
  '/households/me',
  authMiddleware,
  requireRole('Owner'),
  validate(updateHouseholdSchema),
  updateMyHouseholdHandler
);

export default router;
