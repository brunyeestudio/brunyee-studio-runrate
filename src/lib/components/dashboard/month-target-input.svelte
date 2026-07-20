<script lang="ts">
  import { Badge } from '$lib/components/ui/badge/index.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import type { PaceHoursMode } from '$lib/runrate/session-config';
  import InfoHint from './info-hint.svelte';
  import { kpiInfo } from './kpi-info';
  import { deriveMonthTargetModel } from './month-target/model';
  import PacePanel from './month-target/pace-panel.svelte';
  import Setup from './month-target/setup.svelte';
  import Status from './month-target/status.svelte';

  let {
    monthTarget = $bindable<number | undefined>(undefined),
    hourlyRate = $bindable<number | undefined>(undefined),
    includeWeekends = $bindable(false),
    assumedWeekdayHours = $bindable<number | undefined>(undefined),
    paceHoursMode = $bindable<PaceHoursMode>('even-spread'),
    earnedThisMonth = 0,
    paidThisMonth = 0,
    asOf = '',
    currencyCode = 'GBP',
    monthLabel = '',
  }: {
    monthTarget?: number | undefined;
    hourlyRate?: number | undefined;
    includeWeekends?: boolean;
    assumedWeekdayHours?: number | undefined;
    paceHoursMode?: PaceHoursMode;
    earnedThisMonth?: number;
    paidThisMonth?: number;
    asOf?: string;
    currencyCode?: string;
    monthLabel?: string;
  } = $props();

  const model = $derived(
    deriveMonthTargetModel({
      monthTarget,
      hourlyRate,
      includeWeekends,
      assumedWeekdayHours,
      paceHoursMode,
      earnedThisMonth,
      asOf,
    }),
  );
</script>

<Card.Root size="sm" data-testid="month-target">
  <Card.Header class="gap-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <div class="flex items-center gap-1.5">
          <Card.Title class="text-base">Month target</Card.Title>
          <InfoHint
            label="How month target progress is calculated"
            text={kpiInfo.monthTarget}
          />
        </div>
        <Card.Description>
          Compare target to earned this month for {monthLabel || 'this month'}.
        </Card.Description>
        {#if model.weekProgress && model.weekendStats}
          {@const weekdaysLeft = model.weekProgress.weekdaysRemaining}
          {@const weekendsLeft = model.weekendStats.weekendsRemaining}
          <p
            class="text-muted-foreground mt-1 text-xs"
            data-testid="month-remaining-days"
          >
            {weekdaysLeft}
            {weekdaysLeft === 1 ? 'weekday' : 'weekdays'} remaining ·
            {weekendsLeft}
            {weekendsLeft === 1 ? 'weekend' : 'weekends'} remaining
          </p>
        {/if}
      </div>
      <Badge variant="secondary" data-testid="temporary-label">
        Temporary — cleared when the tab closes
      </Badge>
    </div>
  </Card.Header>
  <Card.Content class="space-y-5">
    <Setup
      bind:monthTarget
      bind:hourlyRate
      bind:assumedWeekdayHours
      displayTarget={model.displayTarget}
      displayHourlyRate={model.displayHourlyRate}
      displayAssumedHours={model.displayAssumedHours}
      {currencyCode}
    />

    <div class="grid gap-5 {model.hasTargetShortfall ? 'md:grid-cols-2' : ''}">
      <Status
        {model}
        {earnedThisMonth}
        {paidThisMonth}
        {currencyCode}
      />

      {#if model.hasTargetShortfall}
        <PacePanel
          {model}
          bind:includeWeekends
          bind:paceHoursMode
          {currencyCode}
        />
      {/if}
    </div>
  </Card.Content>
</Card.Root>
