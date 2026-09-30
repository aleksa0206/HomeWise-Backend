import type { Request, Response, NextFunction } from 'express';
import * as categoryService from '../services/categoryService';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { parseOptionalEnumQuery } from '../utils/queryParams';

const CATEGORY_TYPES = ['Income', 'Expense'] as const;

export async function getAllCategoriesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req);
    const { data, total } = await categoryService.getAllCategories(
      req.user!.householdId,
      { type: parseOptionalEnumQuery(req, 'type', CATEGORY_TYPES) },
      pagination
    );
    res.json({ data, meta: buildPaginationMeta(total, pagination.page, pagination.limit) });
  } catch (err) {
    next(err);
  }
}

export async function getCategoryByIdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const categoryId = Number(req.params.categoryId);
    res.json(await categoryService.getCategoryById(categoryId, req.user!.householdId));
  } catch (err) {
    next(err);
  }
}

export async function createCategoryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, type } = req.body;
    const category = await categoryService.createCategory({
      name,
      type,
      householdId: req.user!.householdId,
    });
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
}

export async function updateCategoryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const categoryId = Number(req.params.categoryId);
    const { name } = req.body;
    res.json(await categoryService.updateCategory(categoryId, req.user!.householdId, { name }));
  } catch (err) {
    next(err);
  }
}

export async function deleteCategoryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const categoryId = Number(req.params.categoryId);
    res.json(await categoryService.deleteCategory(categoryId, req.user!.householdId));
  } catch (err) {
    next(err);
  }
}
