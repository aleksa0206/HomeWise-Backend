import { z } from 'zod';

export const listSchema = z.object({
  name: z.string().min(1).max(100),
});

export const createItemSchema = z.object({
  name: z.string().min(1).max(255),
  // Free text: "2", "1 kg", "a big one".
  quantity: z.string().max(50).nullable().optional(),
});

export const updateItemSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  quantity: z.string().max(50).nullable().optional(),
  isChecked: z.boolean().optional(),
});
