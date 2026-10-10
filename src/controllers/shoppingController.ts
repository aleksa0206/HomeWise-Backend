import type { Request, Response, NextFunction } from 'express';
import * as shoppingService from '../services/shoppingService';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { compact } from '../utils/queryParams';

export async function getAllListsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req);
    const { data, total } = await shoppingService.getAllLists(req.user!.householdId, pagination);
    res.json({ data, meta: buildPaginationMeta(total, pagination.page, pagination.limit) });
  } catch (err) {
    next(err);
  }
}

export async function getListByIdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await shoppingService.getListById(Number(req.params.listId), req.user!.householdId));
  } catch (err) {
    next(err);
  }
}

export async function createListHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await shoppingService.createList(req.body.name, req.user!));
  } catch (err) {
    next(err);
  }
}

export async function updateListHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const list = await shoppingService.updateList(
      Number(req.params.listId),
      { name: req.body.name },
      req.user!.householdId
    );
    res.json(list);
  } catch (err) {
    next(err);
  }
}

export async function deleteListHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await shoppingService.deleteList(Number(req.params.listId), req.user!));
  } catch (err) {
    next(err);
  }
}

export async function getItemsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req);
    const { data, total } = await shoppingService.getItems(
      Number(req.params.listId),
      req.user!.householdId,
      pagination
    );
    res.json({ data, meta: buildPaginationMeta(total, pagination.page, pagination.limit) });
  } catch (err) {
    next(err);
  }
}

export async function addItemHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, quantity } = req.body;
    const item = await shoppingService.addItem(
      Number(req.params.listId),
      { name, quantity },
      req.user!
    );
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
}

export async function updateItemHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, quantity, isChecked } = req.body;
    const item = await shoppingService.updateItem(
      Number(req.params.itemId),
      compact({ name, quantity, isChecked }),
      req.user!
    );
    res.json(item);
  } catch (err) {
    next(err);
  }
}

export async function deleteItemHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await shoppingService.deleteItem(Number(req.params.itemId), req.user!.householdId));
  } catch (err) {
    next(err);
  }
}

export async function clearCheckedHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await shoppingService.clearChecked(Number(req.params.listId), req.user!.householdId));
  } catch (err) {
    next(err);
  }
}
