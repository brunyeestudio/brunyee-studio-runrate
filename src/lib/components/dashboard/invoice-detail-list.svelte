<script lang="ts">
  import { formatCurrency } from '$lib/runrate/format';
  import type { Invoice } from '$lib/runrate/types';

  let {
    invoices,
    amountField = 'balance',
    emptyMessage = 'No contributing items.',
  }: {
    invoices: Invoice[];
    amountField?: 'balance' | 'total';
    emptyMessage?: string;
  } = $props();
</script>

{#if invoices.length === 0}
  <p class="text-xs text-muted-foreground" data-testid="invoice-detail-empty">
    {emptyMessage}
  </p>
{:else}
  <ul class="divide-y divide-border" data-testid="invoice-detail-list">
    {#each invoices as invoice (invoice.invoiceId)}
      <li class="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
        <div class="min-w-0">
          <p class="mb-0! truncate text-xs font-medium">
            {invoice.invoiceNumber}
            <span class="font-normal text-muted-foreground">· {invoice.customerName}</span>
          </p>
          <p class="truncate text-[0.6875rem] text-muted-foreground capitalize">
            {invoice.status.replaceAll('_', ' ')}
            · {invoice.date}
            · {invoice.currencyCode}
          </p>
        </div>
        <span class="shrink-0 text-xs tabular-nums">
          {formatCurrency(
            amountField === 'total' ? invoice.total : invoice.balance,
            invoice.currencyCode,
          )}
        </span>
      </li>
    {/each}
  </ul>
{/if}
