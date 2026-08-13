import {
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
  subDays,
} from 'date-fns';

const ISO_DATE_PATTERN = 'yyyy-MM-dd';

export type AnalyticsRangePreset = '7d' | '1m' | '3m' | '6m' | '1y';

export const ANALYTICS_RANGE_DAYS: Record<AnalyticsRangePreset, number> = {
  '7d': 7,
  '1m': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
};

export const DEFAULT_ANALYTICS_RANGE_PRESET: AnalyticsRangePreset = '1m';

const PRESET_VALUES = new Set<string>(Object.keys(ANALYTICS_RANGE_DAYS));

export function isAnalyticsRangePreset(
  value: unknown,
): value is AnalyticsRangePreset {
  return typeof value === 'string' && PRESET_VALUES.has(value);
}

function parseIsoDatePart(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const date = parseISO(iso);
  return isValid(date) ? date : null;
}

function formatIso(date: Date): string {
  return format(date, ISO_DATE_PATTERN);
}

export function resolveAnalyticsRange(
  preset: AnalyticsRangePreset,
  todayIso: string,
): { from: string; to: string } {
  const today = parseIsoDatePart(todayIso);
  if (!today) {
    throw new Error(`Invalid todayIso: ${todayIso}`);
  }
  const days = ANALYTICS_RANGE_DAYS[preset];
  return {
    from: formatIso(subDays(today, days - 1)),
    to: formatIso(today),
  };
}

export function previousPeriod(bounds: {
  from: string;
  to: string;
}): { from: string; to: string } {
  const from = parseIsoDatePart(bounds.from);
  const to = parseIsoDatePart(bounds.to);
  if (!from || !to) {
    throw new Error(`Invalid period bounds: ${bounds.from}..${bounds.to}`);
  }
  const length = differenceInCalendarDays(to, from) + 1;
  const previousTo = subDays(from, 1);
  return {
    from: formatIso(subDays(previousTo, length - 1)),
    to: formatIso(previousTo),
  };
}

export function parseAnalyticsDates(
  from: string | null,
  to: string | null,
): { from: string; to: string } | null {
  if (from === null || to === null) return null;
  const fromDate = parseIsoDatePart(from);
  const toDate = parseIsoDatePart(to);
  if (!fromDate || !toDate) return null;
  if (fromDate > toDate) return null;
  return { from, to };
}
