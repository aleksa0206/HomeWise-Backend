import { Budget } from '@prisma/client';
import { prisma } from '../config/prismaClient';

export async function findBudgetsForMonth(householdId: number, year: number, month: number) {
  return await prisma.budget.findMany({
    where: { householdId, year, month },
    orderBy: { categoryId: 'asc' },
  });
}

export async function findBudgetById(id: number): Promise<Budget | null> {
  return await prisma.budget.findUnique({ where: { id } });
}

export async function upsertBudget(data: {
  householdId: number;
  categoryId: number;
  year: number;
  month: number;
  amount: string;
}): Promise<Budget> {
  return await prisma.budget.upsert({
    where: {
      categoryId_year_month: { categoryId: data.categoryId, year: data.year, month: data.month },
    },
    create: data,
    update: { amount: data.amount },
  });
}

export async function removeBudget(id: number): Promise<Budget> {
  return await prisma.budget.delete({ where: { id } });
}
