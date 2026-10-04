import {
  classifyDraftDatedNextFirst,
  classifyDrafts,
  classifyDueNextMonth,
  classifyDueThisMonth,
  classifyEarnedLastMonth,
  classifyIssuedOnMonthStart,
  classifyIssuedThisMonth,
  classifyOutstanding,
  classifyScheduledNextMonth,
} from './classify-invoices';
import { classifyCashCollected } from './classify-payments';
import { classifyHourlyWip } from './classify-projects';
import { sumMoney } from './currency';
import type {
  CurrencyAmount,
  DashboardSnapshot,
  FxContext,
  Invoice,
  LabeledAmount,
  MonthContext,
  Payment,
  ProjectWip,
} from './types';

function labeledFromMoney(
  amount: number,
  byCurrency: CurrencyAmount[],
  source: LabeledAmount['source'],
  count: number,
): LabeledAmount {
  return { amount, source, count, byCurrency };
}

export function buildDashboardSnapshot(
  invoices: Invoice[],
  projects: ProjectWip[],
  payments: Payment[],
  ctx: MonthContext,
  fx: FxContext,
  asOf: Date = new Date(),
): DashboardSnapshot {
  const outstanding = classifyOutstanding(invoices, ctx, fx);
  const drafts = classifyDrafts(invoices, fx);
  const scheduledNextMonth = classifyScheduledNextMonth(invoices, ctx, fx);
  const draftDatedNextFirst = classifyDraftDatedNextFirst(invoices, ctx, fx);
  const earnedLastMonth = classifyEarnedLastMonth(invoices, ctx, fx);
  const issuedOnMonthStart = classifyIssuedOnMonthStart(invoices, ctx, fx);
  const issuedThisMonth = classifyIssuedThisMonth(invoices, ctx, fx);
  const cashCollected = classifyCashCollected(payments, ctx, fx);
  const dueThisMonth = classifyDueThisMonth(invoices, ctx, fx);
  const dueNextMonth = classifyDueNextMonth(invoices, ctx, fx);
  const hourlyWip = classifyHourlyWip(projects, fx);

  const draftPipeline = labeledFromMoney(
    draftDatedNextFirst.net,
    draftDatedNextFirst.netByCurrency,
    'Draft invoices',
    draftDatedNextFirst.invoices.length,
  );
  const projectPipeline = labeledFromMoney(
    hourlyWip.total,
    hourlyWip.byCurrency,
    'Projects (hourly)',
    hourlyWip.projects.length,
  );
  const unbilledThisMonth = sumMoney(
    hourlyWip.projects,
    (project) => project.unBilledAmount - (project.carriedOverAmount ?? 0),
    (project) => project.currencyCode,
    fx,
  );
  const unbilledBreakdown: LabeledAmount[] = [
    {
      ...labeledFromMoney(
        unbilledThisMonth.amount,
        unbilledThisMonth.byCurrency,
        'Projects (hourly)',
        hourlyWip.projects.filter(
          (project) => project.unBilledAmount > (project.carriedOverAmount ?? 0),
        ).length,
      ),
      label: 'Unbilled time — this month',
    },
    {
      ...labeledFromMoney(
        hourlyWip.carriedOver,
        hourlyWip.carriedOverByCurrency,
        'Projects (hourly)',
        hourlyWip.projects.filter((project) => (project.carriedOverAmount ?? 0) > 0).length,
      ),
      label: 'Unbilled time — earlier months',
    },
  ];
  const earnedPipelineBreakdown = [draftPipeline, ...unbilledBreakdown].filter(
    (item) => item.amount > 0 || item.count > 0,
  );
  const earnedPipelineAmount = draftPipeline.amount + projectPipeline.amount;
  const earnedPipelineCount = draftPipeline.count + projectPipeline.count;
  const earnedByCurrency = mergeCurrencyAmounts(
    [draftPipeline.byCurrency, projectPipeline.byCurrency],
    fx.baseCurrencyCode,
  );

  return {
    asOf: asOf.toISOString(),
    today: ctx.today,
    monthLabel: ctx.monthLabel,
    currencyCode: fx.baseCurrencyCode,
    exchangeRates: { ...fx.rates, [fx.baseCurrencyCode]: 1 },
    kpis: {
      cashCollected: labeledFromMoney(
        cashCollected.total,
        cashCollected.byCurrency,
        'Cash collected',
        cashCollected.payments.length,
      ),
      earnedLastMonth: labeledFromMoney(
        earnedLastMonth.net,
        earnedLastMonth.netByCurrency,
        'Issued',
        earnedLastMonth.invoices.length,
      ),
      earnedLastMonthSplit: {
        paid: earnedLastMonth.net - earnedLastMonth.netOutstanding,
        outstanding: earnedLastMonth.netOutstanding,
      },
      earnedPipeline: {
        amount: earnedPipelineAmount,
        source: 'Draft invoices',
        count: earnedPipelineCount,
        byCurrency: earnedByCurrency,
      },
      earnedPipelineBreakdown,
      earnedPipelineCarriedOver: hourlyWip.carriedOver,
      outstandingBalance: labeledFromMoney(
        outstanding.balance,
        outstanding.balanceByCurrency,
        'Outstanding',
        outstanding.invoices.length,
      ),
      issuedOnMonthStart: labeledFromMoney(
        issuedOnMonthStart.balance,
        issuedOnMonthStart.balanceByCurrency,
        'Issued',
        issuedOnMonthStart.invoices.length,
      ),
      issuedThisMonth: labeledFromMoney(
        issuedThisMonth.net,
        issuedThisMonth.netByCurrency,
        'Issued',
        issuedThisMonth.invoices.length,
      ),
    },
    paymentTiming: {
      dueThisMonth: labeledFromMoney(
        dueThisMonth.balance,
        dueThisMonth.balanceByCurrency,
        'Outstanding',
        dueThisMonth.invoices.length,
      ),
      dueNextMonth: labeledFromMoney(
        dueNextMonth.balance,
        dueNextMonth.balanceByCurrency,
        'Outstanding',
        dueNextMonth.invoices.length,
      ),
    },
    buckets: {
      outstanding,
      drafts,
      scheduledNextMonth,
      draftDatedNextFirst,
      earnedLastMonth,
      issuedOnMonthStart,
      issuedThisMonth,
      cashCollected,
      dueThisMonth,
      dueNextMonth,
      hourlyWip,
    },
  };
}

function mergeCurrencyAmounts(
  groups: CurrencyAmount[][],
  baseCurrencyCode: string,
): CurrencyAmount[] {
  const byCode = new Map<string, CurrencyAmount>();
  for (const group of groups) {
    for (const entry of group) {
      const existing = byCode.get(entry.currencyCode);
      if (existing) {
        existing.amount += entry.amount;
        existing.convertedAmount += entry.convertedAmount;
        existing.count += entry.count;
      } else {
        byCode.set(entry.currencyCode, { ...entry });
      }
    }
  }
  return [...byCode.values()].sort((a, b) => {
    if (a.currencyCode === baseCurrencyCode) return -1;
    if (b.currencyCode === baseCurrencyCode) return 1;
    return b.convertedAmount - a.convertedAmount;
  });
}
