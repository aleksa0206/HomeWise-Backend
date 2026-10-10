import { Router } from 'express';
import {
  addItemHandler,
  clearCheckedHandler,
  createListHandler,
  deleteItemHandler,
  deleteListHandler,
  getAllListsHandler,
  getItemsHandler,
  getListByIdHandler,
  updateItemHandler,
  updateListHandler,
} from '../controllers/shoppingController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { createItemSchema, listSchema, updateItemSchema } from '../validation/shoppingSchemas';

const router = Router();

router.get('/shopping-lists', authMiddleware, getAllListsHandler);
router.post('/shopping-lists', authMiddleware, validate(listSchema), createListHandler);
router.get('/shopping-lists/:listId', authMiddleware, getListByIdHandler);
router.put('/shopping-lists/:listId', authMiddleware, validate(listSchema), updateListHandler);
router.delete('/shopping-lists/:listId', authMiddleware, deleteListHandler);
router.get('/shopping-lists/:listId/items', authMiddleware, getItemsHandler);
router.post(
  '/shopping-lists/:listId/items',
  authMiddleware,
  validate(createItemSchema),
  addItemHandler
);
router.post('/shopping-lists/:listId/clear-checked', authMiddleware, clearCheckedHandler);
router.put(
  '/shopping-items/:itemId',
  authMiddleware,
  validate(updateItemSchema),
  updateItemHandler
);
router.delete('/shopping-items/:itemId', authMiddleware, deleteItemHandler);

export default router;
