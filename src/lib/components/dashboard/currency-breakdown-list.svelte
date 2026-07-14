<script lang="ts">
	import { formatCurrency } from '$lib/runrate/format';
	import type { CurrencyAmount } from '$lib/runrate/types';

	let {
		byCurrency,
		baseCurrencyCode = 'GBP'
	}: {
		byCurrency: CurrencyAmount[];
		baseCurrencyCode?: string;
	} = $props();
</script>

<ul class="mb-3 space-y-1" data-testid="currency-breakdown">
	{#each byCurrency as entry (entry.currencyCode)}
		<li class="flex items-center justify-between gap-2">
			<span class="font-medium tracking-wide">{entry.currencyCode}</span>
			<span class="flex items-baseline gap-2 tabular-nums">
				<span>{formatCurrency(entry.amount, entry.currencyCode)}</span>
				{#if entry.currencyCode !== baseCurrencyCode}
					<span class="text-muted-foreground text-[0.6875rem]">
						≈ {formatCurrency(entry.convertedAmount, baseCurrencyCode)}
					</span>
				{/if}
			</span>
		</li>
	{/each}
</ul>
