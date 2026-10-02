import { z } from 'zod';
import { money } from './common';

export const setBudgetSchema = z.object({
  categoryId: z.number().int().positive(),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  amount: money,
});
