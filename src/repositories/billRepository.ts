import { Recurrence } from '@prisma/client';
import { prisma } from '../config/prismaClient';
import { compact } from '../utils/queryParams';

const billInclude = {
  category: { select: { id: true, name: true, type: true } },
  responsible: { select: { id: true, firstName: true, lastName: true } },
} as const;

export type BillFilters = {
  isActive?: boolean | undefined;
  /** Bills due on or before this date (includes overdue ones). */
  dueTo?: Date | undefined;
  responsibleId?: number | undefined;
};

export async function findAllBills(
  householdId: number,
  filters: BillFilters,
  pagination: { skip: number; take: number }
) {
  const where = compact({
    householdId,
    isActive: filters.isActive,
    responsibleId: filters.responsibleId,
    nextDueDate: filters.dueTo ? { lte: filters.dueTo } : undefined,
  });
  const [data, total] = await Promise.all([
    prisma.bill.findMany({
      where,
      include: billInclude,
      orderBy: [{ isActive: 'desc' }, { nextDueDate: 'asc' }, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.bill.count({ where }),
  ]);
  return { data, total };
}

export async function findBillById(id: number) {
  return await prisma.bill.findUnique({ where: { id }, include: billInclude });
}

export async function createBill(data: {
  householdId: number;
  categoryId: number;
  responsibleId: number | null;
  name: string;
  amount: string;
  recurrence: Recurrence;
  nextDueDate: Date;
}) {
  return await prisma.bill.create({ data, include: billInclude });
}

export async function updateBill(
  id: number,
  data: Partial<{
    categoryId: number;
    responsibleId: number | null;
    name: string;
    amount: string;
    recurrence: Recurrence;
    nextDueDate: Date;
    isActive: boolean;
  }>
) {
  return await prisma.bill.update({ where: { id }, data, include: billInclude });
}

export async function removeBill(id: number) {
  return await prisma.bill.delete({ where: { id } });
}

/**
 * Records the payment as an expense and moves the bill to its next due date in one transaction.
 * Guarded on the due date it was read with, so a double click cannot pay the same period twice;
 * returns null when someone else paid it first.
 */
export async function payBill(params: {
  billId: number;
  expectedDueDate: Date;
  nextDueDate: Date | null;
  transaction: {
    householdId: number;
    categoryId: number;
    userId: number;
    amount: string;
    date: Date;
    note: string;
  };
}) {
  return await prisma.$transaction(async (tx) => {
    const now = new Date();
    const result = await tx.bill.updateMany({
      where: { id: params.billId, isActive: true, nextDueDate: params.expectedDueDate },
      data: params.nextDueDate
        ? { nextDueDate: params.nextDueDate, lastPaidAt: now }
        : { isActive: false, lastPaidAt: now },
    });
    if (result.count !== 1) {
      return null;
    }
    const transaction = await tx.transaction.create({
      data: params.transaction,
      include: {
        category: { select: { id: true, name: true, type: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    const bill = await tx.bill.findUniqueOrThrow({
      where: { id: params.billId },
      include: billInclude,
    });
    return { bill, transaction };
  });
}
