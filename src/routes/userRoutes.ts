import { Router } from 'express';
import {
  createUserHandler,
  getAllUsersHandler,
  getUserByIdHandler,
  updateUserHandler,
  deleteUserHandler,
} from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';
import { createUserSchema, updateUserSchema } from '../validation/userSchemas';

const router = Router();

router.get('/users', authMiddleware, getAllUsersHandler);
router.get('/users/:userId', authMiddleware, getUserByIdHandler);
router.post(
  '/users',
  authMiddleware,
  requireRole('Owner'),
  validate(createUserSchema),
  createUserHandler
);
router.put('/users/:userId', authMiddleware, validate(updateUserSchema), updateUserHandler);
router.delete('/users/:userId', authMiddleware, requireRole('Owner'), deleteUserHandler);

export default router;
