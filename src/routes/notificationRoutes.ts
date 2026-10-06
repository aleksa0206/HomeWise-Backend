import { Router } from 'express';
import {
  getAllNotificationsHandler,
  updateNotificationHandler,
  markAllReadHandler,
  deleteNotificationHandler,
} from '../controllers/notificationController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { updateNotificationSchema } from '../validation/notificationSchemas';

const router = Router();

router.get('/notifications', authMiddleware, getAllNotificationsHandler);
router.post('/notifications/read-all', authMiddleware, markAllReadHandler);
router.put(
  '/notifications/:notificationId',
  authMiddleware,
  validate(updateNotificationSchema),
  updateNotificationHandler
);
router.delete('/notifications/:notificationId', authMiddleware, deleteNotificationHandler);

export default router;
