import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ANALYTICS_RANGE_PRESET,
  STUDIO_CUSTOMER,
  UNASSIGNED_CUSTOMER,
  buildAnalyticsView,
  deriveMetrics,
  hasHourlyRate,
  isAnalyticsRangePreset,
  parseAnalyticsDates,
  percentChange,
  previousPeriod,
  resolveAnalyticsRange,
  rollupPeriod,
} from './analytics';
import type { Invoice, TimeEntry } from './types';

describe('analytics range', () => {
  it('resolves rolling windows ending today inclusive', () => {
    expect(DEFAULT_ANALYTICS_RANGE_PRESET).toBe('1m');
    expect(resolveAnalyticsRange('7d', '2026-08-13')).toEqual({
      from: '2026-08-07',
      to: '2026-08-13',
    });
    expect(resolveAnalyticsRange('1m', '2026-08-13')).toEqual({
      from: '2026-07-15',
      to: '2026-08-13',
    });
    expect(resolveAnalyticsRange('3m', '2026-08-13')).toEqual({
      from: '2026-05-16',
      to: '2026-08-13',
    });
  });

  it('computes an equal-length previous period immediately before from', () => {
    expect(previousPeriod({ from: '2026-07-15', to: '2026-08-13' })).toEqual({
      from: '2026-06-15',
      to: '2026-07-14',
    });
    expect(previousPeriod({ from: '2026-08-07', to: '2026-08-13' })).toEqual({
      from: '2026-07-31',
      to: '2026-08-06',
    });
  });

  it('parses valid inclusive ISO dates and rejects invalid', () => {
    expect(parseAnalyticsDates('2026-07-15', '2026-08-13')).toEqual({
      from: '2026-07-15',
      to: '2026-08-13',
    });
    expect(parseAnalyticsDates('2026-08-13', '2026-07-15')).toBeNull();
    expect(parseAnalyticsDates('nope', '2026-08-13')).toBeNull();
    expect(parseAnalyticsDates(null, '2026-08-13')).toBeNull();
    expect(isAnalyticsRangePreset('1m')).toBe(true);
    expect(isAnalyticsRangePreset('2m')).toBe(false);
  });
});

describe('deriveMetrics', () => {
  it('returns blanks without a positive hourly rate', () => {
    expect(hasHourlyRate(undefined)).toBe(false);
    expect(hasHourlyRate(0)).toBe(false);
    expect(deriveMetrics(10, 1000, undefined)).toEqual({
      soldHours: null,
      hoursVariance: null,
      moneyVariance: null,
      effectiveRate: null,
      status: null,
    });
  });

  it('flags overshoot when spent hours exceed sold hours by more than 0.5h', () => {
    const result = deriveMetrics(12, 1000, 100);
    expect(result.soldHours).toBe(10);
    expect(result.hoursVariance).toBe(2);
    expect(result.moneyVariance).toBe(-200);
    expect(result.effectiveRate).toBeCloseTo(1000 / 12);
    expect(result.status).toBe('overshoot');
  });

  it('flags headroom when invoices more than cover time', () => {
    const result = deriveMetrics(8, 1000, 100);
    expect(result.soldHours).toBe(10);
    expect(result.hoursVariance).toBe(-2);
    expect(result.moneyVariance).toBe(200);
    expect(result.status).toBe('headroom');
  });

  it('treats ±0.5h as on rate', () => {
    expect(deriveMetrics(10.5, 1000, 100).status).toBe('on-rate');
    expect(deriveMetrics(9.5, 1000, 100).status).toBe('on-rate');
    expect(deriveMetrics(10, 1000, 100).status).toBe('on-rate');
  });

  it('handles no time logged and no invoices', () => {
    expect(deriveMetrics(0, 1000, 100).status).toBe('no-time');
    expect(deriveMetrics(0, 1000, 100).soldHours).toBe(10);
    expect(deriveMetrics(0, 1000, 100).effectiveRate).toBeNull();
    expect(deriveMetrics(6, 0, 100).status).toBe('no-invoices');
    expect(deriveMetrics(6, 0, 100).effectiveRate).toBe(0);
  });

  it('keeps effectiveRate and status null when hours and revenue are both zero', () => {
    const result = deriveMetrics(0, 0, 100);
    expect(result.effectiveRate).toBeNull();
    expect(result.status).toBeNull();
    expect(Number.isNaN(result.effectiveRate)).toBe(false);
  });
});

describe('percentChange', () => {
  it('returns null when previous is zero', () => {
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(12, 10)).toBeCloseTo(0.2);
  });
});

