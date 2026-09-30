import { Router } from 'express';
import {
  createCategoryHandler,
  deleteCategoryHandler,
  getAllCategoriesHandler,
  getCategoryByIdHandler,
  updateCategoryHandler,
} from '../controllers/categoryController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { createCategorySchema, updateCategorySchema } from '../validation/categorySchemas';

const router = Router();

router.get('/categories', authMiddleware, getAllCategoriesHandler);
router.get('/categories/:categoryId', authMiddleware, getCategoryByIdHandler);
router.post('/categories', authMiddleware, validate(createCategorySchema), createCategoryHandler);
router.put(
  '/categories/:categoryId',
  authMiddleware,
  validate(updateCategorySchema),
  updateCategoryHandler
);
router.delete('/categories/:categoryId', authMiddleware, deleteCategoryHandler);

export default router;
