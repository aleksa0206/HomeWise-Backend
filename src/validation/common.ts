import { z } from 'zod';

// Accepts 12.5 or "12.50"; kept as a string so no float rounding reaches the Decimal column.
export const money = z
  .union([z.number(), z.string()])
  .transform(String)
  .refine(
    (value) => /^\d{1,10}(\.\d{1,2})?$/.test(value),
    'must be a positive amount with up to 2 decimals'
  )
  .refine((value) => Number(value) > 0, 'must be greater than 0');

// Calendar day `YYYY-MM-DD`, stored as UTC midnight.
export const calendarDate = z.iso.date().transform((value) => new Date(`${value}T00:00:00.000Z`));
