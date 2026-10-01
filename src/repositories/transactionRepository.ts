import { CategoryType, Prisma } from '@prisma/client';
import { prisma } from '../config/prismaClient';
import { compact } from '../utils/queryParams';

const transactionInclude = {
  category: { select: { id: true, name: true, type: true } },
  user: { select: { id: true, firstName: true, lastName: true } },
} as const;

export type TransactionFilters = {
  from?: Date | undefined;
  to?: Date | undefined;
  categoryId?: number | undefined;
  userId?: number | undefined;
  type?: CategoryType | undefined;
};

export async function findAllTransactions(
  householdId: number,
  filters: TransactionFilters,
  pagination: { skip: number; take: number }
) {
  const where = compact({
    householdId,
    categoryId: filters.categoryId,
    userId: filters.userId,
    category: filters.type ? { type: filters.type } : undefined,
    date: filters.from || filters.to ? compact({ gte: filters.from, lte: filters.to }) : undefined,
  });
  const [data, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: transactionInclude,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.transaction.count({ where }),
  ]);
  return { data, total };
}

export async function findTransactionById(id: number) {
  return await prisma.transaction.findUnique({ where: { id }, include: transactionInclude });
}

export async function createTransaction(data: {
  householdId: number;
  categoryId: number;
  userId: number;
  amount: string;
  date: Date;
  note: string | null;
}) {
  return await prisma.transaction.create({ data, include: transactionInclude });
}

export async function updateTransaction(
  id: number,
  data: Partial<{
    categoryId: number;
    userId: number;
    amount: string;
    date: Date;
    note: string | null;
  }>
) {
  return await prisma.transaction.update({ where: { id }, data, include: transactionInclude });
}

export async function removeTransaction(id: number) {
  return await prisma.transaction.delete({ where: { id } });
}

/** Total per category for dates in [start, end). */
export async function sumByCategory(householdId: number, start: Date, end: Date) {
  const rows = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: { householdId, date: { gte: start, lt: end } },
    _sum: { amount: true },
    orderBy: { categoryId: 'asc' },
  });
  return new Map<number, Prisma.Decimal>(
    rows.map((row) => [row.categoryId, row._sum.amount ?? new Prisma.Decimal(0)])
  );
}
