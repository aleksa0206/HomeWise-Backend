import type { Request, Response, NextFunction } from 'express';
import * as transactionService from '../services/transactionService';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import {
  compact,
  parseOptionalDateQuery,
  parseOptionalEnumQuery,
  parseOptionalIdQuery,
} from '../utils/queryParams';

const CATEGORY_TYPES = ['Income', 'Expense'] as const;

export async function getAllTransactionsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req);
    const filters = {
      from: parseOptionalDateQuery(req, 'from'),
      to: parseOptionalDateQuery(req, 'to'),
      categoryId: parseOptionalIdQuery(req, 'categoryId'),
      userId: parseOptionalIdQuery(req, 'userId'),
      type: parseOptionalEnumQuery(req, 'type', CATEGORY_TYPES),
    };
    const { data, total } = await transactionService.getAllTransactions(
      req.user!.householdId,
      filters,
      pagination
    );
    res.json({ data, meta: buildPaginationMeta(total, pagination.page, pagination.limit) });
  } catch (err) {
    next(err);
  }
}

export async function getTransactionByIdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const transactionId = Number(req.params.transactionId);
    res.json(await transactionService.getTransactionById(transactionId, req.user!.householdId));
  } catch (err) {
    next(err);
  }
}

export async function createTransactionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { categoryId, amount, date, note, userId } = req.body;
    const transaction = await transactionService.createTransaction(
      { categoryId, amount, date, note, userId },
      req.user!
    );
    res.status(201).json(transaction);
  } catch (err) {
    next(err);
  }
}

export async function updateTransactionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const transactionId = Number(req.params.transactionId);
    const { categoryId, amount, date, note, userId } = req.body;
    const transaction = await transactionService.updateTransaction(
      transactionId,
      compact({ categoryId, amount, date, note, userId }),
      req.user!
    );
    res.json(transaction);
  } catch (err) {
    next(err);
  }
}

export async function deleteTransactionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const transactionId = Number(req.params.transactionId);
    res.json(await transactionService.deleteTransaction(transactionId, req.user!));
  } catch (err) {
    next(err);
  }
}
