import type { Request, Response, NextFunction } from 'express';
import * as choreService from '../services/choreService';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import {
  compact,
  parseOptionalBooleanQuery,
  parseOptionalDateQuery,
  parseOptionalEnumQuery,
  parseOptionalIdQuery,
} from '../utils/queryParams';

const CHORE_STATUSES = ['Open', 'Done'] as const;

export async function getAllChoresHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req);
    const filters = {
      status: parseOptionalEnumQuery(req, 'status', CHORE_STATUSES),
      assigneeId: parseOptionalIdQuery(req, 'assigneeId'),
      unassigned: parseOptionalBooleanQuery(req, 'unassigned'),
      dueFrom: parseOptionalDateQuery(req, 'dueFrom'),
      dueTo: parseOptionalDateQuery(req, 'dueTo'),
    };
    const { data, total } = await choreService.getAllChores(
      req.user!.householdId,
      filters,
      pagination
    );
    res.json({ data, meta: buildPaginationMeta(total, pagination.page, pagination.limit) });
  } catch (err) {
    next(err);
  }
}

export async function getChoreByIdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const choreId = Number(req.params.choreId);
    res.json(await choreService.getChoreById(choreId, req.user!.householdId));
  } catch (err) {
    next(err);
  }
}

export async function createChoreHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, description, dueDate, recurrence, priority, assigneeId } = req.body;
    const chore = await choreService.createChore(
      { title, description, dueDate, recurrence, priority, assigneeId },
      req.user!
    );
    res.status(201).json(chore);
  } catch (err) {
    next(err);
  }
}

export async function updateChoreHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const choreId = Number(req.params.choreId);
    const { title, description, dueDate, recurrence, priority, assigneeId } = req.body;
    const chore = await choreService.updateChore(
      choreId,
      compact({ title, description, dueDate, recurrence, priority, assigneeId }),
      req.user!
    );
    res.json(chore);
  } catch (err) {
    next(err);
  }
}

export async function claimChoreHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await choreService.claimChore(Number(req.params.choreId), req.user!));
  } catch (err) {
    next(err);
  }
}

export async function completeChoreHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await choreService.completeChore(Number(req.params.choreId), req.user!));
  } catch (err) {
    next(err);
  }
}

export async function reopenChoreHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await choreService.reopenChore(Number(req.params.choreId), req.user!));
  } catch (err) {
    next(err);
  }
}

export async function deleteChoreHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await choreService.deleteChore(Number(req.params.choreId), req.user!));
  } catch (err) {
    next(err);
  }
}
