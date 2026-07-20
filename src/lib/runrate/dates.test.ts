import { describe, expect, it } from 'vitest';
import {
  countWeekdaysInMonth,
  countWeekendDaysInMonth,
  forecastEndOfMonth,
  getMonthContext,
  isDateInRange,
  isSameDay,
  monthDayProgress,
  parseIsoDate,
  scheduleDate,
  toIsoDate,
  weekdayProgress,
  weekendProgress,
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

  it('counts weekdays and weekend days in a month', () => {
    // July 2026: Wed 1 … Fri 31 → 23 weekdays, 8 weekend days
    expect(countWeekdaysInMonth(2026, 7)).toBe(23);
    expect(countWeekendDaysInMonth(2026, 7)).toBe(8);
  });

  it('computes weekday progress from an as-of date', () => {
    expect(weekdayProgress('2026-07-14')).toEqual({
      weekdaysElapsed: 10,
      weekdaysRemaining: 13,
      weekdaysInMonth: 23,
    });
    expect(weekdayProgress('2026-07-31')).toEqual({
      weekdaysElapsed: 23,
      weekdaysRemaining: 0,
      weekdaysInMonth: 23,
    });
    expect(weekdayProgress('bad')).toBeNull();
  });

  it('computes weekend progress from an as-of date', () => {
    expect(weekendProgress('2026-07-14')).toEqual({
      weekendDaysRemaining: 4,
      weekendsRemaining: 2,
    });
    // Saturday: remaining Sunday of this weekend + next weekend
    expect(weekendProgress('2026-07-18')).toEqual({
      weekendDaysRemaining: 3,
      weekendsRemaining: 2,
    });
    // Sunday: only the following weekend remains
    expect(weekendProgress('2026-07-19')).toEqual({
      weekendDaysRemaining: 2,
      weekendsRemaining: 1,
    });
    expect(weekendProgress('2026-07-31')).toEqual({
      weekendDaysRemaining: 0,
      weekendsRemaining: 0,
    });
    expect(weekendProgress('bad')).toBeNull();
  });

  it('forecasts end-of-month using weekday pace', () => {
    const progress = weekdayProgress('2026-07-14');
    expect(progress).not.toBeNull();
    expect(
      forecastEndOfMonth(
        1400,
        progress!.weekdaysElapsed,
        progress!.weekdaysInMonth,
      ),
    ).toBeCloseTo(3220);
  });
});
