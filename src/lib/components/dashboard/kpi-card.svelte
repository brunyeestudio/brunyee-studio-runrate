<script lang="ts">
  import * as Accordion from '$lib/components/ui/accordion/index.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import { hasMultipleCurrencies } from '$lib/runrate/currency';
  import { formatCurrency } from '$lib/runrate/format';
  import type {
    CurrencyAmount,
    Invoice,
    LabeledAmount,
    ProjectWip,
    RevenueSource,
  } from '$lib/runrate/types';
  import CurrencyAmountTooltip from './currency-amount-tooltip.svelte';
  import CurrencyBreakdownList from './currency-breakdown-list.svelte';
  import InfoHint from './info-hint.svelte';
  import InvoiceDetailList from './invoice-detail-list.svelte';
  import ProjectDetailList from './project-detail-list.svelte';
  import SourceBadge from './source-badge.svelte';

  let {
    title,
    amount,
    source,
    count,
    currencyCode = 'GBP',
    byCurrency = [],
    breakdown = [],
    invoices = undefined,
    projects = undefined,
    amountField = 'balance',
    info,
  }: {
    title: string;
    amount: number;
    source: RevenueSource;
    count: number;
    currencyCode?: string;
    byCurrency?: CurrencyAmount[];
    breakdown?: LabeledAmount[];
    invoices?: Invoice[];
    projects?: ProjectWip[];
    amountField?: 'balance' | 'total';
    info: string;
  } = $props();

  const showCurrencyBreakdown = $derived(
    hasMultipleCurrencies(byCurrency, currencyCode),
  );
  const hasDetails = $derived(
    invoices !== undefined ||
      projects !== undefined ||
      breakdown.length > 0 ||
      showCurrencyBreakdown,
  );
  const itemLabel = $derived(`${count} item${count === 1 ? '' : 's'}`);
</script>

<Card.Root size="sm" data-testid="kpi-card" class="bg-card/80">
  <Card.Header class="gap-2">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-1.5">
        <Card.Description
          class="text-[0.625rem] font-semibold tracking-widest uppercase"
        >
          {title}
        </Card.Description>
        <InfoHint label={`How ${title} is calculated`} text={info} />
      </div>
      <SourceBadge {source} />
    </div>
    <Card.Title class="text-2xl font-medium tracking-tight tabular-nums">
      <CurrencyAmountTooltip
        {amount}
        {byCurrency}
        baseCurrencyCode={currencyCode}
        label={`${title} by currency`}
      >
        {formatCurrency(amount, currencyCode)}
      </CurrencyAmountTooltip>
    </Card.Title>
  </Card.Header>
  <Card.Content class="text-muted-foreground text-xs">
    {#if hasDetails}
      <Accordion.Root type="single" class="w-full">
        <Accordion.Item value="details" class="border-0">
          <Accordion.Trigger
            class="py-0 text-xs font-normal text-muted-foreground hover:no-underline"
            data-testid="kpi-details-trigger"
          >
            {itemLabel}
          </Accordion.Trigger>
          <Accordion.Content class="pt-2 pb-0 text-xs" forceMount={false}>
            {#if showCurrencyBreakdown}
              <p
                class="mb-1 text-[0.625rem] font-semibold tracking-widest uppercase"
              >
                Currency
              </p>
              <CurrencyBreakdownList
                {byCurrency}
                baseCurrencyCode={currencyCode}
              />
            {/if}

            {#if breakdown.length > 0}
              <ul class="mb-3 space-y-1" data-testid="kpi-breakdown">
                {#each breakdown as item (item.source)}
                  <li class="flex items-center justify-between gap-2">
                    <span>{item.source}</span>
                    <span class="tabular-nums"
                      >{formatCurrency(item.amount, currencyCode)}</span
                    >
                  </li>
                {/each}
              </ul>
            {/if}

            {#if invoices !== undefined && projects !== undefined}
              <div class="space-y-3">
                <div class="space-y-1.5">
                  <p
                    class="text-[0.625rem] font-semibold tracking-widest uppercase"
                  >
                    Draft invoices
                  </p>
                  <InvoiceDetailList {invoices} amountField="total" />
                </div>
                <div class="space-y-1.5">
                  <p
                    class="text-[0.625rem] font-semibold tracking-widest uppercase"
                  >
                    Projects (hourly)
                  </p>
                  <ProjectDetailList {projects} />
                </div>
              </div>
            {:else if invoices !== undefined}
              <InvoiceDetailList {invoices} {amountField} />
            {:else if projects !== undefined}
              <ProjectDetailList {projects} />
            {/if}
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    {:else}
      <p>{itemLabel}</p>
    {/if}
  </Card.Content>
</Card.Root>
