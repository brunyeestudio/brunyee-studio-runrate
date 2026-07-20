import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDate,
  getDaysInMonth,
  getMonth,
  getYear,
  isSameDay as isSameCalendarDay,
  isSaturday,
  isValid,
  isWeekend,
  isWithinInterval,
  parse,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns';
import type { MonthContext } from './types';

const ISO_DATE_PATTERN = 'yyyy-MM-dd';

/** Format calendar parts as yyyy-mm-dd in local terms (`monthIndex` is 0-based). */
export function toIsoDate(
  year: number,
  monthIndex: number,
  day: number,
): string {
  return format(new Date(year, monthIndex, day), ISO_DATE_PATTERN);
}

export function parseIsoDate(
  iso: string,
): { year: number; month: number; day: number } | null {
  const datePart = iso.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
  const date = parseISO(datePart);
  if (!isValid(date)) return null;
  return {
    year: getYear(date),
    month: getMonth(date) + 1,
    day: getDate(date),
  };
}

export function daysInMonth(year: number, monthIndex: number): number {
  return getDaysInMonth(new Date(year, monthIndex, 1));
}

export function getMonthContext(now: Date = new Date()): MonthContext {
  const year = getYear(now);
  const month = getMonth(now);
  const today = format(now, ISO_DATE_PATTERN);
  const monthStartDate = startOfMonth(now);
  const monthEndDate = endOfMonth(now);
  const previousMonthStartDate = startOfMonth(subMonths(now, 1));
  const nextMonthStartDate = startOfMonth(addMonths(now, 1));
  const nextMonthEndDate = endOfMonth(nextMonthStartDate);
  const nextMonthStart = format(nextMonthStartDate, ISO_DATE_PATTERN);

  return {
    today,
    year,
    month,
    monthStart: format(monthStartDate, ISO_DATE_PATTERN),
    monthEnd: format(monthEndDate, ISO_DATE_PATTERN),
    previousMonthStart: format(previousMonthStartDate, ISO_DATE_PATTERN),
    nextMonthStart,
    nextMonthEnd: format(nextMonthEndDate, ISO_DATE_PATTERN),
    firstOfNextMonth: nextMonthStart,
    monthLabel: format(now, 'MMMM yyyy'),
  };
}

function parseIsoDatePart(iso: string): Date | null {
  const datePart = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
  const date = parseISO(datePart);
  return isValid(date) ? date : null;
}

export function isDateInRange(
  iso: string | null | undefined,
  start: string,
  end: string,
): boolean {
  if (!iso) return false;
  const date = parseIsoDatePart(iso);
  const startDate = parseIsoDatePart(start);
  const endDate = parseIsoDatePart(end);
  if (!date || !startDate || !endDate) return false;
  return isWithinInterval(date, { start: startDate, end: endDate });
}

export function isSameDay(
  iso: string | null | undefined,
  day: string,
): boolean {
  if (!iso) return false;
  const left = parseIsoDatePart(iso);
  const right = parseIsoDatePart(day);
  if (!left || !right) return false;
  return isSameCalendarDay(left, right);
}

/** Extract yyyy-mm-dd from Zoho schedule_time like "2026-06-20 10:00:00". */
export function scheduleDate(
  scheduleTime: string | null | undefined,
): string | null {
  if (!scheduleTime?.trim()) return null;
  const trimmed = scheduleTime.trim();
  const withTime = parse(trimmed, 'yyyy-MM-dd HH:mm:ss', new Date());
  if (isValid(withTime)) return format(withTime, ISO_DATE_PATTERN);
  const parsed = parseIsoDate(trimmed);
  if (!parsed) return null;
  return toIsoDate(parsed.year, parsed.month - 1, parsed.day);
}

