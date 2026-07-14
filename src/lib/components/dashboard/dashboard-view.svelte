<script lang="ts">
  import * as Alert from '$lib/components/ui/alert/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import { Skeleton } from '$lib/components/ui/skeleton/index.js';
  import * as Tabs from '$lib/components/ui/tabs/index.js';
  import type { DashboardSnapshot } from '$lib/runrate/types';
  import LinkSimpleIcon from 'phosphor-svelte/lib/LinkSimple';
  import DashboardHeader from './dashboard-header.svelte';
  import InvoiceTable from './invoice-table.svelte';
  import KpiCard from './kpi-card.svelte';
  import { kpiInfo } from './kpi-info';
  import MonthTargetInput from './month-target-input.svelte';
  import ProjectWipTable from './project-wip-table.svelte';

  let {
    snapshot = null,
    loading = false,
    error = null,
    errorCode = null,
    connected = false,
    monthTarget = $bindable<number | undefined>(undefined),
    ondisconnect,
    onrefresh,
  }: {
    snapshot?: DashboardSnapshot | null;
    loading?: boolean;
    error?: string | null;
    errorCode?: string | null;
    connected?: boolean;
    monthTarget?: number | undefined;
    ondisconnect?: () => void;
    onrefresh?: () => void;
  } = $props();

  const needsConnect = $derived(errorCode === 'ZOHO_AUTH');
</script>

<div
  class="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6"
  data-testid="dashboard"
>
  <DashboardHeader
    monthLabel={snapshot?.monthLabel ?? '…'}
    {loading}
    {connected}
    {ondisconnect}
    {onrefresh}
  />

  {#if needsConnect}
    <Alert.Root data-testid="zoho-connect">
      <LinkSimpleIcon />
      <Alert.Title>Connect Zoho Books</Alert.Title>
      <div>
        <Alert.Description>
          Link your Zoho Books organization to load invoices and hourly project
          WIP. Tokens stay in an encrypted cookie on this browser. Foreign
          amounts are converted to GBP using ECB rates via Frankfurter.
        </Alert.Description>
        <Button
          href="/api/auth/zoho/login"
          class="mt-2"
          data-testid="connect-zoho">Connect Zoho Books</Button
        >
      </div>
    </Alert.Root>
  {:else if error}
    <Alert.Root variant="destructive" data-testid="dashboard-error">
      <Alert.Title>Could not load Zoho data</Alert.Title>
      <Alert.Description>{error}</Alert.Description>
    </Alert.Root>
  {/if}

  {#if loading && !snapshot}
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {#each [1, 2, 3, 4] as item (item)}
        <Skeleton class="h-32 w-full" />
      {/each}
    </div>
  {:else if snapshot}
    <MonthTargetInput
      bind:monthTarget
      earnedThisMonth={snapshot.kpis.earnedPipeline.amount}
      paidThisMonth={snapshot.kpis.cashCollected.amount}
      asOf={snapshot.asOf}
      currencyCode={snapshot.currencyCode}
      monthLabel={snapshot.monthLabel}
    />

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="Paid this month"
        amount={snapshot.kpis.cashCollected.amount}
        source={snapshot.kpis.cashCollected.source}
        count={snapshot.kpis.cashCollected.count}
        byCurrency={snapshot.kpis.cashCollected.byCurrency}
        currencyCode={snapshot.currencyCode}
        invoices={snapshot.buckets.cashCollected.invoices}
        amountField="total"
        info={kpiInfo.paidThisMonth}
      />
      <KpiCard
        title="Earned last month"
        amount={snapshot.kpis.earnedLastMonth.amount}
        source={snapshot.kpis.earnedLastMonth.source}
        count={snapshot.kpis.earnedLastMonth.count}
        byCurrency={snapshot.kpis.earnedLastMonth.byCurrency}
        currencyCode={snapshot.currencyCode}
        invoices={snapshot.buckets.issuedOnPreviousMonthStart.invoices}
        amountField="total"
        paymentSplit={{
          paid:
            snapshot.buckets.issuedOnPreviousMonthStart.total -
            snapshot.buckets.issuedOnPreviousMonthStart.balance,
          outstanding: snapshot.buckets.issuedOnPreviousMonthStart.balance,
        }}
        info={kpiInfo.earnedLastMonth}
      />
      <KpiCard
        title="Earned this month"
        amount={snapshot.kpis.earnedPipeline.amount}
        source={snapshot.kpis.earnedPipeline.source}
        count={snapshot.kpis.earnedPipeline.count}
        byCurrency={snapshot.kpis.earnedPipeline.byCurrency}
        currencyCode={snapshot.currencyCode}
        breakdown={snapshot.kpis.earnedPipelineBreakdown}
        invoices={snapshot.buckets.draftDatedNextFirst.invoices}
        projects={snapshot.buckets.hourlyWip.projects}
        info={kpiInfo.earnedThisMonth}
      />
      <KpiCard
        title="Outstanding"
        amount={snapshot.kpis.outstandingBalance.amount}
        source={snapshot.kpis.outstandingBalance.source}
        count={snapshot.kpis.outstandingBalance.count}
        byCurrency={snapshot.kpis.outstandingBalance.byCurrency}
        currencyCode={snapshot.currencyCode}
        invoices={snapshot.buckets.outstanding.invoices}
        amountField="balance"
        info={kpiInfo.outstanding}
      />
    </section>

    <Card.Root size="sm">
      <Card.Header>
        <Card.Title class="text-base">Invoice & project detail</Card.Title>
        <Card.Description>
          Each tab shows its data source badge so draft invoices and hourly
          projects stay distinct.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <Tabs.Root value="outstanding">
          <Tabs.List variant="line" class="mb-4 flex h-auto flex-wrap gap-1">
            <Tabs.Trigger value="outstanding">Outstanding</Tabs.Trigger>
            <Tabs.Trigger value="drafts">Drafts</Tabs.Trigger>
            <Tabs.Trigger value="scheduled">Scheduled</Tabs.Trigger>
            <Tabs.Trigger value="draft-first"
              >Draft (1st next month)</Tabs.Trigger
            >
            <Tabs.Trigger value="hourly">Hourly WIP</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="outstanding">
            <InvoiceTable
              invoices={snapshot.buckets.outstanding.invoices}
              source={snapshot.buckets.outstanding.source}
            />
          </Tabs.Content>
          <Tabs.Content value="drafts">
            <InvoiceTable
              invoices={snapshot.buckets.drafts.invoices}
              source={snapshot.buckets.drafts.source}
            />
          </Tabs.Content>
          <Tabs.Content value="scheduled">
            <InvoiceTable
              invoices={snapshot.buckets.scheduledNextMonth.invoices}
              source={snapshot.buckets.scheduledNextMonth.source}
            />
          </Tabs.Content>
          <Tabs.Content value="draft-first">
            <InvoiceTable
              invoices={snapshot.buckets.draftDatedNextFirst.invoices}
              source={snapshot.buckets.draftDatedNextFirst.source}
            />
          </Tabs.Content>
          <Tabs.Content value="hourly">
            <ProjectWipTable projects={snapshot.buckets.hourlyWip.projects} />
          </Tabs.Content>
        </Tabs.Root>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
