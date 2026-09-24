import { z } from 'zod';

export const updateHouseholdSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  // ISO 4217 code, e.g. RSD, EUR.
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/, 'must be a 3-letter currency code')
    .optional(),
});
