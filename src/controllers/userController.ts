import type { Request, Response, NextFunction } from 'express';
import * as userService from '../services/userService';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { parseOptionalEnumQuery, parseOptionalSearchQuery } from '../utils/queryParams';

const ROLES = ['Owner', 'Member'] as const;

export async function getAllUsersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req);
    const filters = {
      role: parseOptionalEnumQuery(req, 'role', ROLES),
      search: parseOptionalSearchQuery(req, 'search'),
    };
    const { data, total } = await userService.getAllUsers(
      req.user!.householdId,
      filters,
      pagination
    );
    res.json({ data, meta: buildPaginationMeta(total, pagination.page, pagination.limit) });
  } catch (err) {
    next(err);
  }
}

export async function getUserByIdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = Number(req.params.userId);
    res.json(await userService.getUserById(userId, req.user!.householdId));
  } catch (err) {
    next(err);
  }
}

export async function createUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { firstName, lastName, email, password, role } = req.body;
    const newUser = await userService.createUser(
      { firstName, lastName, email, password, role },
      req.user!
    );
    res.status(201).json(newUser);
  } catch (err) {
    next(err);
  }
}

export async function updateUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const targetUserId = Number(req.params.userId);
    const { firstName, lastName, email, role } = req.body;
    const updated = await userService.updateUser(
      targetUserId,
      { firstName, lastName, email, role },
      req.user!
    );
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const targetUserId = Number(req.params.userId);
    res.json(await userService.deleteUser(targetUserId, req.user!));
  } catch (err) {
    next(err);
  }
}
