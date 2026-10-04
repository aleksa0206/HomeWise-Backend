import { ChoreStatus, Priority, Recurrence } from '@prisma/client';
import { prisma } from '../config/prismaClient';
import { compact } from '../utils/queryParams';

const person = { select: { id: true, firstName: true, lastName: true } } as const;
const choreInclude = {
  createdBy: person,
  assignee: person,
  completedBy: person,
  _count: { select: { comments: true } },
} as const;

export type ChoreFilters = {
  status?: ChoreStatus | undefined;
  assigneeId?: number | undefined;
  unassigned?: boolean | undefined;
  dueFrom?: Date | undefined;
  dueTo?: Date | undefined;
};

export async function findAllChores(
  householdId: number,
  filters: ChoreFilters,
  pagination: { skip: number; take: number }
) {
  const where = compact({
    householdId,
    status: filters.status,
    assigneeId: filters.unassigned ? null : filters.assigneeId,
    dueDate:
      filters.dueFrom || filters.dueTo
        ? compact({ gte: filters.dueFrom, lte: filters.dueTo })
        : undefined,
  });
  const [data, total] = await Promise.all([
    prisma.chore.findMany({
      where,
      include: choreInclude,
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.chore.count({ where }),
  ]);
  return { data, total };
}

export async function findChoreById(id: number) {
  return await prisma.chore.findUnique({ where: { id }, include: choreInclude });
}

export type NewChore = {
  householdId: number;
  createdById: number;
  assigneeId: number | null;
  title: string;
  description: string | null;
  dueDate: Date | null;
  recurrence: Recurrence;
  priority: Priority;
};

export async function createChore(data: NewChore) {
  return await prisma.chore.create({ data, include: choreInclude });
}

export async function updateChore(
  id: number,
  data: Partial<{
    title: string;
    description: string | null;
    dueDate: Date | null;
    recurrence: Recurrence;
    priority: Priority;
    assigneeId: number | null;
  }>
) {
  return await prisma.chore.update({ where: { id }, data, include: choreInclude });
}

/** Guarded on the row still being open and unassigned, so two people cannot both claim it. */
export async function claimIfUnassigned(id: number, userId: number): Promise<boolean> {
  const result = await prisma.chore.updateMany({
    where: { id, status: 'Open', assigneeId: null },
    data: { assigneeId: userId },
  });
  return result.count === 1;
}

/**
 * Marks the chore done and, for a recurring one, creates the next occurrence in the same
 * transaction. Returns null when the chore was no longer open (a concurrent completion won).
 */
export async function completeChore(id: number, completedById: number, next: NewChore | null) {
  return await prisma.$transaction(async (tx) => {
    const result = await tx.chore.updateMany({
      where: { id, status: 'Open' },
      data: { status: 'Done', completedAt: new Date(), completedById },
    });
    if (result.count !== 1) {
      return null;
    }
    const nextChore = next ? await tx.chore.create({ data: next, include: choreInclude }) : null;
    const chore = await tx.chore.findUniqueOrThrow({ where: { id }, include: choreInclude });
    return { chore, nextChore };
  });
}

export async function reopenChore(id: number) {
  return await prisma.chore.update({
    where: { id },
    data: { status: 'Open', completedAt: null, completedById: null },
    include: choreInclude,
  });
}

// Comments only exist for their chore, so they go with it.
export async function removeChoreWithComments(id: number) {
  return await prisma.$transaction(async (tx) => {
    await tx.comment.deleteMany({ where: { choreId: id } });
    return await tx.chore.delete({ where: { id } });
  });
}
