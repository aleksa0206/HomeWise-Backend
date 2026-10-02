// All dates are calendar days stored as UTC midnight.

/** [start, end) of a calendar month. */
export function monthRange(year: number, month: number) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

/**
 * Next occurrence of a recurring chore or bill; monthly and yearly clamp to the last day of the
 * month (Jan 31 -> Feb 28, Feb 29 -> Feb 28).
 */
export function nextDueDate(
  from: Date,
  recurrence: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly'
): Date {
  const next = new Date(from);
  if (recurrence === 'Daily') {
    next.setUTCDate(next.getUTCDate() + 1);
  } else if (recurrence === 'Weekly') {
    next.setUTCDate(next.getUTCDate() + 7);
  } else {
    const day = next.getUTCDate();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + (recurrence === 'Monthly' ? 1 : 12));
    const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0));
    next.setUTCDate(Math.min(day, lastDay.getUTCDate()));
  }
  return next;
}

/** `YYYY-MM-DD`, for messages. */
export function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
