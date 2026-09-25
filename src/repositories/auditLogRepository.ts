import { AuditLog } from '@prisma/client';
import { prisma } from '../config/prismaClient';

export async function findAllAuditLogs(
  householdId: number,
  pagination: { skip: number; take: number }
) {
  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { householdId },
      include: { performedBy: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.auditLog.count({ where: { householdId } }),
  ]);
  return { data, total };
}

export async function createAuditLog(data: {
  entityType: string;
  entityId: number;
  action: string;
  performedById: number;
  householdId: number;
  oldValue?: string;
  newValue?: string;
}): Promise<AuditLog> {
  return await prisma.auditLog.create({ data });
}
