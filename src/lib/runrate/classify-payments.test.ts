import { describe, expect, it } from 'vitest';
import { classifyCashCollected } from './classify-payments';
import { getMonthContext } from './dates';
import type { FxContext, Payment } from './types';

const ctx = getMonthContext(new Date(2026, 6, 14));
const fx: FxContext = { baseCurrencyCode: 'GBP', rates: { GBP: 1 } };

function payment(partial: Partial<Payment> & Pick<Payment, 'paymentId'>): Payment {
  return {
    paymentNumber: partial.paymentNumber ?? `PAY-${partial.paymentId}`,
    customerName: partial.customerName ?? 'Client',
    date: partial.date ?? '2026-07-05',
    invoiceNumbers: partial.invoiceNumbers ?? 'INV-1',
    currencyCode: partial.currencyCode ?? 'GBP',
    amount: partial.amount ?? 500,
    bcyAmount: partial.bcyAmount ?? partial.amount ?? 500,
    ...partial,
  };
}

describe('classify-payments', () => {
  it('sums only payments received this month', () => {
    const payments = [
      payment({ paymentId: '1', date: '2026-07-05', amount: 300 }),
      payment({ paymentId: '2', date: '2026-06-28', amount: 700 }),
      payment({ paymentId: '3', date: '2026-07-31', amount: 200 }),
    ];
    const result = classifyCashCollected(payments, ctx, fx);
    expect(result.payments.map((p) => p.paymentId)).toEqual(['1', '3']);
    expect(result.total).toBe(500);
    expect(result.source).toBe('Cash collected');
  });

  it('converts foreign payments using the booked base-currency amount', () => {
    const payments = [payment({ paymentId: '1', currencyCode: 'USD', amount: 100, bcyAmount: 79 })];
    const result = classifyCashCollected(payments, ctx, fx);
    expect(result.total).toBe(79);
    expect(result.byCurrency).toEqual([
      { currencyCode: 'USD', amount: 100, convertedAmount: 79, count: 1 },
    ]);
  });
});
