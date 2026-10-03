import { monthRange, nextDueDate } from '../src/utils/dates';

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('date helpers', () => {
  it('nextDueDate advances daily, weekly and monthly (clamping to month end)', () => {
    expect(nextDueDate(day('2026-12-31'), 'Daily')).toEqual(day('2027-01-01'));
    expect(nextDueDate(day('2026-10-28'), 'Weekly')).toEqual(day('2026-11-04'));
    expect(nextDueDate(day('2026-01-31'), 'Monthly')).toEqual(day('2026-02-28'));
    expect(nextDueDate(day('2028-01-31'), 'Monthly')).toEqual(day('2028-02-29'));
    expect(nextDueDate(day('2026-12-15'), 'Monthly')).toEqual(day('2027-01-15'));
  });

  it('monthRange is [first day, first day of next month)', () => {
    expect(monthRange(2026, 12)).toEqual({ start: day('2026-12-01'), end: day('2027-01-01') });
  });
});
