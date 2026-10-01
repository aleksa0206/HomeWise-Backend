import { z } from 'zod';
import { calendarDate, money } from './common';

export const createTransactionSchema = z.object({
  categoryId: z.number().int().positive(),
  amount: money,
  date: calendarDate,
  note: z.string().max(500).nullable().optional(),
  userId: z.number().int().positive().optional(),
});

export const updateTransactionSchema = z.object({
  categoryId: z.number().int().positive().optional(),
  amount: money.optional(),
  date: calendarDate.optional(),
  note: z.string().max(500).nullable().optional(),
  userId: z.number().int().positive().optional(),
});
