/** Labels shown in the UI so every amount has a clear data source. */
export type RevenueSource =
  | 'Outstanding'
  | 'Draft invoices'
  | 'Scheduled'
  | 'Projects (hourly)'
  | 'Cash collected'
  | 'Issued';

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'unpaid'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'void'
  | string;

export type HourlyBillingType =
  'based_on_project_hours' | 'based_on_staff_hours' | 'based_on_task_hours';

export const HOURLY_BILLING_TYPES: readonly HourlyBillingType[] = [
  'based_on_project_hours',
  'based_on_staff_hours',
  'based_on_task_hours',
] as const;

/** Normalized invoice from Zoho list responses. */
export interface Invoice {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  status: InvoiceStatus;
  date: string;
  dueDate: string;
  total: number;
  balance: number;
  scheduleTime: string | null;
  lastPaymentDate: string | null;
  currencyCode: string;
}

/** Normalized hourly project WIP from Zoho project detail. */
export interface ProjectWip {
  projectId: string;
  projectName: string;
  customerName: string;
  billingType: HourlyBillingType;
  rate: number | null;
  unBilledHours: string;
  unBilledAmount: number;
  currencyCode: string;
}

/** Native amount plus conversion into org base currency. */
export interface CurrencyAmount {
  currencyCode: string;
  amount: number;
  convertedAmount: number;
  count: number;
}

export interface MoneyTotal {
  /** Sum converted into org base currency. */
  amount: number;
  byCurrency: CurrencyAmount[];
}

/** Org base currency and Zoho current exchange rates (`base = foreign * rate`). */
export interface FxContext {
  baseCurrencyCode: string;
  rates: Record<string, number>;
}

export interface LabeledAmount {
  /** Sum converted into org base currency. */
  amount: number;
  source: RevenueSource;
  count: number;
  byCurrency: CurrencyAmount[];
}

export interface InvoiceBucket {
  invoices: Invoice[];
  /** Converted total (or balance when the bucket uses balance as its primary figure). */
  total: number;
  balance: number;
  totalByCurrency: CurrencyAmount[];
  balanceByCurrency: CurrencyAmount[];
  source: RevenueSource;
}

export interface ProjectBucket {
  projects: ProjectWip[];
  total: number;
  byCurrency: CurrencyAmount[];
  source: RevenueSource;
}

export interface DashboardSnapshot {
  asOf: string;
  monthLabel: string;
  /** Org base currency code — all KPI `amount` fields are converted into this. */
  currencyCode: string;
  /** Multipliers: `base = foreign * rate`. Base currency is always `1`. */
  exchangeRates: Record<string, number>;
  kpis: {
    cashCollected: LabeledAmount;
    earnedPipeline: LabeledAmount;
    earnedPipelineBreakdown: LabeledAmount[];
    outstandingBalance: LabeledAmount;
    issuedOnMonthStart: LabeledAmount;
    issuedThisMonth: LabeledAmount;
  };
  paymentTiming: {
    dueThisMonth: LabeledAmount;
    dueNextMonth: LabeledAmount;
  };
  buckets: {
    outstanding: InvoiceBucket;
    drafts: InvoiceBucket;
    scheduledNextMonth: InvoiceBucket;
    draftDatedNextFirst: InvoiceBucket;
    issuedOnMonthStart: InvoiceBucket;
    issuedThisMonth: InvoiceBucket;
    cashCollected: InvoiceBucket;
    dueThisMonth: InvoiceBucket;
    dueNextMonth: InvoiceBucket;
    hourlyWip: ProjectBucket;
  };
}

export interface MonthContext {
  today: string;
  year: number;
  month: number;
  monthStart: string;
  monthEnd: string;
  nextMonthStart: string;
  nextMonthEnd: string;
  firstOfNextMonth: string;
  monthLabel: string;
}
