import { Household } from '@prisma/client';
import { prisma } from '../config/prismaClient';
import * as userRepository from './userRepository';

// Every new household starts with these so the budget is usable right away.
const DEFAULT_CATEGORIES = [
  { name: 'Salary', type: 'Income' },
  { name: 'Other income', type: 'Income' },
  { name: 'Groceries', type: 'Expense' },
  { name: 'Bills', type: 'Expense' },
  { name: 'Transport', type: 'Expense' },
  { name: 'Health', type: 'Expense' },
  { name: 'Entertainment', type: 'Expense' },
  { name: 'Other', type: 'Expense' },
] as const;

export async function createHouseholdWithOwner(data: {
  householdName: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
}) {
  return await prisma.$transaction(async (tx) => {
    const household = await tx.household.create({ data: { name: data.householdName } });
    await tx.category.createMany({
      data: DEFAULT_CATEGORIES.map((category) => ({ ...category, householdId: household.id })),
    });
    return await userRepository.create(
      {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        passwordHash: data.passwordHash,
        role: 'Owner',
        householdId: household.id,
      },
      tx
    );
  });
}

export async function findHouseholdById(id: number): Promise<Household | null> {
  return await prisma.household.findUnique({ where: { id } });
}

export async function updateHousehold(
  id: number,
  data: { name?: string; currency?: string }
): Promise<Household> {
  return await prisma.household.update({ where: { id }, data });
}
