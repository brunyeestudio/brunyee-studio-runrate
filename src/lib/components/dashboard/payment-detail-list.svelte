<script lang="ts">
  import { formatCurrency } from '$lib/runrate/format';
  import type { Payment } from '$lib/runrate/types';

  let {
    payments,
    emptyMessage = 'No payments received yet.',
  }: {
    payments: Payment[];
    emptyMessage?: string;
  } = $props();
</script>

{#if payments.length === 0}
  <p class="text-xs text-muted-foreground" data-testid="payment-detail-empty">
    {emptyMessage}
  </p>
{:else}
  <ul class="divide-y divide-border" data-testid="payment-detail-list">
    {#each payments as payment (payment.paymentId)}
      <li class="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
        <div class="min-w-0">
          <p class="mb-0! truncate text-xs font-medium">
            {payment.invoiceNumbers || `Payment ${payment.paymentNumber}`}
            <span class="font-normal text-muted-foreground">· {payment.customerName}</span>
          </p>
          <p class="truncate text-[0.6875rem] text-muted-foreground">
            Received {payment.date} · {payment.currencyCode}
          </p>
        </div>
        <span class="shrink-0 text-xs tabular-nums">
          {formatCurrency(payment.amount, payment.currencyCode)}
        </span>
      </li>
    {/each}
  </ul>
{/if}