/** Days elapsed / remaining for an as-of date within its calendar month. */
export function monthDayProgress(asOfIso: string): {
  daysElapsed: number;
  daysRemaining: number;
  daysInMonth: number;
} | null {
  const parsed = parseIsoDate(asOfIso);
  if (!parsed) return null;
  const daysInMonthTotal = daysInMonth(parsed.year, parsed.month - 1);
  const daysElapsed = Math.min(Math.max(parsed.day, 0), daysInMonthTotal);
  return {
    daysElapsed,
    daysRemaining: Math.max(daysInMonthTotal - daysElapsed, 0),
    daysInMonth: daysInMonthTotal,
  };
}

/**
 * Project earned-to-date to month end using the run rate so far.
 * `earnedToDate / daysElapsed * daysInMonth` — equivalent to adding the
 * same daily rate across the remaining days.
 */
export function forecastEndOfMonth(
  earnedToDate: number,
  daysElapsed: number,
  daysInMonthTotal: number,
): number {
  if (!Number.isFinite(earnedToDate) || earnedToDate <= 0) return 0;
  if (!Number.isFinite(daysElapsed) || daysElapsed <= 0) return 0;
  if (!Number.isFinite(daysInMonthTotal) || daysInMonthTotal <= 0) return 0;
  if (daysElapsed >= daysInMonthTotal) return earnedToDate;
  return (earnedToDate / daysElapsed) * daysInMonthTotal;
}

function calendarDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

function daysOfMonth(year: number, month: number): Date[] {
  const start = calendarDate(year, month, 1);
  return eachDayOfInterval({ start, end: endOfMonth(start) });
}

/** Monday–Friday (public holidays ignored). */
export function isWeekdayDate(
  year: number,
  month: number,
  day: number,
): boolean {
  return !isWeekend(calendarDate(year, month, day));
}

export function countWeekdaysInMonth(year: number, month: number): number {
  return daysOfMonth(year, month).filter((date) => !isWeekend(date)).length;
}

export function countWeekendDaysInMonth(year: number, month: number): number {
  return daysOfMonth(year, month).filter((date) => isWeekend(date)).length;
}

/**
 * Weekday elapsed / remaining for an as-of date within its calendar month.
 * Elapsed includes asOf when it is a weekday; remaining is strictly after asOf.
 */
export function weekdayProgress(asOfIso: string): {
  weekdaysElapsed: number;
  weekdaysRemaining: number;
  weekdaysInMonth: number;
} | null {
  const parsed = parseIsoDate(asOfIso);
  if (!parsed) return null;
  const { year, month, day } = parsed;
  let weekdaysElapsed = 0;
  let weekdaysRemaining = 0;
  let weekdaysInMonth = 0;

  for (const date of daysOfMonth(year, month)) {
    if (isWeekend(date)) continue;
    weekdaysInMonth++;
    if (getDate(date) <= day) weekdaysElapsed++;
    else weekdaysRemaining++;
  }

  return { weekdaysElapsed, weekdaysRemaining, weekdaysInMonth };
}

/**
 * Weekend days/weekends still available after asOf.
 * A weekend is a Sat–Sun pair anchored on Saturday in the month that still
 * has at least one day after asOf (orphan month-start Sundays count as days
 * only, not as a separate weekend).
 */
export function weekendProgress(asOfIso: string): {
  weekendDaysRemaining: number;
  weekendsRemaining: number;
} | null {
  const parsed = parseIsoDate(asOfIso);
  if (!parsed) return null;
  const { year, month, day } = parsed;
  const days = daysOfMonth(year, month);
  const totalDays = days.length;
  let weekendDaysRemaining = 0;
  let weekendsRemaining = 0;

  for (const date of days) {
    const d = getDate(date);
    if (isWeekend(date) && d > day) weekendDaysRemaining++;
    if (isSaturday(date)) {
      const sunday = d + 1;
      const saturdayAfter = d > day;
      const sundayAfter = sunday <= totalDays && sunday > day;
      if (saturdayAfter || sundayAfter) weekendsRemaining++;
    }
  }

  return { weekendDaysRemaining, weekendsRemaining };
}
