import * as shoppingRepository from '../repositories/shoppingRepository';
import { NotFoundError } from '../errors/NotFoundError';
import { ForbiddenError } from '../errors/ForbiddenError';

type RequestingUser = { userId: number; householdId: number; role: string };
type Pagination = { skip: number; take: number };

// Lists are shared: everyone in the household adds, checks and edits items. Only deleting a
// whole list is limited to its creator or an Owner.

export async function getAllLists(householdId: number, pagination: Pagination) {
  return await shoppingRepository.findAllLists(householdId, pagination);
}

export async function getListById(listId: number, householdId: number) {
  const list = await shoppingRepository.findListById(listId);
  if (!list) {
    throw new NotFoundError('ShoppingList');
  }
  if (list.householdId !== householdId) {
    throw new ForbiddenError();
  }
  return list;
}

export async function createList(name: string, requestingUser: RequestingUser) {
  return await shoppingRepository.createList({
    householdId: requestingUser.householdId,
    createdById: requestingUser.userId,
    name,
  });
}

export async function updateList(listId: number, data: { name?: string }, householdId: number) {
  await getListById(listId, householdId);
  return await shoppingRepository.updateList(listId, data);
}

export async function deleteList(listId: number, requestingUser: RequestingUser) {
  const list = await getListById(listId, requestingUser.householdId);
  if (list.createdById !== requestingUser.userId && requestingUser.role !== 'Owner') {
    throw new ForbiddenError('Only the creator or an Owner can delete this list');
  }
  return await shoppingRepository.removeListWithItems(listId);
}

export async function getItems(listId: number, householdId: number, pagination: Pagination) {
  await getListById(listId, householdId);
  return await shoppingRepository.findItemsForList(listId, pagination);
}

export async function addItem(
  listId: number,
  input: { name: string; quantity?: string | null | undefined },
  requestingUser: RequestingUser
) {
  await getListById(listId, requestingUser.householdId);
  return await shoppingRepository.createItem({
    listId,
    householdId: requestingUser.householdId,
    addedById: requestingUser.userId,
    name: input.name,
    quantity: input.quantity ?? null,
  });
}

async function getItemById(itemId: number, householdId: number) {
  const item = await shoppingRepository.findItemById(itemId);
  if (!item) {
    throw new NotFoundError('ShoppingItem');
  }
  if (item.householdId !== householdId) {
    throw new ForbiddenError();
  }
  return item;
}

export async function updateItem(
  itemId: number,
  data: { name?: string; quantity?: string | null; isChecked?: boolean },
  requestingUser: RequestingUser
) {
  await getItemById(itemId, requestingUser.householdId);
  // Who checked it off is set by the server, never from the body.
  const checkedBy =
    data.isChecked === undefined
      ? {}
      : { checkedById: data.isChecked ? requestingUser.userId : null };
  return await shoppingRepository.updateItem(itemId, { ...data, ...checkedBy });
}

export async function deleteItem(itemId: number, householdId: number) {
  await getItemById(itemId, householdId);
  return await shoppingRepository.removeItem(itemId);
}

export async function clearChecked(listId: number, householdId: number) {
  await getListById(listId, householdId);
  const { count } = await shoppingRepository.removeCheckedItems(listId);
  return { removed: count };
}
