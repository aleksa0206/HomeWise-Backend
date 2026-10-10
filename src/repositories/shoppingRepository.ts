import { prisma } from '../config/prismaClient';

const person = { select: { id: true, firstName: true, lastName: true } } as const;
const listInclude = {
  createdBy: person,
  _count: { select: { items: { where: { isChecked: false } } } },
} as const;
const itemInclude = { addedBy: person, checkedBy: person } as const;

export async function findAllLists(
  householdId: number,
  pagination: { skip: number; take: number }
) {
  const where = { householdId };
  const [data, total] = await Promise.all([
    prisma.shoppingList.findMany({
      where,
      include: listInclude,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.shoppingList.count({ where }),
  ]);
  return { data, total };
}

export async function findListById(id: number) {
  return await prisma.shoppingList.findUnique({ where: { id }, include: listInclude });
}

export async function createList(data: { householdId: number; createdById: number; name: string }) {
  return await prisma.shoppingList.create({ data, include: listInclude });
}

export async function updateList(id: number, data: { name?: string }) {
  return await prisma.shoppingList.update({ where: { id }, data, include: listInclude });
}

// Items only exist on their list, so they go with it.
export async function removeListWithItems(id: number) {
  return await prisma.$transaction(async (tx) => {
    await tx.shoppingItem.deleteMany({ where: { listId: id } });
    return await tx.shoppingList.delete({ where: { id } });
  });
}

export async function findItemsForList(listId: number, pagination: { skip: number; take: number }) {
  const where = { listId };
  const [data, total] = await Promise.all([
    prisma.shoppingItem.findMany({
      where,
      include: itemInclude,
      orderBy: [{ isChecked: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.shoppingItem.count({ where }),
  ]);
  return { data, total };
}

export async function findItemById(id: number) {
  return await prisma.shoppingItem.findUnique({ where: { id }, include: itemInclude });
}

export async function createItem(data: {
  listId: number;
  householdId: number;
  addedById: number;
  name: string;
  quantity: string | null;
}) {
  return await prisma.shoppingItem.create({ data, include: itemInclude });
}

export async function updateItem(
  id: number,
  data: Partial<{
    name: string;
    quantity: string | null;
    isChecked: boolean;
    checkedById: number | null;
  }>
) {
  return await prisma.shoppingItem.update({ where: { id }, data, include: itemInclude });
}

export async function removeItem(id: number) {
  return await prisma.shoppingItem.delete({ where: { id } });
}

export async function removeCheckedItems(listId: number) {
  return await prisma.shoppingItem.deleteMany({ where: { listId, isChecked: true } });
}
