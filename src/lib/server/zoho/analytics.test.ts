import { describe, expect, it } from 'vitest';
import { assembleAnalyticsSnapshot } from './analytics';
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
    timeEntryId: '4',
    customerName: 'Quantum',
    logDate: '2026-07-01',
    hours: 6,
  }),
];

describe('assembleAnalyticsSnapshot', () => {
  it('puts Quantum in current.clients and attaches previous revenue', () => {
    const now = new Date('2026-08-13T10:00:00.000Z');
    const snapshot = assembleAnalyticsSnapshot({
      invoices,
      entries,
      fx,
      current,
      previous,
      now,
    });

    expect(snapshot.asOf).toBe('2026-08-13T10:00:00.000Z');
    expect(snapshot.currencyCode).toBe('GBP');
    expect(snapshot.exchangeRates).toEqual({ GBP: 1 });
    expect(snapshot.current.bounds).toEqual(current);
    expect(snapshot.previous.bounds).toEqual(previous);

    const quantum = snapshot.current.clients.find((client) => client.customerName === 'Quantum');
    expect(quantum).toMatchObject({
      hoursSpent: 12,
      revenue: 1000,
    });

    const quantumPrevious = snapshot.previous.clients.find(
      (client) => client.customerName === 'Quantum',
    );
    expect(quantumPrevious).toMatchObject({
      hoursSpent: 6,
      revenue: 800,
    });
  });
});
