<script lang="ts">
  import { format, parseISO } from 'date-fns';
  import * as Alert from '$lib/components/ui/alert/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import type { BadgeVariant } from '$lib/components/ui/badge/badge.svelte';
  import * as Card from '$lib/components/ui/card/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Skeleton } from '$lib/components/ui/skeleton/index.js';
  import {
    DEFAULT_ANALYTICS_RANGE_PRESET,
    buildAnalyticsView,
    type AnalyticsRangePreset,
    type AnalyticsStatus,
  } from '$lib/runrate/analytics';
  import { formatCurrency } from '$lib/runrate/format';
  import type { AnalyticsSnapshot } from '$lib/runrate/types';
  import AnalyticsRangeToggle from './analytics-range-toggle.svelte';
  import ClientAnalyticsTable from './client-analytics-table.svelte';
  import { parseOptionalNumber, displayOptionalNumber } from './month-target/format';
  import SourceBadge from './source-badge.svelte';

  let {
    snapshot = null,
    loading = false,
    error = null,
    hourlyRate = $bindable<number | undefined>(undefined),
    rangePreset = $bindable<AnalyticsRangePreset>(DEFAULT_ANALYTICS_RANGE_PRESET),
    currencyCode = 'GBP',
    onrangechange,
  }: {
    snapshot?: AnalyticsSnapshot | null;
    loading?: boolean;
    error?: string | null;
    hourlyRate?: number | undefined;
    rangePreset?: AnalyticsRangePreset;
    currencyCode?: string;
    onrangechange?: (preset: AnalyticsRangePreset) => void;
  } = $props();

  const view = $derived(snapshot ? buildAnalyticsView(snapshot, hourlyRate) : null);

  const resolvedCurrency = $derived(snapshot?.currencyCode ?? currencyCode);

  const periodCaption = $derived.by(() => {
    if (!view) return null;
    return `${formatBounds(view.currentBounds)} vs previous ${formatBounds(view.previousBounds)}`;
  });

  function formatBounds(bounds: { from: string; to: string }): string {
    return `${formatDay(bounds.from)} – ${formatDay(bounds.to)}`;
  }

  function formatDay(iso: string): string {
    return format(parseISO(iso), 'd MMM yyyy');
  }

  function formatHoursValue(hours: number): string {
    return `${hours.toLocaleString('en-GB', {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    })}h`;
  }

  function formatSignedHours(delta: number): string {
    const sign = delta > 0 ? '+' : '';
    return `${sign}${formatHoursValue(delta)}`;
  }

  function formatSignedMoney(amount: number): string {
    const formatted = formatCurrency(Math.abs(amount), resolvedCurrency);
    if (amount > 0) return `+${formatted}`;
    if (amount < 0) return `-${formatted}`;
    return formatted;
  }

  function formatChangePercent(change: number): string {
    const pct = Math.round(change * 100);
    const sign = pct > 0 ? '+' : '';
    return `${sign}${pct}%`;
  }

  function statusLabel(status: AnalyticsStatus): string {
    switch (status) {
      case 'overshoot':
        return 'Overshoot';
      case 'headroom':
        return 'Headroom';
      case 'on-rate':
        return 'On rate';
      case 'no-time':
        return 'No time logged';
      case 'no-invoices':
        return 'No invoices';
    }
  }

  function statusVariant(status: AnalyticsStatus): BadgeVariant {
    if (status === 'overshoot') return 'destructive';
    if (status === 'headroom') return 'default';
    return 'secondary';
  }

  function handleHourlyRateInput(event: Event) {
    hourlyRate = parseOptionalNumber((event.currentTarget as HTMLInputElement).value);
  }
</script>

