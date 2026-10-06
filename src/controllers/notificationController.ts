import type { Request, Response, NextFunction } from 'express';
import * as notificationService from '../services/notificationService';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { parseOptionalBooleanQuery } from '../utils/queryParams';

export async function getAllNotificationsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req);
    const { data, total } = await notificationService.getAllNotifications(
      req.user!.userId,
      { isRead: parseOptionalBooleanQuery(req, 'isRead') },
      pagination
    );
    res.json({ data, meta: buildPaginationMeta(total, pagination.page, pagination.limit) });
  } catch (err) {
    next(err);
  }
}

export async function updateNotificationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const notificationId = Number(req.params.notificationId);
    const { isRead } = req.body;
    res.json(
      await notificationService.updateNotification(notificationId, req.user!.userId, { isRead })
    );
  } catch (err) {
    next(err);
  }
}

export async function markAllReadHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await notificationService.markAllRead(req.user!.userId));
  } catch (err) {
    next(err);
  }
}

export async function deleteNotificationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const notificationId = Number(req.params.notificationId);
    res.json(await notificationService.deleteNotification(notificationId, req.user!.userId));
  } catch (err) {
    next(err);
  }
}