const fx = { baseCurrencyCode: 'GBP', rates: { GBP: 1 } };
const current = { from: '2026-07-15', to: '2026-08-13' };
const previous = { from: '2026-06-15', to: '2026-07-14' };

function invoice(
  partial: Pick<Invoice, 'invoiceId' | 'customerName' | 'date' | 'total' | 'status'>,
): Invoice {
  return {
    invoiceNumber: partial.invoiceId,
    dueDate: partial.date,
    balance: partial.total,
    scheduleTime: null,
    lastPaymentDate: null,
    currencyCode: 'GBP',
    ...partial,
  };
}

function entry(
  partial: Pick<TimeEntry, 'timeEntryId' | 'customerName' | 'logDate' | 'hours'>,
): TimeEntry {
  return { projectName: 'Work', ...partial };
}

const invoices: Invoice[] = [
  invoice({
    invoiceId: 'q-now',
    customerName: 'Quantum',
    date: '2026-08-01',
    total: 1000,
    status: 'sent',
  }),
  invoice({
    invoiceId: 'n-now',
    customerName: 'Northwind',
    date: '2026-08-02',
    total: 400,
    status: 'paid',
  }),
  invoice({
    invoiceId: 'draft',
    customerName: 'Quantum',
    date: '2026-08-01',
    total: 9999,
    status: 'draft',
  }),
  invoice({
    invoiceId: 'old',
    customerName: 'Ghost',
    date: '2026-01-01',
    total: 50,
    status: 'paid',
  }),
  invoice({
    invoiceId: 'q-prev',
    customerName: 'Quantum',
    date: '2026-07-01',
    total: 800,
    status: 'paid',
  }),
];

const entries: TimeEntry[] = [
  entry({
    timeEntryId: '1',
    customerName: 'Quantum',
    logDate: '2026-08-10',
    hours: 12,
  }),
  entry({
    timeEntryId: '2',
    customerName: 'Northwind',
    logDate: '2026-08-11',
    hours: 4,
  }),
  entry({
    timeEntryId: '3',
    customerName: '',
    logDate: '2026-08-12',
    hours: 1,
  }),
  entry({
    timeEntryId: '4',
    customerName: 'Quantum',
    logDate: '2026-07-01',
    hours: 6,
  }),
  entry({
    timeEntryId: '5',
    customerName: 'OnlyPrevious',
    logDate: '2026-07-01',
    hours: 3,
  }),
];

describe('rollupPeriod', () => {
  it('groups issued invoices and time entries in range', () => {
    const period = rollupPeriod(entries, invoices, fx, current);
    expect(period.studio.customerName).toBe(STUDIO_CUSTOMER);
    expect(period.studio.hoursSpent).toBe(17);
    expect(period.studio.revenue).toBe(1400);
    const names = period.clients.map((c) => c.customerName);
    expect(names).toContain('Quantum');
    expect(names).toContain('Northwind');
    expect(names).toContain(UNASSIGNED_CUSTOMER);
    expect(names).not.toContain('Ghost');
    expect(names).not.toContain('OnlyPrevious');
    expect(period.clients.find((c) => c.customerName === 'Quantum')).toMatchObject({
      hoursSpent: 12,
      revenue: 1000,
    });
  });
});

describe('buildAnalyticsView', () => {
  const snapshot = {
    asOf: '2026-08-13T10:00:00.000Z',
    currencyCode: 'GBP',
    exchangeRates: { GBP: 1 },
    current: rollupPeriod(entries, invoices, fx, current),
    previous: rollupPeriod(entries, invoices, fx, previous),
  };

  it('attaches previous period and sorts by absolute money variance', () => {
    const view = buildAnalyticsView(snapshot, 100);
    expect(view.hasHourlyRate).toBe(true);
    expect(view.studio.hoursSpent).toBe(17);
    const quantum = view.clients.find((c) => c.customerName === 'Quantum');
    expect(quantum?.hoursSpentPrevious).toBe(6);
    expect(quantum?.revenuePrevious).toBe(800);
    expect(quantum?.status).toBe('overshoot');
    expect(view.clients.map((c) => c.customerName)[0]).toBe('Quantum');
    expect(view.clients.some((c) => c.customerName === 'OnlyPrevious')).toBe(false);
  });

  it('sorts missing-rate rows after computable variance', () => {
    const view = buildAnalyticsView(snapshot, undefined);
    expect(view.clients.every((c) => c.moneyVariance === null)).toBe(true);
    expect(view.clients[0]?.hoursSpent).toBeGreaterThanOrEqual(view.clients[1]?.hoursSpent ?? 0);
  });
});
