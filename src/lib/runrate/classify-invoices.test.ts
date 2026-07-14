import { describe, expect, it } from 'vitest';
import {
  classifyCashCollected,
  classifyDraftDatedNextFirst,
  classifyDrafts,
  classifyDueNextMonth,
  classifyDueThisMonth,
  classifyIssuedOnMonthStart,
  classifyIssuedThisMonth,
  classifyOutstanding,
  classifyScheduledNextMonth,
} from './classify-invoices';
import { getMonthContext } from './dates';
import type { FxContext, Invoice } from './types';

const ctx = getMonthContext(new Date(2026, 6, 14));
const fx: FxContext = { baseCurrencyCode: 'GBP', rates: { GBP: 1 } };

function invoice(
  partial: Partial<Invoice> & Pick<Invoice, 'invoiceId'>,
): Invoice {
  return {
    invoiceNumber: partial.invoiceNumber ?? `INV-${partial.invoiceId}`,
    customerName: partial.customerName ?? 'Client',
    status: partial.status ?? 'draft',
    date: partial.date ?? '2026-07-01',
    dueDate: partial.dueDate ?? '2026-07-31',
    total: partial.total ?? 1000,
    balance: partial.balance ?? 1000,
    scheduleTime: partial.scheduleTime ?? null,
    lastPaymentDate: partial.lastPaymentDate ?? null,
    currencyCode: partial.currencyCode ?? 'GBP',
    ...partial,
  };
}

describe('classify-invoices', () => {
  it('classifies outstanding as due today or earlier only', () => {
    const invoices = [
      invoice({
        invoiceId: '1',
        status: 'unpaid',
        balance: 500,
        dueDate: '2026-07-10',
      }),
      invoice({
        invoiceId: '2',
        status: 'unpaid',
        balance: 700,
        dueDate: '2026-07-31',
      }),
      invoice({
        invoiceId: '3',
        status: 'paid',
        balance: 0,
        total: 500,
        dueDate: '2026-07-01',
      }),
      invoice({
        invoiceId: '4',
        status: 'draft',
        balance: 200,
        dueDate: '2026-07-01',
      }),
    ];
    const result = classifyOutstanding(invoices, ctx, fx);
    expect(result.invoices.map((i) => i.invoiceId)).toEqual(['1']);
    expect(result.balance).toBe(500);
    expect(result.source).toBe('Outstanding');
  });

  it('classifies draft dated first of next month for earned pipeline', () => {
    const invoices = [
      invoice({
        invoiceId: '1',
        status: 'draft',
        date: '2026-08-01',
        total: 2500,
      }),
      invoice({
        invoiceId: '2',
        status: 'draft',
        date: '2026-07-10',
        total: 100,
      }),
      invoice({
        invoiceId: '3',
        status: 'sent',
        date: '2026-08-01',
        total: 900,
      }),
    ];
    const result = classifyDraftDatedNextFirst(invoices, ctx, fx);
    expect(result.invoices.map((i) => i.invoiceId)).toEqual(['1']);
    expect(result.total).toBe(2500);
    expect(result.source).toBe('Draft invoices');
  });

  it('buckets due this month vs next month including not-yet-due', () => {
    const invoices = [
      invoice({
        invoiceId: '1',
        status: 'unpaid',
        dueDate: '2026-07-31',
        balance: 400,
      }),
      invoice({
        invoiceId: '2',
        status: 'unpaid',
        dueDate: '2026-08-30',
        balance: 600,
      }),
    ];
    expect(classifyDueThisMonth(invoices, ctx, fx).balance).toBe(400);
    expect(classifyDueNextMonth(invoices, ctx, fx).balance).toBe(600);
    // Not yet due — still in payment timing, not in outstanding
    expect(classifyOutstanding(invoices, ctx, fx).balance).toBe(0);
  });

  it('classifies scheduled next month', () => {
    const invoices = [
      invoice({
        invoiceId: '1',
        scheduleTime: '2026-08-01 10:00:00',
        total: 1200,
      }),
      invoice({
        invoiceId: '2',
        scheduleTime: '2026-07-14 09:00:00',
        total: 300,
      }),
    ];
    expect(classifyScheduledNextMonth(invoices, ctx, fx).total).toBe(1200);
  });

  it('classifies issued on the 1st of this month by balance', () => {
    const invoices = [
      invoice({
        invoiceId: '1',
        status: 'sent',
        date: '2026-07-01',
        dueDate: '2026-07-31',
        total: 2000,
        balance: 2000,
      }),
      invoice({
        invoiceId: '2',
        status: 'sent',
        date: '2026-07-08',
        total: 450,
        balance: 450,
      }),
      invoice({
        invoiceId: '3',
        status: 'draft',
        date: '2026-07-01',
        total: 100,
      }),
      invoice({
        invoiceId: '4',
        status: 'void',
        date: '2026-07-01',
        total: 50,
        balance: 0,
      }),
    ];
    const result = classifyIssuedOnMonthStart(invoices, ctx, fx);
    expect(result.invoices.map((i) => i.invoiceId)).toEqual(['1']);
    expect(result.balance).toBe(2000);
    expect(result.total).toBe(2000);
    expect(result.source).toBe('Issued');
  });

  it('classifies cash collected and issued this month', () => {
    const invoices = [
      invoice({
        invoiceId: '1',
        status: 'paid',
        date: '2026-06-01',
        lastPaymentDate: '2026-07-05',
        total: 800,
        balance: 0,
      }),
      invoice({
        invoiceId: '2',
        status: 'sent',
        date: '2026-07-08',
        total: 450,
        balance: 450,
      }),
      invoice({
        invoiceId: '3',
        status: 'draft',
        date: '2026-07-09',
        total: 50,
      }),
    ];
    expect(classifyCashCollected(invoices, ctx, fx).total).toBe(800);
    expect(classifyIssuedThisMonth(invoices, ctx, fx).total).toBe(450);
    expect(classifyDrafts(invoices, fx).invoices).toHaveLength(1);
  });

  it('converts mixed-currency outstanding balances into base', () => {
    const mixedFx: FxContext = {
      baseCurrencyCode: 'GBP',
      rates: { GBP: 1, EUR: 0.85 },
    };
    const invoices = [
      invoice({
        invoiceId: '1',
        status: 'unpaid',
        balance: 1000,
        dueDate: '2026-07-10',
        currencyCode: 'GBP',
      }),
      invoice({
        invoiceId: '2',
        status: 'unpaid',
        balance: 200,
        dueDate: '2026-07-10',
        currencyCode: 'EUR',
      }),
    ];
    const result = classifyOutstanding(invoices, ctx, mixedFx);
    expect(result.balance).toBe(1170);
    expect(result.balanceByCurrency).toEqual([
      { currencyCode: 'GBP', amount: 1000, convertedAmount: 1000, count: 1 },
      { currencyCode: 'EUR', amount: 200, convertedAmount: 170, count: 1 },
    ]);
  });
});
