import { describe, expect, it } from 'vitest';
import {
  getMonthContext,
  isDateInRange,
  isSameDay,
  parseIsoDate,
  scheduleDate,
  toIsoDate,
} from './dates';

describe('dates', () => {
  it('formats and parses ISO dates', () => {
    expect(toIsoDate(2026, 6, 14)).toBe('2026-07-14');
    expect(parseIsoDate('2026-07-14')).toEqual({
      year: 2026,
      month: 7,
      day: 14,
    });
    expect(parseIsoDate('bad')).toBeNull();
  });

  it('builds month context including first of next month', () => {
    const ctx = getMonthContext(new Date(2026, 6, 14));
    expect(ctx.today).toBe('2026-07-14');
    expect(ctx.monthStart).toBe('2026-07-01');
    expect(ctx.monthEnd).toBe('2026-07-31');
    expect(ctx.firstOfNextMonth).toBe('2026-08-01');
    expect(ctx.nextMonthEnd).toBe('2026-08-31');
    expect(ctx.monthLabel).toBe('July 2026');
  });

  it('handles December → January rollover', () => {
    const ctx = getMonthContext(new Date(2026, 11, 20));
    expect(ctx.firstOfNextMonth).toBe('2027-01-01');
    expect(ctx.nextMonthEnd).toBe('2027-01-31');
  });

  it('checks ranges and schedule dates', () => {
    expect(isDateInRange('2026-07-15', '2026-07-01', '2026-07-31')).toBe(true);
    expect(isDateInRange(null, '2026-07-01', '2026-07-31')).toBe(false);
    expect(isSameDay('2026-08-01T00:00:00', '2026-08-01')).toBe(true);
    expect(scheduleDate('2026-08-01 09:00:00')).toBe('2026-08-01');
    expect(scheduleDate('')).toBeNull();
  });
});
