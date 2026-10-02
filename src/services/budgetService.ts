import { Prisma } from '@prisma/client';
import * as budgetRepository from '../repositories/budgetRepository';
import * as categoryRepository from '../repositories/categoryRepository';
import * as transactionRepository from '../repositories/transactionRepository';
import * as categoryService from './categoryService';
import { NotFoundError } from '../errors/NotFoundError';
import { ForbiddenError } from '../errors/ForbiddenError';
import { monthRange } from '../utils/dates';

const ZERO = new Prisma.Decimal(0);

// Planned vs. actual for every category in the month, plus income/expense totals.
export async function getMonthSummary(householdId: number, year: number, month: number) {
  const { start, end } = monthRange(year, month);
  const [categories, budgets, actuals] = await Promise.all([
    // ponytail: one page of 1000 categories, page through if a household ever has more
    categoryRepository.findAllCategories(householdId, {}, { skip: 0, take: 1000 }),
    budgetRepository.findBudgetsForMonth(householdId, year, month),
    transactionRepository.sumByCategory(householdId, start, end),
  ]);
  const budgetByCategory = new Map(budgets.map((budget) => [budget.categoryId, budget]));

  const totals = {
    Income: { planned: ZERO, actual: ZERO },
    Expense: { planned: ZERO, actual: ZERO },
  };
  const rows = categories.data.map((category) => {
    const budget = budgetByCategory.get(category.id);
    const planned = budget?.amount ?? ZERO;
    const actual = actuals.get(category.id) ?? ZERO;
    totals[category.type].planned = totals[category.type].planned.add(planned);
    totals[category.type].actual = totals[category.type].actual.add(actual);
    return {
      categoryId: category.id,
      name: category.name,
      type: category.type,
      budgetId: budget?.id ?? null,
      planned: planned.toFixed(2),
      actual: actual.toFixed(2),
    };
  });

  const format = (pair: { planned: Prisma.Decimal; actual: Prisma.Decimal }) => ({
    planned: pair.planned.toFixed(2),
    actual: pair.actual.toFixed(2),
  });

  return {
    year,
    month,
    income: format(totals.Income),
    expense: format(totals.Expense),
    balance: totals.Income.actual.sub(totals.Expense.actual).toFixed(2),
    categories: rows,
  };
}

export async function setBudget(data: {
  householdId: number;
  categoryId: number;
  year: number;
  month: number;
  amount: string;
}) {
  await categoryService.getCategoryById(data.categoryId, data.householdId);
  return await budgetRepository.upsertBudget(data);
}

export async function deleteBudget(budgetId: number, householdId: number) {
  const budget = await budgetRepository.findBudgetById(budgetId);
  if (!budget) {
    throw new NotFoundError('Budget');
  }
  if (budget.householdId !== householdId) {
    throw new ForbiddenError();
  }
  return await budgetRepository.removeBudget(budgetId);
}
