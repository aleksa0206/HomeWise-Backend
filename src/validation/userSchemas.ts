import { z } from 'zod';

export const createUserSchema = z.object({
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  email: z.email(),
  password: z.string().min(8).max(100),
  role: z.enum(['Owner', 'Member']).default('Member'),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(255).optional(),
  lastName: z.string().min(1).max(255).optional(),
  email: z.email().optional(),
  role: z.enum(['Owner', 'Member']).optional(),
});
