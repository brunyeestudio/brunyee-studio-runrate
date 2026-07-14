import { sumMoney } from './currency';
import { isDateInRange, isSameDay, scheduleDate } from './dates';
import type { FxContext, Invoice, InvoiceBucket, MonthContext } from './types';

function sumTotal(invoices: Invoice[], fx: FxContext) {
  return sumMoney(
    invoices,
    (invoice) => invoice.total,
    (invoice) => invoice.currencyCode,
    fx,
  );
}

function sumBalance(invoices: Invoice[], fx: FxContext) {
  return sumMoney(
    invoices,
    (invoice) => invoice.balance,
    (invoice) => invoice.currencyCode,
    fx,
  );
}

function bucket(
  invoices: Invoice[],
  source: InvoiceBucket['source'],
  fx: FxContext,
  useBalance = false,
): InvoiceBucket {
  const totalMoney = useBalance
    ? sumBalance(invoices, fx)
    : sumTotal(invoices, fx);
  const balanceMoney = sumBalance(invoices, fx);
  return {
    invoices,
    total: totalMoney.amount,
    balance: balanceMoney.amount,
    totalByCurrency: totalMoney.byCurrency,
    balanceByCurrency: balanceMoney.byCurrency,
    source,
  };
}

function isOutstandingStatus(status: string): boolean {
  const normalized = status.toLowerCase();
  return (
    normalized === 'unpaid' ||
    normalized === 'partially_paid' ||
    normalized === 'sent' ||
    normalized === 'viewed' ||
    normalized === 'overdue'
  );
}

export function isOutstandingInvoice(invoice: Invoice): boolean {
  return invoice.balance > 0 && isOutstandingStatus(invoice.status);
}

/** Invoice due date is today or earlier (ISO yyyy-mm-dd compares lexicographically). */
export function isDueOrOverdue(invoice: Invoice, today: string): boolean {
  return Boolean(invoice.dueDate) && invoice.dueDate <= today;
}

export function isDraftInvoice(invoice: Invoice): boolean {
  return invoice.status.toLowerCase() === 'draft';
}

export function classifyOutstanding(
  invoices: Invoice[],
  ctx: MonthContext,
  fx: FxContext,
): InvoiceBucket {
  const matched = invoices.filter(
    (invoice) =>
      isOutstandingInvoice(invoice) && isDueOrOverdue(invoice, ctx.today),
  );
  return bucket(matched, 'Outstanding', fx, true);
}

export function classifyDrafts(
  invoices: Invoice[],
  fx: FxContext,
): InvoiceBucket {
  return bucket(invoices.filter(isDraftInvoice), 'Draft invoices', fx);
}

export function classifyScheduledNextMonth(
  invoices: Invoice[],
  ctx: MonthContext,
  fx: FxContext,
): InvoiceBucket {
  const matched = invoices.filter((invoice) => {
    const when = scheduleDate(invoice.scheduleTime);
    return (
      when !== null && isDateInRange(when, ctx.nextMonthStart, ctx.nextMonthEnd)
    );
  });
  return bucket(matched, 'Scheduled', fx);
}

/** Drafts dated the 1st of next month — earned this month, invoiced next. */
export function classifyDraftDatedNextFirst(
  invoices: Invoice[],
  ctx: MonthContext,
  fx: FxContext,
): InvoiceBucket {
  const matched = invoices.filter(
    (invoice) =>
      isDraftInvoice(invoice) && isSameDay(invoice.date, ctx.firstOfNextMonth),
  );
  return bucket(matched, 'Draft invoices', fx);
}

export function classifyDueThisMonth(
  invoices: Invoice[],
  ctx: MonthContext,
  fx: FxContext,
): InvoiceBucket {
  const matched = invoices.filter(
    (invoice) =>
      isOutstandingInvoice(invoice) &&
      isDateInRange(invoice.dueDate, ctx.monthStart, ctx.monthEnd),
  );
  return bucket(matched, 'Outstanding', fx, true);
}

export function classifyDueNextMonth(
  invoices: Invoice[],
  ctx: MonthContext,
  fx: FxContext,
): InvoiceBucket {
  const matched = invoices.filter(
    (invoice) =>
      isOutstandingInvoice(invoice) &&
      isDateInRange(invoice.dueDate, ctx.nextMonthStart, ctx.nextMonthEnd),
  );
  return bucket(matched, 'Outstanding', fx, true);
}

export function classifyIssuedThisMonth(
  invoices: Invoice[],
  ctx: MonthContext,
  fx: FxContext,
): InvoiceBucket {
  const matched = invoices.filter(
    (invoice) =>
      !isDraftInvoice(invoice) &&
      invoice.status.toLowerCase() !== 'void' &&
      isDateInRange(invoice.date, ctx.monthStart, ctx.monthEnd),
  );
  return bucket(matched, 'Issued', fx);
}

/** Non-draft invoices dated the 1st of this month — NET 30 cash forecast. */
export function classifyIssuedOnMonthStart(
  invoices: Invoice[],
  ctx: MonthContext,
  fx: FxContext,
): InvoiceBucket {
  const matched = invoices.filter(
    (invoice) =>
      !isDraftInvoice(invoice) &&
      invoice.status.toLowerCase() !== 'void' &&
      isSameDay(invoice.date, ctx.monthStart),
  );
  return bucket(matched, 'Issued', fx, true);
}

export function classifyCashCollected(
  invoices: Invoice[],
  ctx: MonthContext,
  fx: FxContext,
): InvoiceBucket {
  const matched = invoices.filter((invoice) => {
    const status = invoice.status.toLowerCase();
    const paidLike = status === 'paid' || status === 'partially_paid';
    return (
      paidLike &&
      isDateInRange(invoice.lastPaymentDate, ctx.monthStart, ctx.monthEnd)
    );
  });
  // For cash, prefer total for fully paid; for partial use total - balance as approximation
  const withAmounts = matched.map((invoice) => {
    const status = invoice.status.toLowerCase();
    if (status === 'paid') return invoice;
    return {
      ...invoice,
      total: Math.max(0, invoice.total - invoice.balance),
    };
  });
  return bucket(withAmounts, 'Cash collected', fx);
}
