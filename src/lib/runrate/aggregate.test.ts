import { describe, expect, it } from 'vitest';
import { buildDashboardSnapshot } from './aggregate';
import { getMonthContext } from './dates';
import type { FxContext, Invoice, ProjectWip } from './types';

const gbpFx: FxContext = { baseCurrencyCode: 'GBP', rates: { GBP: 1 } };

describe('aggregate', () => {
  it('builds earned pipeline from draft 1st + hourly WIP with source breakdown', () => {
    const ctx = getMonthContext(new Date(2026, 6, 14));
    const invoices: Invoice[] = [
      {
        invoiceId: 'd1',
        invoiceNumber: 'DRAFT-1',
        customerName: 'Acme',
        status: 'draft',
        date: '2026-08-01',
        dueDate: '2026-08-31',
        total: 2000,
        balance: 2000,
        scheduleTime: null,
        lastPaymentDate: null,
        currencyCode: 'GBP',
      },
      {
        invoiceId: 'o1',
        invoiceNumber: 'INV-1',
        customerName: 'Acme',
        status: 'unpaid',
        date: '2026-06-01',
        dueDate: '2026-07-10',
        total: 500,
        balance: 500,
        scheduleTime: null,
        lastPaymentDate: null,
        currencyCode: 'GBP',
      },
      {
        invoiceId: 'bom1',
        invoiceNumber: 'INV-BOM',
        customerName: 'Gamma',
        status: 'sent',
        date: '2026-07-01',
        dueDate: '2026-07-31',
        total: 1800,
        balance: 1800,
        scheduleTime: null,
        lastPaymentDate: null,
        currencyCode: 'GBP',
      },
      {
        invoiceId: 'p1',
        invoiceNumber: 'INV-2',
        customerName: 'Beta',
        status: 'paid',
        date: '2026-06-01',
        dueDate: '2026-06-30',
        total: 750,
        balance: 0,
        scheduleTime: null,
        lastPaymentDate: '2026-07-02',
        currencyCode: 'GBP',
      },
    ];
    const projects: ProjectWip[] = [
      {
        projectId: 'pr1',
        projectName: 'Retainer',
        customerName: 'Acme',
        billingType: 'based_on_project_hours',
        rate: 120,
        unBilledHours: '08:00',
        unBilledAmount: 960,
        currencyCode: 'GBP',
      },
    ];

    const snapshot = buildDashboardSnapshot(invoices, projects, ctx, gbpFx);
    expect(snapshot.currencyCode).toBe('GBP');
    expect(snapshot.exchangeRates).toEqual({ GBP: 1 });
    expect(snapshot.kpis.earnedPipeline.amount).toBe(2960);
    expect(snapshot.kpis.earnedPipelineBreakdown).toEqual([
      {
        amount: 2000,
        source: 'Draft invoices',
        count: 1,
        byCurrency: [
          {
            currencyCode: 'GBP',
            amount: 2000,
            convertedAmount: 2000,
            count: 1,
          },
        ],
      },
      {
        amount: 960,
        source: 'Projects (hourly)',
        count: 1,
        byCurrency: [
          { currencyCode: 'GBP', amount: 960, convertedAmount: 960, count: 1 },
        ],
      },
    ]);
    expect(snapshot.kpis.cashCollected.amount).toBe(750);
    expect(snapshot.kpis.outstandingBalance.amount).toBe(500);
    expect(snapshot.kpis.earnedLastMonth.amount).toBe(1250);
    expect(
      snapshot.buckets.issuedOnPreviousMonthStart.invoices.map(
        (i) => i.invoiceId,
      ),
    ).toEqual(['o1', 'p1']);
    expect(snapshot.kpis.issuedOnMonthStart.amount).toBe(1800);
    expect(
      snapshot.buckets.issuedOnMonthStart.invoices.map((i) => i.invoiceId),
    ).toEqual(['bom1']);
    expect(
      snapshot.buckets.outstanding.invoices.map((i) => i.invoiceId),
    ).toEqual(['o1']);
    expect(snapshot.paymentTiming.dueThisMonth.amount).toBe(2300);
    expect(snapshot.monthLabel).toBe('July 2026');
  });

  it('converts mixed GBP and EUR amounts into base currency KPIs', () => {
    const ctx = getMonthContext(new Date(2026, 6, 14));
    const fx: FxContext = {
      baseCurrencyCode: 'GBP',
      rates: { GBP: 1, EUR: 0.85 },
    };
    const invoices: Invoice[] = [
      {
        invoiceId: 'gbp-out',
        invoiceNumber: 'INV-GBP',
        customerName: 'Acme',
        status: 'unpaid',
        date: '2026-06-01',
        dueDate: '2026-07-10',
        total: 500,
        balance: 500,
        scheduleTime: null,
        lastPaymentDate: null,
        currencyCode: 'GBP',
      },
      {
        invoiceId: 'eur-out',
        invoiceNumber: 'INV-EUR',
        customerName: 'EuroCo',
        status: 'unpaid',
        date: '2026-06-01',
        dueDate: '2026-07-10',
        total: 200,
        balance: 200,
        scheduleTime: null,
        lastPaymentDate: null,
        currencyCode: 'EUR',
      },
      {
        invoiceId: 'eur-draft',
        invoiceNumber: 'DRAFT-EUR',
        customerName: 'EuroCo',
        status: 'draft',
        date: '2026-08-01',
        dueDate: '2026-08-31',
        total: 1000,
        balance: 1000,
        scheduleTime: null,
        lastPaymentDate: null,
        currencyCode: 'EUR',
      },
    ];
    const projects: ProjectWip[] = [
      {
        projectId: 'pr-eur',
        projectName: 'EU retainer',
        customerName: 'EuroCo',
        billingType: 'based_on_project_hours',
        rate: 100,
        unBilledHours: '10:00',
        unBilledAmount: 400,
        currencyCode: 'EUR',
      },
    ];

    const snapshot = buildDashboardSnapshot(invoices, projects, ctx, fx);
    expect(snapshot.kpis.outstandingBalance.amount).toBe(670);
    expect(snapshot.kpis.outstandingBalance.byCurrency).toEqual([
      { currencyCode: 'GBP', amount: 500, convertedAmount: 500, count: 1 },
      { currencyCode: 'EUR', amount: 200, convertedAmount: 170, count: 1 },
    ]);
    // Draft 1000 EUR * 0.85 + WIP 400 EUR * 0.85 = 1190
    expect(snapshot.kpis.earnedPipeline.amount).toBe(1190);
    expect(snapshot.kpis.earnedPipeline.byCurrency).toEqual([
      { currencyCode: 'EUR', amount: 1400, convertedAmount: 1190, count: 2 },
    ]);
  });
});
