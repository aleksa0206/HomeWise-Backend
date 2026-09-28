import bcrypt from 'bcrypt';
import { prisma } from '../../src/config/prismaClient';

export async function createTestHousehold(name = 'Test Household') {
  return await prisma.household.create({ data: { name } });
}

export async function createTestUser(params: {
  householdId: number;
  email?: string;
  password?: string;
  role?: 'Owner' | 'Member';
  firstName?: string;
}) {
  const password = params.password ?? 'password123';
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      firstName: params.firstName ?? 'Test',
      lastName: 'User',
      email: params.email ?? `user${Date.now()}${Math.random()}@test.com`,
      passwordHash,
      role: params.role ?? 'Member',
      householdId: params.householdId,
    },
  });

  return { user, rawPassword: password };
}

export async function createTestCategory(
  householdId: number,
  overrides: Partial<{ name: string; type: 'Income' | 'Expense' }> = {}
) {
  return await prisma.category.create({
    data: {
      name: overrides.name ?? `Category ${Math.random()}`,
      type: overrides.type ?? 'Expense',
      householdId,
    },
  });
}

export async function createTestTransaction(params: {
  householdId: number;
  categoryId: number;
  userId: number;
  amount?: string;
  date?: Date;
}) {
  return await prisma.transaction.create({
    data: {
      householdId: params.householdId,
      categoryId: params.categoryId,
      userId: params.userId,
      amount: params.amount ?? '100.00',
      date: params.date ?? new Date('2026-10-10'),
    },
  });
}

export async function createTestChore(params: {
  householdId: number;
  createdById: number;
  assigneeId?: number | null;
  title?: string;
  status?: 'Open' | 'Done';
  recurrence?: 'None' | 'Daily' | 'Weekly' | 'Monthly';
  dueDate?: Date | null;
}) {
  return await prisma.chore.create({
    data: {
      householdId: params.householdId,
      createdById: params.createdById,
      assigneeId: params.assigneeId ?? null,
      title: params.title ?? 'Take out the trash',
      status: params.status ?? 'Open',
      recurrence: params.recurrence ?? 'None',
      dueDate: params.dueDate ?? null,
    },
  });
}

export async function createTestComment(params: {
  choreId: number;
  authorId: number;
  householdId: number;
  text?: string;
}) {
  return await prisma.comment.create({
    data: {
      choreId: params.choreId,
      authorId: params.authorId,
      householdId: params.householdId,
      text: params.text ?? 'Test comment',
    },
  });
}

export async function createTestNotification(params: {
  userId: number;
  message?: string;
  isRead?: boolean;
  type?: 'ChoreAssigned' | 'ChoreCompleted' | 'ChoreCommented' | 'General';
}) {
  return await prisma.notification.create({
    data: {
      userId: params.userId,
      message: params.message ?? 'Test notification',
      isRead: params.isRead ?? false,
      type: params.type ?? 'General',
    },
  });
}
