import { Notification, NotificationType } from '@prisma/client';
import { prisma } from '../config/prismaClient';
import { compact } from '../utils/queryParams';
import { Prisma } from '@prisma/client';

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

export async function findAllNotifications(
  userId: number,
  filters: { isRead?: boolean | undefined },
  pagination: { skip: number; take: number }
) {
  const where = compact({ userId, isRead: filters.isRead });
  const [data, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.notification.count({ where }),
  ]);
  return { data, total };
}

export async function findNotificationById(notificationId: number): Promise<Notification | null> {
  return await prisma.notification.findUnique({ where: { id: notificationId } });
}

export async function createNotification(
  data: { userId: number; message: string; type: NotificationType },
  client: PrismaClientOrTx = prisma
): Promise<Notification> {
  return await client.notification.create({ data });
}

export async function updateNotification(
  notificationId: number,
  data: { isRead?: boolean }
): Promise<Notification> {
  return await prisma.notification.update({ where: { id: notificationId }, data });
}

export async function markAllRead(userId: number) {
  return await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function removeNotification(notificationId: number): Promise<Notification> {
  return await prisma.notification.delete({ where: { id: notificationId } });
}
