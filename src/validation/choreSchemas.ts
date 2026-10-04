import { z } from 'zod';
import { calendarDate } from './common';

const recurrence = z.enum(['None', 'Daily', 'Weekly', 'Monthly', 'Yearly']);
const priority = z.enum(['Low', 'Normal', 'High']);

export const createChoreSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).nullable().optional(),
  dueDate: calendarDate.nullable().optional(),
  recurrence: recurrence.optional(),
  priority: priority.optional(),
  assigneeId: z.number().int().positive().nullable().optional(),
});

export const updateChoreSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).nullable().optional(),
  dueDate: calendarDate.nullable().optional(),
  recurrence: recurrence.optional(),
  priority: priority.optional(),
  assigneeId: z.number().int().positive().nullable().optional(),
});
