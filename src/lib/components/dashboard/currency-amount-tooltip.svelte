<script lang="ts">
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';
  import { formatCurrency } from '$lib/runrate/format';
  import { hasMultipleCurrencies } from '$lib/runrate/currency';
  import type { CurrencyAmount } from '$lib/runrate/types';
  import type { Snippet } from 'svelte';

  let {
    amount,
    byCurrency = [],
    baseCurrencyCode = 'GBP',
    label = 'Amount by currency',
    children,
  }: {
    amount: number;
    byCurrency?: CurrencyAmount[];
    baseCurrencyCode?: string;
    label?: string;
    children: Snippet;
  } = $props();

  const showSplit = $derived(hasMultipleCurrencies(byCurrency, baseCurrencyCode));
</script>

{#if showSplit}
  <Tooltip.Provider delayDuration={200}>
    <Tooltip.Root>
      <Tooltip.Trigger
        type="button"
        class="cursor-default text-left outline-none hover:text-foreground/90"
        aria-label={label}
        data-testid="currency-amount-trigger"
      >
        {@render children()}
      </Tooltip.Trigger>
      <Tooltip.Content
        side="top"
        sideOffset={6}
        class="flex max-w-64 min-w-44 flex-col items-stretch gap-1.5 text-left leading-snug"
        data-testid="currency-amount-tooltip"
      >
        <p class="text-[0.625rem] font-semibold tracking-widest text-background/65 uppercase">
          By currency
        </p>
        <ul class="w-full space-y-1">
          {#each byCurrency as entry (entry.currencyCode)}
            <li class="flex w-full items-baseline justify-between gap-3 text-xs">
              <span class="tabular-nums">{formatCurrency(entry.amount, entry.currencyCode)}</span>
              {#if entry.currencyCode !== baseCurrencyCode}
                <span class="shrink-0 text-background/65 tabular-nums">
                  ≈ {formatCurrency(entry.convertedAmount, baseCurrencyCode)}
                </span>
              {/if}
            </li>
          {/each}
        </ul>
        <p
          class="flex w-full items-baseline justify-between gap-3 border-t border-background/20 pt-1.5 text-[0.6875rem] text-background/65 tabular-nums"
        >
          <span>Total</span>
          <span>{formatCurrency(amount, baseCurrencyCode)}</span>
        </p>
      </Tooltip.Content>
    </Tooltip.Root>
  </Tooltip.Provider>
{:else}
  {@render children()}
{/if}
