import { describe, expect, it } from 'vitest';
import {
  forecastEndOfMonth,
  getMonthContext,
  isDateInRange,
  isSameDay,
  monthDayProgress,
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

  it('builds month context including adjacent month bounds', () => {
    const ctx = getMonthContext(new Date(2026, 6, 14));
    expect(ctx.today).toBe('2026-07-14');
    expect(ctx.monthStart).toBe('2026-07-01');
    expect(ctx.monthEnd).toBe('2026-07-31');
    expect(ctx.previousMonthStart).toBe('2026-06-01');
    expect(ctx.firstOfNextMonth).toBe('2026-08-01');
    expect(ctx.nextMonthEnd).toBe('2026-08-31');
    expect(ctx.monthLabel).toBe('July 2026');
  });

  it('handles year rollover for previous and next months', () => {
    const january = getMonthContext(new Date(2026, 0, 15));
    expect(january.previousMonthStart).toBe('2025-12-01');
    expect(january.firstOfNextMonth).toBe('2026-02-01');

    const december = getMonthContext(new Date(2026, 11, 20));
    expect(december.previousMonthStart).toBe('2026-11-01');
    expect(december.firstOfNextMonth).toBe('2027-01-01');
    expect(december.nextMonthEnd).toBe('2027-01-31');
  });

  it('checks ranges and schedule dates', () => {
    expect(isDateInRange('2026-07-15', '2026-07-01', '2026-07-31')).toBe(true);
    expect(isDateInRange(null, '2026-07-01', '2026-07-31')).toBe(false);
    expect(isSameDay('2026-08-01T00:00:00', '2026-08-01')).toBe(true);
    expect(scheduleDate('2026-08-01 09:00:00')).toBe('2026-08-01');
    expect(scheduleDate('')).toBeNull();
  });

  it('computes month day progress from an as-of date', () => {
    expect(monthDayProgress('2026-07-14')).toEqual({
      daysElapsed: 14,
      daysRemaining: 17,
      daysInMonth: 31,
    });
    expect(monthDayProgress('2026-02-28')).toEqual({
      daysElapsed: 28,
      daysRemaining: 0,
      daysInMonth: 28,
    });
    expect(monthDayProgress('bad')).toBeNull();
  });

  it('forecasts end-of-month earnings from earned-to-date run rate', () => {
    expect(forecastEndOfMonth(1400, 14, 31)).toBeCloseTo(3100);
    expect(forecastEndOfMonth(3100, 31, 31)).toBe(3100);
    expect(forecastEndOfMonth(0, 14, 31)).toBe(0);
    expect(forecastEndOfMonth(1000, 0, 31)).toBe(0);
  });
});
