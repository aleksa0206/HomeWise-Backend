import { Category, CategoryType } from '@prisma/client';
import { prisma } from '../config/prismaClient';
import { compact } from '../utils/queryParams';

export async function findAllCategories(
  householdId: number,
  filters: { type?: CategoryType | undefined },
  pagination: { skip: number; take: number }
) {
  const where = compact({ householdId, type: filters.type });
  const [data, total] = await Promise.all([
    prisma.category.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.category.count({ where }),
  ]);
  return { data, total };
}

export async function findCategoryById(id: number): Promise<Category | null> {
  return await prisma.category.findUnique({ where: { id } });
}

export async function createCategory(data: {
  name: string;
  type: CategoryType;
  householdId: number;
}): Promise<Category> {
  return await prisma.category.create({ data });
}

export async function updateCategory(id: number, data: { name?: string }): Promise<Category> {
  return await prisma.category.update({ where: { id }, data });
}

export async function removeCategory(id: number): Promise<Category> {
  return await prisma.category.delete({ where: { id } });
}
