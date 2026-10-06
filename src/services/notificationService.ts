import * as notificationRepository from '../repositories/notificationRepository';
import { NotFoundError } from '../errors/NotFoundError';
import { ForbiddenError } from '../errors/ForbiddenError';

export async function getAllNotifications(
  userId: number,
  filters: { isRead?: boolean | undefined },
  pagination: { skip: number; take: number }
) {
  return await notificationRepository.findAllNotifications(userId, filters, pagination);
}

async function getOwnNotification(notificationId: number, userId: number) {
  const notification = await notificationRepository.findNotificationById(notificationId);
  if (!notification) {
    throw new NotFoundError('Notification');
  }
  if (notification.userId !== userId) {
    throw new ForbiddenError();
  }
  return notification;
}

export async function updateNotification(
  notificationId: number,
  userId: number,
  data: { isRead?: boolean }
) {
  await getOwnNotification(notificationId, userId);
  return await notificationRepository.updateNotification(notificationId, data);
}

export async function markAllRead(userId: number) {
  const { count } = await notificationRepository.markAllRead(userId);
  return { updated: count };
}

export async function deleteNotification(notificationId: number, userId: number) {
  await getOwnNotification(notificationId, userId);
  return await notificationRepository.removeNotification(notificationId);
}
