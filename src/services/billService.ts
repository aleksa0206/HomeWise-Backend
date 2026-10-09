import { Recurrence } from '@prisma/client';
import * as billRepository from '../repositories/billRepository';
import * as categoryService from './categoryService';
import * as userService from './userService';
import { notify } from './choreService';
import { NotFoundError } from '../errors/NotFoundError';
import { ForbiddenError } from '../errors/ForbiddenError';
import { ConflictError } from '../errors/ConflictError';
import { ValidationError } from '../errors/ValidationError';
import { formatDay, nextDueDate, todayUtc } from '../utils/dates';

type RequestingUser = { userId: number; householdId: number; role: string };

export async function getAllBills(
  householdId: number,
  filters: billRepository.BillFilters,
  pagination: { skip: number; take: number }
) {
  return await billRepository.findAllBills(householdId, filters, pagination);
}

export async function getBillById(billId: number, householdId: number) {
  const bill = await billRepository.findBillById(billId);
  if (!bill) {
    throw new NotFoundError('Bill');
  }
  if (bill.householdId !== householdId) {
    throw new ForbiddenError();
  }
  return bill;
}

async function assertExpenseCategory(categoryId: number, householdId: number) {
  const category = await categoryService.getCategoryById(categoryId, householdId);
  if (category.type !== 'Expense') {
    const message = 'must be an expense category';
    throw new ValidationError(`categoryId: ${message}`, [{ path: 'categoryId', message }]);
  }
}

function notifyResponsible(
  responsibleId: number | null,
  actorId: number,
  bill: { name: string; nextDueDate: Date }
) {
  return notify(
    responsibleId,
    actorId,
    'BillAssigned',
    (name) => `${name} made you responsible for ${bill.name} (due ${formatDay(bill.nextDueDate)})`
  );
}

export async function createBill(
  input: {
    name: string;
    amount: string;
    categoryId: number;
    recurrence?: Recurrence | undefined;
    nextDueDate: Date;
    responsibleId?: number | null | undefined;
  },
  requestingUser: RequestingUser
) {
  await assertExpenseCategory(input.categoryId, requestingUser.householdId);
  const responsibleId = input.responsibleId ?? null;
  if (responsibleId !== null) {
    await userService.getUserById(responsibleId, requestingUser.householdId);
  }

  const bill = await billRepository.createBill({
    householdId: requestingUser.householdId,
    categoryId: input.categoryId,
    responsibleId,
    name: input.name,
    amount: input.amount,
    recurrence: input.recurrence ?? 'Monthly',
    nextDueDate: input.nextDueDate,
  });
  await notifyResponsible(responsibleId, requestingUser.userId, bill);
  return bill;
}

export async function updateBill(
  billId: number,
  data: {
    name?: string;
    amount?: string;
    categoryId?: number;
    recurrence?: Recurrence;
    nextDueDate?: Date;
    responsibleId?: number | null;
    isActive?: boolean;
  },
  requestingUser: RequestingUser
) {
  const bill = await getBillById(billId, requestingUser.householdId);
  if (data.categoryId !== undefined) {
    await assertExpenseCategory(data.categoryId, requestingUser.householdId);
  }
  if (data.responsibleId !== undefined && data.responsibleId !== null) {
    await userService.getUserById(data.responsibleId, requestingUser.householdId);
  }

  const updated = await billRepository.updateBill(billId, data);
  if (data.responsibleId !== undefined && data.responsibleId !== bill.responsibleId) {
    await notifyResponsible(data.responsibleId, requestingUser.userId, updated);
  }
  return updated;
}

export async function deleteBill(billId: number, householdId: number) {
  await getBillById(billId, householdId);
  return await billRepository.removeBill(billId);
}

export async function payBill(
  billId: number,
  input: { amount?: string | undefined; date?: Date | undefined },
  requestingUser: RequestingUser
) {
  const bill = await getBillById(billId, requestingUser.householdId);
  if (!bill.isActive) {
    throw new ConflictError('This bill is no longer active');
  }

  const result = await billRepository.payBill({
    billId,
    expectedDueDate: bill.nextDueDate,
    nextDueDate: bill.recurrence === 'None' ? null : nextDueDate(bill.nextDueDate, bill.recurrence),
    transaction: {
      householdId: bill.householdId,
      categoryId: bill.categoryId,
      userId: requestingUser.userId,
      amount: input.amount ?? bill.amount.toFixed(2),
      date: input.date ?? todayUtc(),
      note: bill.name,
    },
  });
  if (!result) {
    throw new ConflictError('This bill has already been paid for this period');
  }
  return result;
}
