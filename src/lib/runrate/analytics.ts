import { differenceInCalendarDays, format, isValid, parseISO, subDays } from 'date-fns';
import { isIssuedInvoice } from './classify-invoices';
import { sumMoney } from './currency';
import { isDateInRange } from './dates';
import type {
  AnalyticsPeriodBounds,
  AnalyticsPeriodFacts,
  AnalyticsSnapshot,
  FxContext,
  Invoice,
  TimeEntry,
} from './types';

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

export function isAnalyticsRangePreset(value: unknown): value is AnalyticsRangePreset {
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

export function previousPeriod(bounds: { from: string; to: string }): { from: string; to: string } {
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

export const ON_RATE_HOURS_BAND = 0.5;

export type AnalyticsStatus = 'overshoot' | 'headroom' | 'on-rate' | 'no-time' | 'no-invoices';

export interface AnalyticsDerivedMetrics {
  soldHours: number | null;
  hoursVariance: number | null;
  moneyVariance: number | null;
  effectiveRate: number | null;
  status: AnalyticsStatus | null;
}

export function hasHourlyRate(hourlyRate: number | undefined): boolean {
  return hourlyRate !== undefined && Number.isFinite(hourlyRate) && hourlyRate > 0;
}

function statusFromHoursVariance(hoursVariance: number): AnalyticsStatus {
  if (hoursVariance > ON_RATE_HOURS_BAND) return 'overshoot';
  if (hoursVariance < -ON_RATE_HOURS_BAND) return 'headroom';
  return 'on-rate';
}

export function deriveMetrics(
  hoursSpent: number,
  revenue: number,
  hourlyRate: number | undefined,
): AnalyticsDerivedMetrics {
  if (hourlyRate === undefined || !hasHourlyRate(hourlyRate)) {
    return {
      soldHours: null,
      hoursVariance: null,
      moneyVariance: null,
      effectiveRate: null,
      status: null,
    };
  }

  const soldHours = revenue / hourlyRate;
  const hoursVariance = hoursSpent - soldHours;
  const moneyVariance = revenue - hoursSpent * hourlyRate;

  if (hoursSpent === 0) {
    return {
      soldHours,
      hoursVariance,
      moneyVariance,
      effectiveRate: null,
      status: revenue > 0 ? 'no-time' : null,
    };
  }

  if (revenue === 0) {
    return {
      soldHours,
      hoursVariance,
      moneyVariance,
      effectiveRate: 0,
      status: 'no-invoices',
    };
  }

  return {
    soldHours,
    hoursVariance,
    moneyVariance,
    effectiveRate: revenue / hoursSpent,
    status: statusFromHoursVariance(hoursVariance),
  };
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / previous;
}

export const UNASSIGNED_CUSTOMER = 'Unassigned';
export const STUDIO_CUSTOMER = 'Studio';

export function customerKey(name: string | null | undefined): string {
  if (name == null || name.trim() === '') return UNASSIGNED_CUSTOMER;
  return name.trim();
}

interface ClientAccumulator {
  hoursSpent: number;
  timeEntryCount: number;
  invoices: Invoice[];
}

function emptyAccumulator(): ClientAccumulator {
  return { hoursSpent: 0, timeEntryCount: 0, invoices: [] };
}

function factsFromAccumulator(
  customerName: string,
  acc: ClientAccumulator,
  fx: FxContext,
): AnalyticsPeriodFacts['studio'] {
  const money = sumMoney(
    acc.invoices,
    (invoice) => invoice.total,
    (invoice) => invoice.currencyCode,
    fx,
  );
  return {
    customerName,
    hoursSpent: acc.hoursSpent,
    revenue: money.amount,
    timeEntryCount: acc.timeEntryCount,
    invoiceCount: acc.invoices.length,
    revenueByCurrency: money.byCurrency,
  };
}

export function rollupPeriod(
  entries: TimeEntry[],
  invoices: Invoice[],
  fx: FxContext,
  bounds: AnalyticsPeriodBounds,
): AnalyticsPeriodFacts {
  const inRangeEntries = entries.filter((entry) =>
    isDateInRange(entry.logDate, bounds.from, bounds.to),
  );
  const inRangeInvoices = invoices.filter(
    (invoice) => isIssuedInvoice(invoice) && isDateInRange(invoice.date, bounds.from, bounds.to),
  );

  const byCustomer = new Map<string, ClientAccumulator>();

  for (const entry of inRangeEntries) {
    const key = customerKey(entry.customerName);
    const acc = byCustomer.get(key) ?? emptyAccumulator();
    acc.hoursSpent += entry.hours;
    acc.timeEntryCount += 1;
    byCustomer.set(key, acc);
  }

  for (const invoice of inRangeInvoices) {
    const key = customerKey(invoice.customerName);
    const acc = byCustomer.get(key) ?? emptyAccumulator();
    acc.invoices.push(invoice);
    byCustomer.set(key, acc);
  }

  const studioAcc: ClientAccumulator = {
    hoursSpent: inRangeEntries.reduce((sum, entry) => sum + entry.hours, 0),
    timeEntryCount: inRangeEntries.length,
    invoices: inRangeInvoices,
  };

  const clients = [...byCustomer.entries()]
    .map(([name, acc]) => factsFromAccumulator(name, acc, fx))
    .filter((client) => client.hoursSpent !== 0 || client.revenue !== 0);

  return {
    bounds,
    studio: factsFromAccumulator(STUDIO_CUSTOMER, studioAcc, fx),
    clients,
  };
}

export interface AnalyticsClientRow extends AnalyticsDerivedMetrics {
  customerName: string;
  hoursSpent: number;
  hoursSpentPrevious: number;
  hoursDelta: number;
  revenue: number;
  revenuePrevious: number;
  revenueDelta: number;
  hoursChangePercent: number | null;
  revenueChangePercent: number | null;
}

export interface AnalyticsViewModel {
  studio: AnalyticsClientRow;
  clients: AnalyticsClientRow[];
  hasHourlyRate: boolean;
  currentBounds: AnalyticsPeriodBounds;
  previousBounds: AnalyticsPeriodBounds;
}

function toClientRow(
  current: AnalyticsPeriodFacts['studio'],
  previous: AnalyticsPeriodFacts['studio'] | undefined,
  hourlyRate: number | undefined,
): AnalyticsClientRow {
  const hoursSpentPrevious = previous?.hoursSpent ?? 0;
  const revenuePrevious = previous?.revenue ?? 0;
  return {
    customerName: current.customerName,
    hoursSpent: current.hoursSpent,
    hoursSpentPrevious,
    hoursDelta: current.hoursSpent - hoursSpentPrevious,
    revenue: current.revenue,
    revenuePrevious,
    revenueDelta: current.revenue - revenuePrevious,
    hoursChangePercent: percentChange(current.hoursSpent, hoursSpentPrevious),
    revenueChangePercent: percentChange(current.revenue, revenuePrevious),
    ...deriveMetrics(current.hoursSpent, current.revenue, hourlyRate),
  };
}

function compareClientRows(a: AnalyticsClientRow, b: AnalyticsClientRow): number {
  const aNull = a.moneyVariance === null;
  const bNull = b.moneyVariance === null;
  if (aNull !== bNull) return aNull ? 1 : -1;
  if (!aNull && !bNull) {
    const byAbsVariance = Math.abs(b.moneyVariance as number) - Math.abs(a.moneyVariance as number);
    if (byAbsVariance !== 0) return byAbsVariance;
  }
  return b.hoursSpent - a.hoursSpent;
}

export function buildAnalyticsView(
  snapshot: AnalyticsSnapshot,
  hourlyRate: number | undefined,
): AnalyticsViewModel {
  const previousByName = new Map(
    snapshot.previous.clients.map((client) => [client.customerName, client]),
  );

  const studio = toClientRow(snapshot.current.studio, snapshot.previous.studio, hourlyRate);

  const clients = snapshot.current.clients
    .map((client) => toClientRow(client, previousByName.get(client.customerName), hourlyRate))
    .sort(compareClientRows);

  return {
    studio,
    clients,
    hasHourlyRate: hasHourlyRate(hourlyRate),
    currentBounds: snapshot.current.bounds,
    previousBounds: snapshot.previous.bounds,
  };
}
