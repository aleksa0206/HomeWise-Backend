import { CategoryType } from '@prisma/client';
import * as categoryRepository from '../repositories/categoryRepository';
import { NotFoundError } from '../errors/NotFoundError';
import { ForbiddenError } from '../errors/ForbiddenError';

export async function getAllCategories(
  householdId: number,
  filters: { type?: CategoryType | undefined },
  pagination: { skip: number; take: number }
) {
  return await categoryRepository.findAllCategories(householdId, filters, pagination);
}

export async function getCategoryById(categoryId: number, householdId: number) {
  const category = await categoryRepository.findCategoryById(categoryId);
  if (!category) {
    throw new NotFoundError('Category');
  }
  if (category.householdId !== householdId) {
    throw new ForbiddenError();
  }
  return category;
}

export async function createCategory(data: {
  name: string;
  type: CategoryType;
  householdId: number;
}) {
  return await categoryRepository.createCategory(data);
}

// Only the name is editable: changing the type would silently turn past expenses into income.
export async function updateCategory(
  categoryId: number,
  householdId: number,
  data: { name?: string }
) {
  await getCategoryById(categoryId, householdId);
  return await categoryRepository.updateCategory(categoryId, data);
}

// A category with budgets or transactions is rejected with 409 by the FK constraint.
export async function deleteCategory(categoryId: number, householdId: number) {
  await getCategoryById(categoryId, householdId);
  return await categoryRepository.removeCategory(categoryId);
}
