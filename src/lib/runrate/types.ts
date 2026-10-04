/** Labels shown in the UI so every amount has a clear data source. */
export type RevenueSource =
  | 'Outstanding'
  | 'Draft invoices'
  | 'Scheduled'
  | 'Projects (hourly)'
  | 'Cash collected'
  | 'Issued'
  | 'Timesheets';

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
  | 'based_on_project_hours'
  | 'based_on_staff_hours'
  | 'based_on_task_hours';

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
  /** Tax included in `total`; absent when Zoho does not report it. */
  taxTotal?: number | null;
  /** Booked rate at invoice date (`base = foreign * rate`); absent → current rate. */
  exchangeRate?: number | null;
}

/** Normalized customer payment from Zoho list responses. */
export interface Payment {
  paymentId: string;
  paymentNumber: string;
  customerName: string;
  date: string;
  invoiceNumbers: string;
  currencyCode: string;
  amount: number;
  /** Amount in org base currency at the booked rate. */
  bcyAmount: number;
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
  /** Portion of `unBilledAmount` from time logged before the current month. */
  carriedOverAmount?: number;
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
  /** Display label when several breakdown rows share a source. */
  label?: string;
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
  /** Converted total excluding tax — the earned figure. */
  net: number;
  netByCurrency: CurrencyAmount[];
  /** Share of `net` still unpaid, pro rata to each invoice balance. */
  netOutstanding: number;
  source: RevenueSource;
}

export interface PaymentBucket {
  payments: Payment[];
  total: number;
  byCurrency: CurrencyAmount[];
  source: RevenueSource;
}

export interface ProjectBucket {
  projects: ProjectWip[];
  total: number;
  byCurrency: CurrencyAmount[];
  /** Converted share of `total` logged before the current month. */
  carriedOver: number;
  carriedOverByCurrency: CurrencyAmount[];
  source: RevenueSource;
}

export interface DashboardSnapshot {
  asOf: string;
  /** Reporting-time-zone calendar date (yyyy-mm-dd) the snapshot was built for. */
  today: string;
  monthLabel: string;
  /** Org base currency code — all KPI `amount` fields are converted into this. */
  currencyCode: string;
  /** Multipliers: `base = foreign * rate`. Base currency is always `1`. */
  exchangeRates: Record<string, number>;
  kpis: {
    cashCollected: LabeledAmount;
    earnedLastMonth: LabeledAmount;
    /** Net earned last month split by what has been paid so far. */
    earnedLastMonthSplit: { paid: number; outstanding: number };
    earnedPipeline: LabeledAmount;
    earnedPipelineBreakdown: LabeledAmount[];
    /** Part of earned pipeline from time logged before this month (not run rate). */
    earnedPipelineCarriedOver: number;
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
    earnedLastMonth: InvoiceBucket;
    issuedOnMonthStart: InvoiceBucket;
    issuedThisMonth: InvoiceBucket;
    cashCollected: PaymentBucket;
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
  previousMonthStart: string;
  nextMonthStart: string;
  nextMonthEnd: string;
  firstOfNextMonth: string;
  monthLabel: string;
}

export interface TimeEntry {
  timeEntryId: string;
  projectId?: string;
  customerName: string;
  projectName: string;
  logDate: string;
  hours: number;
}

export interface AnalyticsPeriodBounds {
  from: string;
  to: string;
}

export interface AnalyticsClientFacts {
  customerName: string;
  hoursSpent: number;
  revenue: number;
  timeEntryCount: number;
  invoiceCount: number;
  revenueByCurrency: CurrencyAmount[];
}

export interface AnalyticsPeriodFacts {
  bounds: AnalyticsPeriodBounds;
  studio: AnalyticsClientFacts;
  clients: AnalyticsClientFacts[];
}

export interface AnalyticsSnapshot {
  asOf: string;
  currencyCode: string;
  exchangeRates: Record<string, number>;
  current: AnalyticsPeriodFacts;
  previous: AnalyticsPeriodFacts;
}
