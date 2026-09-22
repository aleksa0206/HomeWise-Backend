import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../errors/ForbiddenError';

type Role = 'Owner' | 'Member';

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role as Role)) {
      return next(new ForbiddenError('Insufficient permissions for this action'));
    }
    next();
  };
}
