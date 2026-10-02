import type { Request, Response, NextFunction } from 'express';
import * as budgetService from '../services/budgetService';
import { ValidationError } from '../errors/ValidationError';

function requiredIntQuery(req: Request, name: string, min: number, max: number): number {
  const value = Number(req.query[name]);
  if (!Number.isInteger(value) || value < min || value > max) {
    const message = `must be an integer between ${min} and ${max}`;
    throw new ValidationError(`${name}: ${message}`, [{ path: name, message }]);
  }
  return value;
}

export async function getBudgetSummaryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const year = requiredIntQuery(req, 'year', 2000, 2100);
    const month = requiredIntQuery(req, 'month', 1, 12);
    res.json(await budgetService.getMonthSummary(req.user!.householdId, year, month));
  } catch (err) {
    next(err);
  }
}

export async function setBudgetHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { categoryId, year, month, amount } = req.body;
    const budget = await budgetService.setBudget({
      householdId: req.user!.householdId,
      categoryId,
      year,
      month,
      amount,
    });
    res.json(budget);
  } catch (err) {
    next(err);
  }
}

export async function deleteBudgetHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const budgetId = Number(req.params.budgetId);
    res.json(await budgetService.deleteBudget(budgetId, req.user!.householdId));
  } catch (err) {
    next(err);
  }
}
