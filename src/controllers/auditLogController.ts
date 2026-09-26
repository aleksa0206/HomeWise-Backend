import type { Request, Response, NextFunction } from 'express';
import * as auditLogService from '../services/auditLogService';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';

export async function getAllAuditLogsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req);
    const { data, total } = await auditLogService.getAllAuditLogs(
      req.user!.householdId,
      pagination
    );
    res.json({ data, meta: buildPaginationMeta(total, pagination.page, pagination.limit) });
  } catch (err) {
    next(err);
  }
}
