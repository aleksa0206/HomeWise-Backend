import type { Request, Response, NextFunction } from 'express';
import * as householdService from '../services/householdService';

export async function getMyHouseholdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await householdService.getOwnHousehold(req.user!.householdId));
  } catch (err) {
    next(err);
  }
}

export async function updateMyHouseholdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, currency } = req.body;
    const household = await householdService.updateOwnHousehold(
      req.user!.householdId,
      { name, currency },
      req.user!.userId
    );
    res.json(household);
  } catch (err) {
    next(err);
  }
}
