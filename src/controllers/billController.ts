import type { Request, Response, NextFunction } from 'express';
import * as billService from '../services/billService';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import {
  compact,
  parseOptionalBooleanQuery,
  parseOptionalDateQuery,
  parseOptionalIdQuery,
} from '../utils/queryParams';

export async function getAllBillsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req);
    const filters = {
      isActive: parseOptionalBooleanQuery(req, 'isActive'),
      dueTo: parseOptionalDateQuery(req, 'dueTo'),
      responsibleId: parseOptionalIdQuery(req, 'responsibleId'),
    };
    const { data, total } = await billService.getAllBills(
      req.user!.householdId,
      filters,
      pagination
    );
    res.json({ data, meta: buildPaginationMeta(total, pagination.page, pagination.limit) });
  } catch (err) {
    next(err);
  }
}

export async function getBillByIdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await billService.getBillById(Number(req.params.billId), req.user!.householdId));
  } catch (err) {
    next(err);
  }
}

export async function createBillHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, amount, categoryId, recurrence, nextDueDate, responsibleId } = req.body;
    const bill = await billService.createBill(
      { name, amount, categoryId, recurrence, nextDueDate, responsibleId },
      req.user!
    );
    res.status(201).json(bill);
  } catch (err) {
    next(err);
  }
}

export async function updateBillHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, amount, categoryId, recurrence, nextDueDate, responsibleId, isActive } = req.body;
    const bill = await billService.updateBill(
      Number(req.params.billId),
      compact({ name, amount, categoryId, recurrence, nextDueDate, responsibleId, isActive }),
      req.user!
    );
    res.json(bill);
  } catch (err) {
    next(err);
  }
}

export async function payBillHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { amount, date } = req.body;
    res.json(await billService.payBill(Number(req.params.billId), { amount, date }, req.user!));
  } catch (err) {
    next(err);
  }
}

export async function deleteBillHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await billService.deleteBill(Number(req.params.billId), req.user!.householdId));
  } catch (err) {
    next(err);
  }
}
