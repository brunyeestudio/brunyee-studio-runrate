import type {
  CurrencyAmount,
  DashboardSnapshot,
  Invoice,
  ProjectWip,
} from '$lib/runrate/types';

function gbp(amount: number, count = 1): CurrencyAmount[] {
  return [{ currencyCode: 'GBP', amount, convertedAmount: amount, count }];
}

export const sampleInvoices: Invoice[] = [
  {
    invoiceId: '1',
    invoiceNumber: 'INV-1001',
    customerName: 'Northwind Ltd',
    status: 'unpaid',
    date: '2026-07-01',
    dueDate: '2026-08-31',
    total: 4200,
    balance: 4200,
    scheduleTime: null,
    lastPaymentDate: null,
    currencyCode: 'GBP',
  },
  {
    invoiceId: '2',
    invoiceNumber: 'DRAFT-44',
    customerName: 'Contoso',
    status: 'draft',
    date: '2026-08-01',
    dueDate: '2026-08-31',
    total: 5600,
    balance: 5600,
    scheduleTime: '2026-08-01 09:00:00',
    lastPaymentDate: null,
    currencyCode: 'GBP',
  },
  {
    invoiceId: '3',
    invoiceNumber: 'INV-0998',
    customerName: 'Fabrikam',
    status: 'paid',
    date: '2026-06-15',
    dueDate: '2026-07-15',
    total: 3100,
    balance: 0,
    scheduleTime: null,
    lastPaymentDate: '2026-07-10',
    currencyCode: 'GBP',
  },
  {
    invoiceId: '4',
    invoiceNumber: 'INV-EUR-12',
    customerName: 'Euro Partners',
    status: 'unpaid',
    date: '2026-06-01',
    dueDate: '2026-07-10',
    total: 1000,
    balance: 1000,
    scheduleTime: null,
    lastPaymentDate: null,
    currencyCode: 'EUR',
  },
];

export const sampleProjects: ProjectWip[] = [
  {
    projectId: 'p1',
    projectName: 'Platform retainers',
    customerName: 'Northwind Ltd',
    billingType: 'based_on_project_hours',
    rate: 95,
    unBilledHours: '12:30',
    unBilledAmount: 1187.5,
    currencyCode: 'GBP',
  },
];

/** Snapshot with mixed GBP + EUR outstanding (EUR @ 0.85). */
export const sampleSnapshot: DashboardSnapshot = {
  asOf: '2026-07-14T10:00:00.000Z',
  monthLabel: 'July 2026',
  currencyCode: 'GBP',
  exchangeRates: { GBP: 1, EUR: 0.85 },
  kpis: {
    cashCollected: {
      amount: 3100,
      source: 'Cash collected',
      count: 1,
      byCurrency: gbp(3100),
    },
    earnedLastMonth: {
      amount: 850,
      source: 'Issued',
      count: 1,
      byCurrency: [
        { currencyCode: 'EUR', amount: 1000, convertedAmount: 850, count: 1 },
      ],
    },
    earnedPipeline: {
      amount: 6787.5,
      source: 'Draft invoices',
      count: 2,
      byCurrency: gbp(6787.5, 2),
    },
    earnedPipelineBreakdown: [
      {
        amount: 5600,
        source: 'Draft invoices',
        count: 1,
        byCurrency: gbp(5600),
      },
      {
        amount: 1187.5,
        source: 'Projects (hourly)',
        count: 1,
        byCurrency: gbp(1187.5),
      },
    ],
    outstandingBalance: {
      amount: 850,
      source: 'Outstanding',
      count: 1,
      byCurrency: [
        { currencyCode: 'EUR', amount: 1000, convertedAmount: 850, count: 1 },
      ],
    },
    issuedOnMonthStart: {
      amount: 4200,
      source: 'Issued',
      count: 1,
      byCurrency: gbp(4200),
    },
    issuedThisMonth: {
      amount: 4200,
      source: 'Issued',
      count: 1,
      byCurrency: gbp(4200),
    },
  },
  paymentTiming: {
    dueThisMonth: {
      amount: 850,
      source: 'Outstanding',
      count: 1,
      byCurrency: [
        { currencyCode: 'EUR', amount: 1000, convertedAmount: 850, count: 1 },
      ],
    },
    dueNextMonth: {
      amount: 4200,
      source: 'Outstanding',
      count: 1,
      byCurrency: gbp(4200),
    },
  },
  buckets: {
    outstanding: {
      invoices: [sampleInvoices[3]],
      total: 850,
      balance: 850,
      totalByCurrency: [
        { currencyCode: 'EUR', amount: 1000, convertedAmount: 850, count: 1 },
      ],
      balanceByCurrency: [
        { currencyCode: 'EUR', amount: 1000, convertedAmount: 850, count: 1 },
      ],
      source: 'Outstanding',
    },
    drafts: {
      invoices: [sampleInvoices[1]],
      total: 5600,
      balance: 5600,
      totalByCurrency: gbp(5600),
      balanceByCurrency: gbp(5600),
      source: 'Draft invoices',
    },
    scheduledNextMonth: {
      invoices: [sampleInvoices[1]],
      total: 5600,
      balance: 5600,
      totalByCurrency: gbp(5600),
      balanceByCurrency: gbp(5600),
      source: 'Scheduled',
    },
    draftDatedNextFirst: {
      invoices: [sampleInvoices[1]],
      total: 5600,
      balance: 5600,
      totalByCurrency: gbp(5600),
      balanceByCurrency: gbp(5600),
      source: 'Draft invoices',
    },
    issuedOnPreviousMonthStart: {
      invoices: [sampleInvoices[3]],
      total: 850,
      balance: 850,
      totalByCurrency: [
        { currencyCode: 'EUR', amount: 1000, convertedAmount: 850, count: 1 },
      ],
      balanceByCurrency: [
        { currencyCode: 'EUR', amount: 1000, convertedAmount: 850, count: 1 },
      ],
      source: 'Issued',
    },
    issuedOnMonthStart: {
      invoices: [sampleInvoices[0]],
      total: 4200,
      balance: 4200,
      totalByCurrency: gbp(4200),
      balanceByCurrency: gbp(4200),
      source: 'Issued',
    },
    issuedThisMonth: {
      invoices: [sampleInvoices[0]],
      total: 4200,
      balance: 4200,
      totalByCurrency: gbp(4200),
      balanceByCurrency: gbp(4200),
      source: 'Issued',
    },
    cashCollected: {
      invoices: [sampleInvoices[2]],
      total: 3100,
      balance: 0,
      totalByCurrency: gbp(3100),
      balanceByCurrency: [],
      source: 'Cash collected',
    },
    dueThisMonth: {
      invoices: [sampleInvoices[3]],
      total: 850,
      balance: 850,
      totalByCurrency: [
        { currencyCode: 'EUR', amount: 1000, convertedAmount: 850, count: 1 },
      ],
      balanceByCurrency: [
        { currencyCode: 'EUR', amount: 1000, convertedAmount: 850, count: 1 },
      ],
      source: 'Outstanding',
    },
    dueNextMonth: {
      invoices: [sampleInvoices[0]],
      total: 4200,
      balance: 4200,
      totalByCurrency: gbp(4200),
      balanceByCurrency: gbp(4200),
      source: 'Outstanding',
    },
    hourlyWip: {
      projects: sampleProjects,
      total: 1187.5,
      byCurrency: gbp(1187.5),
      source: 'Projects (hourly)',
    },
  },
};
