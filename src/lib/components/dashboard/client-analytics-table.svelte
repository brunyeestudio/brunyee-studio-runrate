<script lang="ts">
  import { Badge } from '$lib/components/ui/badge/index.js';
  import type { BadgeVariant } from '$lib/components/ui/badge/badge.svelte';
  import * as Table from '$lib/components/ui/table/index.js';
  import type {
    AnalyticsClientRow,
    AnalyticsStatus,
    AnalyticsViewModel,
  } from '$lib/runrate/analytics';
  import { formatCurrency } from '$lib/runrate/format';
  import SourceBadge from './source-badge.svelte';

  let {
    view,
    currencyCode = 'GBP',
    emptyMessage = 'No timesheets or issued invoices in this range',
  }: {
    view: AnalyticsViewModel;
    currencyCode?: string;
    emptyMessage?: string;
  } = $props();

  const isEmpty = $derived(
    view.clients.length === 0 &&
      view.studio.hoursSpent === 0 &&
      view.studio.revenue === 0,
  );

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
    const formatted = formatCurrency(Math.abs(amount), currencyCode);
    if (amount > 0) return `+${formatted}`;
    if (amount < 0) return `-${formatted}`;
    return formatted;
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

  function rateDependent(value: number | null, format: (n: number) => string): string {
    if (!view.hasHourlyRate || value === null) return 'Enter hourly rate';
    return format(value);
  }
</script>

{#snippet clientCells(row: AnalyticsClientRow)}
  <Table.Cell class="font-medium">{row.customerName}</Table.Cell>
  <Table.Cell class="tabular-nums">
    <div>{formatHoursValue(row.hoursSpent)}</div>
    <div class="text-muted-foreground text-xs">
      {formatSignedHours(row.hoursDelta)}
    </div>
  </Table.Cell>
  <Table.Cell class="tabular-nums">
    <div>{formatCurrency(row.revenue, currencyCode)}</div>
    <div class="text-muted-foreground text-xs">
      {formatSignedMoney(row.revenueDelta)}
    </div>
  </Table.Cell>
  <Table.Cell class="tabular-nums">
    {rateDependent(row.soldHours, formatHoursValue)}
  </Table.Cell>
  <Table.Cell>
    <div class="flex flex-wrap items-center gap-2">
      {#if row.status}
        <Badge
          variant={statusVariant(row.status)}
          data-testid="analytics-status"
        >
          {statusLabel(row.status)}
        </Badge>
      {/if}
      <span class="tabular-nums text-sm">
        {rateDependent(row.hoursVariance, formatSignedHours)}
      </span>
    </div>
  </Table.Cell>
  <Table.Cell class="text-right tabular-nums">
    {rateDependent(row.moneyVariance, formatSignedMoney)}
  </Table.Cell>
  <Table.Cell class="text-right tabular-nums">
    {rateDependent(row.effectiveRate, (rate) =>
      formatCurrency(rate, currencyCode),
    )}
  </Table.Cell>
{/snippet}

<div class="space-y-3" data-testid="client-analytics-table">
  <div class="flex flex-wrap items-center justify-between gap-2">
    <p class="text-muted-foreground text-xs tracking-widest uppercase">
      Source
    </p>
    <div class="flex flex-wrap items-center gap-3">
      <SourceBadge source="Timesheets" />
      <SourceBadge source="Issued" />
    </div>
  </div>

  {#if isEmpty}
    <p class="text-muted-foreground text-sm">{emptyMessage}</p>
  {:else}
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Client</Table.Head>
          <Table.Head>Hours</Table.Head>
          <Table.Head>Revenue</Table.Head>
          <Table.Head>Sold hours</Table.Head>
          <Table.Head>Hours var</Table.Head>
          <Table.Head class="text-right">£ var</Table.Head>
          <Table.Head class="text-right">Effective rate</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <Table.Row data-testid="analytics-studio-row" class="bg-muted/30">
          {@render clientCells(view.studio)}
        </Table.Row>

        {#each view.clients as client (client.customerName)}
          <Table.Row data-testid={`analytics-client-${client.customerName}`}>
            {@render clientCells(client)}
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  {/if}
</div>
