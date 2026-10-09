import { z } from 'zod';
import { calendarDate, money } from './common';

const recurrence = z.enum(['None', 'Weekly', 'Monthly', 'Yearly']);

export const createBillSchema = z.object({
  name: z.string().min(1).max(255),
  amount: money,
  categoryId: z.number().int().positive(),
  recurrence: recurrence.optional(),
  nextDueDate: calendarDate,
  responsibleId: z.number().int().positive().nullable().optional(),
});

export const updateBillSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  amount: money.optional(),
  categoryId: z.number().int().positive().optional(),
  recurrence: recurrence.optional(),
  nextDueDate: calendarDate.optional(),
  responsibleId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
});

// Both default to the bill's amount and today.
export const payBillSchema = z.object({
  amount: money.optional(),
  date: calendarDate.optional(),
});
