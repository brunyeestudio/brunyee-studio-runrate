import { sumMoney } from './currency';
import { isDateInRange, isSameDay, scheduleDate } from './dates';
import type { FxContext, Invoice, InvoiceBucket, MonthContext } from './types';

/** Invoice total excluding tax — what was earned, as opposed to what will be received. */
export function netAmount(invoice: Invoice): number {
  return invoice.total - (invoice.taxTotal ?? 0);
}

/** Unpaid share of the net amount, pro rata to the remaining balance. */
function netOutstandingAmount(invoice: Invoice): number {
  if (invoice.total <= 0) return 0;
  return netAmount(invoice) * (invoice.balance / invoice.total);
}

export function sumInvoices(
  invoices: Invoice[],
  getAmount: (invoice: Invoice) => number,
  fx: FxContext,
) {
  return sumMoney(
    invoices,
    getAmount,
    (invoice) => invoice.currencyCode,
    fx,
    (invoice) => invoice.exchangeRate,
  );
}

function bucket(
  invoices: Invoice[],
  source: InvoiceBucket['source'],
  fx: FxContext,
  useBalance = false,
): InvoiceBucket {
  const balanceMoney = sumInvoices(invoices, (invoice) => invoice.balance, fx);
  const totalMoney = useBalance
    ? balanceMoney
    : sumInvoices(invoices, (invoice) => invoice.total, fx);
  const netMoney = sumInvoices(invoices, netAmount, fx);
  return {
    invoices,
    total: totalMoney.amount,
    balance: balanceMoney.amount,
    totalByCurrency: totalMoney.byCurrency,
    balanceByCurrency: balanceMoney.byCurrency,
    net: netMoney.amount,
    netByCurrency: netMoney.byCurrency,
    netOutstanding: sumInvoices(invoices, netOutstandingAmount, fx).amount,
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

export function isIssuedInvoice(invoice: Invoice): boolean {
  const status = invoice.status.toLowerCase();
  return status !== 'draft' && status !== 'void';
}

export function classifyOutstanding(
  invoices: Invoice[],
  ctx: MonthContext,
  fx: FxContext,
): InvoiceBucket {
  const matched = invoices.filter(
    (invoice) => isOutstandingInvoice(invoice) && isDueOrOverdue(invoice, ctx.today),
  );
  return bucket(matched, 'Outstanding', fx, true);
}

export function classifyDrafts(invoices: Invoice[], fx: FxContext): InvoiceBucket {
  return bucket(invoices.filter(isDraftInvoice), 'Draft invoices', fx);
}

export function classifyScheduledNextMonth(
  invoices: Invoice[],
  ctx: MonthContext,
  fx: FxContext,
): InvoiceBucket {
  const matched = invoices.filter((invoice) => {
    const when = scheduleDate(invoice.scheduleTime);
    return when !== null && isDateInRange(when, ctx.nextMonthStart, ctx.nextMonthEnd);
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
    (invoice) => isDraftInvoice(invoice) && isSameDay(invoice.date, ctx.firstOfNextMonth),
  );
  return bucket(matched, 'Draft invoices', fx);
}

export function classifyDueThisMonth(
  invoices: Invoice[],
  ctx: MonthContext,
  fx: FxContext,
): InvoiceBucket {
  // Overdue invoices from earlier months are still expected this month.
  const matched = invoices.filter(
    (invoice) =>
      isOutstandingInvoice(invoice) && Boolean(invoice.dueDate) && invoice.dueDate <= ctx.monthEnd,
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

function classifyIssuedOnDay(
  invoices: Invoice[],
  day: string,
  fx: FxContext,
  useBalance = false,
): InvoiceBucket {
  const matched = invoices.filter(
    (invoice) =>
      !isDraftInvoice(invoice) &&
      invoice.status.toLowerCase() !== 'void' &&
      isSameDay(invoice.date, day),
  );
  return bucket(matched, 'Issued', fx, useBalance);
}

/** Non-draft invoices dated the 1st of this month — NET 30 cash forecast. */
export function classifyIssuedOnMonthStart(
  invoices: Invoice[],
  ctx: MonthContext,
  fx: FxContext,
): InvoiceBucket {
  return classifyIssuedOnDay(invoices, ctx.monthStart, fx, true);
}

/**
 * Invoices dated the 1st of this month bill last month's work, so they are
 * earned last month. Drafts count too: on the 1st they may not be sent yet.
 */
export function classifyEarnedLastMonth(
  invoices: Invoice[],
  ctx: MonthContext,
  fx: FxContext,
): InvoiceBucket {
  const matched = invoices.filter(
    (invoice) => invoice.status.toLowerCase() !== 'void' && isSameDay(invoice.date, ctx.monthStart),
  );
  return bucket(matched, 'Issued', fx);
}
