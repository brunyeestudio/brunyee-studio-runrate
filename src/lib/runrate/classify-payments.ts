import { sumMoney } from './currency';
import { isDateInRange } from './dates';
import type { FxContext, MonthContext, Payment, PaymentBucket } from './types';

/**
 * Customer payments received this month. Uses payments rather than invoice
 * status so earlier instalments and credit-note settlements are not counted.
 */
export function classifyCashCollected(
  payments: Payment[],
  ctx: MonthContext,
  fx: FxContext,
): PaymentBucket {
  const matched = payments.filter((payment) =>
    isDateInRange(payment.date, ctx.monthStart, ctx.monthEnd),
  );
  const money = sumMoney(
    matched,
    (payment) => payment.amount,
    (payment) => payment.currencyCode,
    fx,
    (payment) => (payment.amount > 0 ? payment.bcyAmount / payment.amount : null),
  );
  return {
    payments: matched,
    total: money.amount,
    byCurrency: money.byCurrency,
    source: 'Cash collected',
  };
}
