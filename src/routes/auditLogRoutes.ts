import { Router } from 'express';
import { getAllAuditLogsHandler } from '../controllers/auditLogController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.get('/audit-logs', authMiddleware, requireRole('Owner'), getAllAuditLogsHandler);

export default router;
