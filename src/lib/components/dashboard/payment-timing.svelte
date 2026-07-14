<script lang="ts">
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { hasMultipleCurrencies } from '$lib/runrate/currency';
	import { formatCurrency } from '$lib/runrate/format';
	import type { Invoice, LabeledAmount } from '$lib/runrate/types';
	import CurrencyAmountTooltip from './currency-amount-tooltip.svelte';
	import CurrencyBreakdownList from './currency-breakdown-list.svelte';
	import InfoHint from './info-hint.svelte';
	import InvoiceDetailList from './invoice-detail-list.svelte';
	import { kpiInfo } from './kpi-info';
	import SourceBadge from './source-badge.svelte';

	let {
		dueThisMonth,
		dueNextMonth,
		dueThisMonthInvoices = [],
		dueNextMonthInvoices = [],
		currencyCode = 'GBP'
	}: {
		dueThisMonth: LabeledAmount;
		dueNextMonth: LabeledAmount;
		dueThisMonthInvoices?: Invoice[];
		dueNextMonthInvoices?: Invoice[];
		currencyCode?: string;
	} = $props();
</script>

<section class="grid gap-4 md:grid-cols-2" data-testid="payment-timing">
	<Card.Root size="sm">
		<Card.Header class="gap-2">
			<div class="flex items-center justify-between gap-2">
				<div class="flex items-center gap-1.5">
					<Card.Description class="text-[0.625rem] font-semibold tracking-widest uppercase">
						Due end of this month
					</Card.Description>
					<InfoHint label="How due end of this month is calculated" text={kpiInfo.dueThisMonth} />
				</div>
				<SourceBadge source={dueThisMonth.source} />
			</div>
			<Card.Title class="text-xl tabular-nums">
				<CurrencyAmountTooltip
					amount={dueThisMonth.amount}
					byCurrency={dueThisMonth.byCurrency}
					baseCurrencyCode={currencyCode}
					label="Due end of this month by currency"
				>
					{formatCurrency(dueThisMonth.amount, currencyCode)}
				</CurrencyAmountTooltip>
			</Card.Title>
		</Card.Header>
		<Card.Content class="text-muted-foreground text-xs">
			<Accordion.Root type="single" class="w-full">
				<Accordion.Item value="details" class="border-0">
					<Accordion.Trigger
						class="py-0 text-xs font-normal text-muted-foreground hover:no-underline"
						data-testid="payment-timing-details-trigger"
					>
						{dueThisMonth.count} outstanding invoice{dueThisMonth.count === 1 ? '' : 's'} expected to
						pay
					</Accordion.Trigger>
					<Accordion.Content class="pt-2 pb-0 text-xs" forceMount={false}>
						{#if hasMultipleCurrencies(dueThisMonth.byCurrency, currencyCode)}
							<p class="mb-1 text-[0.625rem] font-semibold tracking-widest uppercase">Currency</p>
							<CurrencyBreakdownList
								byCurrency={dueThisMonth.byCurrency}
								baseCurrencyCode={currencyCode}
							/>
						{/if}
						<InvoiceDetailList invoices={dueThisMonthInvoices} amountField="balance" />
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>
		</Card.Content>
	</Card.Root>

	<Card.Root size="sm">
		<Card.Header class="gap-2">
			<div class="flex items-center justify-between gap-2">
				<div class="flex items-center gap-1.5">
					<Card.Description class="text-[0.625rem] font-semibold tracking-widest uppercase">
						Due next month
					</Card.Description>
					<InfoHint label="How due next month is calculated" text={kpiInfo.dueNextMonth} />
				</div>
				<SourceBadge source={dueNextMonth.source} />
			</div>
			<Card.Title class="text-xl tabular-nums">
				<CurrencyAmountTooltip
					amount={dueNextMonth.amount}
					byCurrency={dueNextMonth.byCurrency}
					baseCurrencyCode={currencyCode}
					label="Due next month by currency"
				>
					{formatCurrency(dueNextMonth.amount, currencyCode)}
				</CurrencyAmountTooltip>
			</Card.Title>
		</Card.Header>
		<Card.Content class="text-muted-foreground text-xs">
			<Accordion.Root type="single" class="w-full">
				<Accordion.Item value="details" class="border-0">
					<Accordion.Trigger
						class="py-0 text-xs font-normal text-muted-foreground hover:no-underline"
						data-testid="payment-timing-details-trigger"
					>
						{dueNextMonth.count} outstanding invoice{dueNextMonth.count === 1 ? '' : 's'} expected to
						pay
					</Accordion.Trigger>
					<Accordion.Content class="pt-2 pb-0 text-xs" forceMount={false}>
						{#if hasMultipleCurrencies(dueNextMonth.byCurrency, currencyCode)}
							<p class="mb-1 text-[0.625rem] font-semibold tracking-widest uppercase">Currency</p>
							<CurrencyBreakdownList
								byCurrency={dueNextMonth.byCurrency}
								baseCurrencyCode={currencyCode}
							/>
						{/if}
						<InvoiceDetailList invoices={dueNextMonthInvoices} amountField="balance" />
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>
		</Card.Content>
	</Card.Root>
</section>
