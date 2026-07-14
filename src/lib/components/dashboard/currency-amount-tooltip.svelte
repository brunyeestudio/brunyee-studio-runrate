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

  const showSplit = $derived(
    hasMultipleCurrencies(byCurrency, baseCurrencyCode),
  );
</script>

{#if showSplit}
  <Tooltip.Provider delayDuration={200}>
    <Tooltip.Root>
      <Tooltip.Trigger
        type="button"
        class="hover:text-foreground/90 cursor-default text-left outline-none"
        aria-label={label}
        data-testid="currency-amount-trigger"
      >
        {@render children()}
      </Tooltip.Trigger>
      <Tooltip.Content
        side="top"
        sideOffset={6}
        class="flex min-w-44 max-w-64 flex-col items-stretch gap-1.5 text-left leading-snug"
        data-testid="currency-amount-tooltip"
      >
        <p
          class="text-background/65 text-[0.625rem] font-semibold tracking-widest uppercase"
        >
          By currency
        </p>
        <ul class="w-full space-y-1">
          {#each byCurrency as entry (entry.currencyCode)}
            <li
              class="flex w-full items-baseline justify-between gap-3 text-xs"
            >
              <span class="tabular-nums"
                >{formatCurrency(entry.amount, entry.currencyCode)}</span
              >
              {#if entry.currencyCode !== baseCurrencyCode}
                <span class="text-background/65 shrink-0 tabular-nums">
                  ≈ {formatCurrency(entry.convertedAmount, baseCurrencyCode)}
                </span>
              {/if}
            </li>
          {/each}
        </ul>
        <p
          class="text-background/65 border-background/20 flex w-full items-baseline justify-between gap-3 border-t pt-1.5 text-[0.6875rem] tabular-nums"
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
