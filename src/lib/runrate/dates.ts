import type { MonthContext } from './types';

const MONTH_NAMES = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
] as const;

/** Format a Date as yyyy-mm-dd in local calendar terms using UTC getters after constructing from parts. */
export function toIsoDate(year: number, monthIndex: number, day: number): string {
	const mm = String(monthIndex + 1).padStart(2, '0');
	const dd = String(day).padStart(2, '0');
	return `${year}-${mm}-${dd}`;
}

export function parseIsoDate(iso: string): { year: number; month: number; day: number } | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
	if (!match) return null;
	return {
		year: Number(match[1]),
		month: Number(match[2]),
		day: Number(match[3])
	};
}

export function daysInMonth(year: number, monthIndex: number): number {
	return new Date(year, monthIndex + 1, 0).getDate();
}

export function getMonthContext(now: Date = new Date()): MonthContext {
	const year = now.getFullYear();
	const month = now.getMonth();
	const today = toIsoDate(year, month, now.getDate());
	const monthStart = toIsoDate(year, month, 1);
	const monthEnd = toIsoDate(year, month, daysInMonth(year, month));

	const nextMonthIndex = month === 11 ? 0 : month + 1;
	const nextYear = month === 11 ? year + 1 : year;
	const nextMonthStart = toIsoDate(nextYear, nextMonthIndex, 1);
	const nextMonthEnd = toIsoDate(nextYear, nextMonthIndex, daysInMonth(nextYear, nextMonthIndex));
	const firstOfNextMonth = nextMonthStart;

	return {
		today,
		year,
		month,
		monthStart,
		monthEnd,
		nextMonthStart,
		nextMonthEnd,
		firstOfNextMonth,
		monthLabel: `${MONTH_NAMES[month]} ${year}`
	};
}

export function isDateInRange(iso: string | null | undefined, start: string, end: string): boolean {
	if (!iso) return false;
	const date = iso.slice(0, 10);
	return date >= start && date <= end;
}

export function isSameDay(iso: string | null | undefined, day: string): boolean {
	if (!iso) return false;
	return iso.slice(0, 10) === day;
}

/** Extract yyyy-mm-dd from Zoho schedule_time like "2026-06-20 10:00:00". */
export function scheduleDate(scheduleTime: string | null | undefined): string | null {
	if (!scheduleTime?.trim()) return null;
	const parsed = parseIsoDate(scheduleTime);
	if (!parsed) return null;
	return toIsoDate(parsed.year, parsed.month - 1, parsed.day);
}
