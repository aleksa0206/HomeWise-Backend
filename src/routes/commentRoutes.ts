import { Router } from 'express';
import {
  getAllCommentsHandler,
  createCommentHandler,
  updateCommentHandler,
  deleteCommentHandler,
} from '../controllers/commentController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { commentSchema } from '../validation/commentSchemas';

const router = Router();

router.get('/chores/:choreId/comments', authMiddleware, getAllCommentsHandler);
router.post(
  '/chores/:choreId/comments',
  authMiddleware,
  validate(commentSchema),
  createCommentHandler
);
router.put('/comments/:commentId', authMiddleware, validate(commentSchema), updateCommentHandler);
router.delete('/comments/:commentId', authMiddleware, deleteCommentHandler);

export default router;
