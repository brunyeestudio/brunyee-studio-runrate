import {
	classifyCashCollected,
	classifyDraftDatedNextFirst,
	classifyDrafts,
	classifyDueNextMonth,
	classifyDueThisMonth,
	classifyIssuedOnMonthStart,
	classifyIssuedThisMonth,
	classifyOutstanding,
	classifyScheduledNextMonth
} from './classify-invoices';
import { classifyHourlyWip } from './classify-projects';
import type {
	CurrencyAmount,
	DashboardSnapshot,
	FxContext,
	Invoice,
	LabeledAmount,
	MonthContext,
	ProjectWip
} from './types';

function labeledFromMoney(
	amount: number,
	byCurrency: CurrencyAmount[],
	source: LabeledAmount['source'],
	count: number
): LabeledAmount {
	return { amount, source, count, byCurrency };
}

export function buildDashboardSnapshot(
	invoices: Invoice[],
	projects: ProjectWip[],
	ctx: MonthContext,
	fx: FxContext,
	asOf: Date = new Date()
): DashboardSnapshot {
	const outstanding = classifyOutstanding(invoices, ctx, fx);
	const drafts = classifyDrafts(invoices, fx);
	const scheduledNextMonth = classifyScheduledNextMonth(invoices, ctx, fx);
	const draftDatedNextFirst = classifyDraftDatedNextFirst(invoices, ctx, fx);
	const issuedOnMonthStart = classifyIssuedOnMonthStart(invoices, ctx, fx);
	const issuedThisMonth = classifyIssuedThisMonth(invoices, ctx, fx);
	const cashCollected = classifyCashCollected(invoices, ctx, fx);
	const dueThisMonth = classifyDueThisMonth(invoices, ctx, fx);
	const dueNextMonth = classifyDueNextMonth(invoices, ctx, fx);
	const hourlyWip = classifyHourlyWip(projects, fx);

	const draftPipeline = labeledFromMoney(
		draftDatedNextFirst.total,
		draftDatedNextFirst.totalByCurrency,
		'Draft invoices',
		draftDatedNextFirst.invoices.length
	);
	const projectPipeline = labeledFromMoney(
		hourlyWip.total,
		hourlyWip.byCurrency,
		'Projects (hourly)',
		hourlyWip.projects.length
	);
	const earnedPipelineBreakdown = [draftPipeline, projectPipeline].filter(
		(item) => item.amount > 0 || item.count > 0
	);
	const earnedPipelineAmount = draftPipeline.amount + projectPipeline.amount;
	const earnedPipelineCount = draftPipeline.count + projectPipeline.count;
	const earnedByCurrency = mergeCurrencyAmounts(
		[draftPipeline.byCurrency, projectPipeline.byCurrency],
		fx.baseCurrencyCode
	);

	return {
		asOf: asOf.toISOString(),
		monthLabel: ctx.monthLabel,
		currencyCode: fx.baseCurrencyCode,
		exchangeRates: { ...fx.rates, [fx.baseCurrencyCode]: 1 },
		kpis: {
			cashCollected: labeledFromMoney(
				cashCollected.total,
				cashCollected.totalByCurrency,
				'Cash collected',
				cashCollected.invoices.length
			),
			earnedPipeline: {
				amount: earnedPipelineAmount,
				source: 'Draft invoices',
				count: earnedPipelineCount,
				byCurrency: earnedByCurrency
			},
			earnedPipelineBreakdown,
			outstandingBalance: labeledFromMoney(
				outstanding.balance,
				outstanding.balanceByCurrency,
				'Outstanding',
				outstanding.invoices.length
			),
			issuedOnMonthStart: labeledFromMoney(
				issuedOnMonthStart.balance,
				issuedOnMonthStart.balanceByCurrency,
				'Issued',
				issuedOnMonthStart.invoices.length
			),
			issuedThisMonth: labeledFromMoney(
				issuedThisMonth.total,
				issuedThisMonth.totalByCurrency,
				'Issued',
				issuedThisMonth.invoices.length
			)
		},
		paymentTiming: {
			dueThisMonth: labeledFromMoney(
				dueThisMonth.balance,
				dueThisMonth.balanceByCurrency,
				'Outstanding',
				dueThisMonth.invoices.length
			),
			dueNextMonth: labeledFromMoney(
				dueNextMonth.balance,
				dueNextMonth.balanceByCurrency,
				'Outstanding',
				dueNextMonth.invoices.length
			)
		},
		buckets: {
			outstanding,
			drafts,
			scheduledNextMonth,
			draftDatedNextFirst,
			issuedOnMonthStart,
			issuedThisMonth,
			cashCollected,
			dueThisMonth,
			dueNextMonth,
			hourlyWip
		}
	};
}

function mergeCurrencyAmounts(
	groups: CurrencyAmount[][],
	baseCurrencyCode: string
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
