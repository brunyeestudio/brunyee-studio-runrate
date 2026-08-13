import {
  buildAnalyticsView,
  rollupPeriod,
} from '$lib/runrate/analytics';
import type { AnalyticsViewModel } from '$lib/runrate/analytics';
import type { Invoice, TimeEntry } from '$lib/runrate/types';

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

/** Quantum overshoot (|£ var| larger) before Northwind headroom at £100/h. */
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
    total: 1000,
    status: 'paid',
  }),
  invoice({
    invoiceId: 'q-prev',
    customerName: 'Quantum',
    date: '2026-07-01',
    total: 800,
    status: 'paid',
  }),
  invoice({
    invoiceId: 'n-prev',
    customerName: 'Northwind',
    date: '2026-07-02',
    total: 600,
    status: 'paid',
  }),
];

const entries: TimeEntry[] = [
  entry({
    timeEntryId: '1',
    customerName: 'Quantum',
    logDate: '2026-08-10',
    hours: 15,
  }),
  entry({
    timeEntryId: '2',
    customerName: 'Northwind',
    logDate: '2026-08-11',
    hours: 8,
  }),
  entry({
    timeEntryId: '3',
    customerName: 'Quantum',
    logDate: '2026-07-01',
    hours: 6,
  }),
  entry({
    timeEntryId: '4',
    customerName: 'Northwind',
    logDate: '2026-07-02',
    hours: 5,
  }),
];

const sampleSnapshot = {
  asOf: '2026-08-13T10:00:00.000Z',
  currencyCode: 'GBP',
  exchangeRates: { GBP: 1 },
  current: rollupPeriod(entries, invoices, fx, current),
  previous: rollupPeriod(entries, invoices, fx, previous),
};

/** Studio + Quantum (overshoot) + Northwind (headroom); Quantum sorts first by |£ variance|. */
export const sampleAnalyticsView: AnalyticsViewModel = buildAnalyticsView(
  sampleSnapshot,
  100,
);

export const sampleAnalyticsViewMissingRate: AnalyticsViewModel =
  buildAnalyticsView(sampleSnapshot, undefined);

export const emptyAnalyticsView: AnalyticsViewModel = buildAnalyticsView(
  {
    asOf: '2026-08-13T10:00:00.000Z',
    currencyCode: 'GBP',
    exchangeRates: { GBP: 1 },
    current: rollupPeriod([], [], fx, current),
    previous: rollupPeriod([], [], fx, previous),
  },
  100,
);
