<script lang="ts">
  import * as Table from '$lib/components/ui/table/index.js';
  import { formatCurrency } from '$lib/runrate/format';
  import type { Invoice, RevenueSource } from '$lib/runrate/types';
  import SourceBadge from './source-badge.svelte';

  let {
    invoices,
    source,
    emptyMessage = 'No invoices in this view.',
  }: {
    invoices: Invoice[];
    source: RevenueSource;
    emptyMessage?: string;
  } = $props();
</script>

<div class="space-y-3" data-testid="invoice-table">
  <div class="flex items-center justify-between gap-2">
    <p class="text-muted-foreground text-xs tracking-widest uppercase">
      Source
    </p>
    <SourceBadge {source} />
  </div>

  {#if invoices.length === 0}
    <p class="text-muted-foreground text-sm">{emptyMessage}</p>
  {:else}
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Invoice</Table.Head>
          <Table.Head>Customer</Table.Head>
          <Table.Head>Status</Table.Head>
          <Table.Head>Date</Table.Head>
          <Table.Head>Due</Table.Head>
          <Table.Head>Currency</Table.Head>
          <Table.Head class="text-right">Total</Table.Head>
          <Table.Head class="text-right">Balance</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each invoices as invoice (invoice.invoiceId)}
          <Table.Row>
            <Table.Cell class="font-medium">{invoice.invoiceNumber}</Table.Cell>
            <Table.Cell>{invoice.customerName}</Table.Cell>
            <Table.Cell class="capitalize"
              >{invoice.status.replaceAll('_', ' ')}</Table.Cell
            >
            <Table.Cell>{invoice.date}</Table.Cell>
            <Table.Cell>{invoice.dueDate}</Table.Cell>
            <Table.Cell>{invoice.currencyCode}</Table.Cell>
            <Table.Cell class="text-right tabular-nums">
              {formatCurrency(invoice.total, invoice.currencyCode)}
            </Table.Cell>
            <Table.Cell class="text-right tabular-nums">
              {formatCurrency(invoice.balance, invoice.currencyCode)}
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  {/if}
</div>