<div class="mx-auto flex w-full max-w-7xl flex-col gap-6" data-testid="analytics-view">
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div class="flex flex-wrap items-end gap-4">
      <AnalyticsRangeToggle bind:preset={rangePreset} onchange={onrangechange} />

      <div class="flex flex-col gap-1.5">
        <label
          class="text-[0.625rem] font-semibold tracking-widest text-muted-foreground uppercase"
          for="analytics-hourly-rate"
        >
          Hourly rate ({resolvedCurrency})
        </label>
        <Input
          id="analytics-hourly-rate"
          type="number"
          min="0"
          step="5"
          placeholder="e.g. 50"
          value={displayOptionalNumber(hourlyRate)}
          oninput={handleHourlyRateInput}
          data-testid="analytics-hourly-rate"
          class="w-28"
        />
      </div>
    </div>

    <Badge variant="secondary" data-testid="temporary-label">
      Temporary — cleared when the tab closes
    </Badge>
  </div>

  {#if periodCaption}
    <p class="text-sm text-muted-foreground" data-testid="analytics-period">
      {periodCaption}
    </p>
  {/if}

  {#if error}
    <Alert.Root variant="destructive" data-testid="analytics-error">
      <Alert.Title>Could not load analytics</Alert.Title>
      <Alert.Description>{error}</Alert.Description>
    </Alert.Root>
  {/if}

  {#if loading && !snapshot}
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-testid="analytics-kpis">
      {#each [1, 2, 3, 4] as item (item)}
        <Skeleton class="h-32 w-full" />
      {/each}
    </div>
  {:else if view}
    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-testid="analytics-kpis">
      <Card.Root size="sm" class="bg-card/80" data-testid="analytics-kpi-hours">
        <Card.Header class="gap-2">
          <div class="flex items-center justify-between gap-3">
            <Card.Description class="text-[0.625rem] font-semibold tracking-widest uppercase">
              Hours spent
            </Card.Description>
            <SourceBadge source="Timesheets" />
          </div>
          <Card.Title class="text-2xl font-medium tracking-tight tabular-nums">
            {formatHoursValue(view.studio.hoursSpent)}
          </Card.Title>
        </Card.Header>
        <Card.Content class="text-xs text-muted-foreground tabular-nums">
          {formatSignedHours(view.studio.hoursDelta)}
          {#if view.studio.hoursChangePercent !== null}
            <span data-testid="analytics-kpi-hours-pct">
              ({formatChangePercent(view.studio.hoursChangePercent)})
            </span>
          {/if}
          vs previous
        </Card.Content>
      </Card.Root>

      <Card.Root size="sm" class="bg-card/80" data-testid="analytics-kpi-revenue">
        <Card.Header class="gap-2">
          <div class="flex items-center justify-between gap-3">
            <Card.Description class="text-[0.625rem] font-semibold tracking-widest uppercase">
              Issued revenue
            </Card.Description>
            <SourceBadge source="Issued" />
          </div>
          <Card.Title class="text-2xl font-medium tracking-tight tabular-nums">
            {formatCurrency(view.studio.revenue, resolvedCurrency)}
          </Card.Title>
        </Card.Header>
        <Card.Content class="text-xs text-muted-foreground tabular-nums">
          {formatSignedMoney(view.studio.revenueDelta)}
          {#if view.studio.revenueChangePercent !== null}
            <span data-testid="analytics-kpi-revenue-pct">
              ({formatChangePercent(view.studio.revenueChangePercent)})
            </span>
          {/if}
          vs previous
        </Card.Content>
      </Card.Root>

      <Card.Root size="sm" class="bg-card/80" data-testid="analytics-kpi-hours-vs-sold">
        <Card.Header class="gap-2">
          <Card.Description class="text-[0.625rem] font-semibold tracking-widest uppercase">
            Hours vs sold
          </Card.Description>
          {#if view.hasHourlyRate && view.studio.status}
            <div class="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant(view.studio.status)} data-testid="analytics-kpi-status">
                {statusLabel(view.studio.status)}
              </Badge>
              <Card.Title class="text-2xl font-medium tracking-tight tabular-nums">
                {formatSignedHours(view.studio.hoursVariance ?? 0)}
              </Card.Title>
            </div>
          {:else if view.hasHourlyRate}
            <Card.Title class="text-base font-medium text-muted-foreground">—</Card.Title>
          {:else}
            <Card.Title class="text-base font-medium text-muted-foreground">
              Enter hourly rate
            </Card.Title>
          {/if}
        </Card.Header>
        {#if view.hasHourlyRate && view.studio.moneyVariance !== null}
          <Card.Content class="text-xs text-muted-foreground tabular-nums">
            {formatSignedMoney(view.studio.moneyVariance)} £ variance
          </Card.Content>
        {/if}
      </Card.Root>

      <Card.Root size="sm" class="bg-card/80" data-testid="analytics-kpi-effective-rate">
        <Card.Header class="gap-2">
          <Card.Description class="text-[0.625rem] font-semibold tracking-widest uppercase">
            Effective rate
          </Card.Description>
          {#if view.hasHourlyRate && view.studio.effectiveRate !== null}
            <Card.Title class="text-2xl font-medium tracking-tight tabular-nums">
              {formatCurrency(view.studio.effectiveRate, resolvedCurrency)}/h
            </Card.Title>
          {:else if view.hasHourlyRate}
            <Card.Title class="text-base font-medium text-muted-foreground">—</Card.Title>
          {:else}
            <Card.Title class="text-base font-medium text-muted-foreground">
              Enter hourly rate
            </Card.Title>
          {/if}
        </Card.Header>
        {#if view.hasHourlyRate && hourlyRate !== undefined}
          <Card.Content class="text-xs text-muted-foreground tabular-nums">
            vs {formatCurrency(hourlyRate, resolvedCurrency)}/h configured
          </Card.Content>
        {/if}
      </Card.Root>
    </section>

    <ClientAnalyticsTable {view} currencyCode={resolvedCurrency} />
  {/if}
</div>
