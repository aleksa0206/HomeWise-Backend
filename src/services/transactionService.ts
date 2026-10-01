import * as transactionRepository from '../repositories/transactionRepository';
import * as categoryService from './categoryService';
import * as userService from './userService';
import { NotFoundError } from '../errors/NotFoundError';
import { ForbiddenError } from '../errors/ForbiddenError';

type RequestingUser = { userId: number; householdId: number; role: string };

export async function getAllTransactions(
  householdId: number,
  filters: transactionRepository.TransactionFilters,
  pagination: { skip: number; take: number }
) {
  return await transactionRepository.findAllTransactions(householdId, filters, pagination);
}

export async function getTransactionById(transactionId: number, householdId: number) {
  const transaction = await transactionRepository.findTransactionById(transactionId);
  if (!transaction) {
    throw new NotFoundError('Transaction');
  }
  if (transaction.householdId !== householdId) {
    throw new ForbiddenError();
  }
  return transaction;
}

export async function createTransaction(
  input: {
    categoryId: number;
    amount: string;
    date: Date;
    note?: string | null | undefined;
    userId?: number | undefined;
  },
  requestingUser: RequestingUser
) {
  await categoryService.getCategoryById(input.categoryId, requestingUser.householdId);
  // Recording it for another member (whoever paid the bill) is allowed within the household.
  const userId = input.userId ?? requestingUser.userId;
  await userService.getUserById(userId, requestingUser.householdId);

  return await transactionRepository.createTransaction({
    householdId: requestingUser.householdId,
    categoryId: input.categoryId,
    userId,
    amount: input.amount,
    date: input.date,
    note: input.note ?? null,
  });
}

async function getEditableTransaction(transactionId: number, requestingUser: RequestingUser) {
  const transaction = await getTransactionById(transactionId, requestingUser.householdId);
  if (transaction.userId !== requestingUser.userId && requestingUser.role !== 'Owner') {
    throw new ForbiddenError('You can only modify your own transactions');
  }
  return transaction;
}

export async function updateTransaction(
  transactionId: number,
  data: {
    categoryId?: number;
    amount?: string;
    date?: Date;
    note?: string | null;
    userId?: number;
  },
  requestingUser: RequestingUser
) {
  await getEditableTransaction(transactionId, requestingUser);
  if (data.categoryId !== undefined) {
    await categoryService.getCategoryById(data.categoryId, requestingUser.householdId);
  }
  if (data.userId !== undefined) {
    await userService.getUserById(data.userId, requestingUser.householdId);
  }
  return await transactionRepository.updateTransaction(transactionId, data);
}

export async function deleteTransaction(transactionId: number, requestingUser: RequestingUser) {
  await getEditableTransaction(transactionId, requestingUser);
  return await transactionRepository.removeTransaction(transactionId);
}
