<script lang="ts">
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Switch } from '$lib/components/ui/switch/index.js';
  import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
  import { formatCurrency } from '$lib/runrate/format';
  import type { PaceHoursMode } from '$lib/runrate/session-config';
  import { formatHoursPerDay, formatWorkDays } from './format';
  import type { MonthTargetModel } from './model';

  let {
    model,
    includeWeekends = $bindable(false),
    paceHoursMode = $bindable<PaceHoursMode>('even-spread'),
    currencyCode = 'GBP',
  }: {
    model: MonthTargetModel;
    includeWeekends?: boolean;
    paceHoursMode?: PaceHoursMode;
    currencyCode?: string;
  } = $props();

  function handlePaceHoursModeChange(value: string | undefined) {
    if (value === 'even-spread' || value === 'assumed-hours') {
      paceHoursMode = value;
    }
  }
</script>

<div
  class="space-y-4 border-t pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-5"
  data-testid="pace-to-target"
>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 justify-between">
      <p class="text-sm font-medium">To hit target</p>
      <label
        class="text-muted-foreground flex items-center gap-2 text-xs"
        for="include-weekends"
      >
        <span>Include weekends</span>
        <Switch
          id="include-weekends"
          bind:checked={includeWeekends}
          data-testid="include-weekends"
        />
      </label>
    </div>

    <ToggleGroup.Root
      type="single"
      variant="outline"
      size="sm"
      value={paceHoursMode}
      onValueChange={handlePaceHoursModeChange}
      aria-label="Hours pace mode"
      data-testid="pace-hours-mode"
      class="h-8 w-full max-w-full"
    >
      <ToggleGroup.Item
        value="even-spread"
        class="h-full min-w-0 flex-1 shrink px-2! text-xs"
        data-testid="pace-hours-even-spread"
      >
        Even spread
      </ToggleGroup.Item>
      <ToggleGroup.Item
        value="assumed-hours"
        class="h-full min-w-0 flex-1 shrink px-2! text-xs"
        data-testid="pace-hours-assumed"
      >
        Assumed hours
      </ToggleGroup.Item>
    </ToggleGroup.Root>
  </div>

  <div class="grid gap-3 sm:grid-cols-2">
    <div data-testid="required-daily-earn">
      <p class="text-muted-foreground text-xs">Per day</p>
      {#if model.showAssumedHoursMode}
        {#if !model.hasHourlyRate}
          <p class="text-muted-foreground text-sm">Enter hourly rate</p>
        {:else if model.dailyEarnNeeded !== null && model.daysLeftForDisplay !== null}
          <p class="text-foreground text-xl tabular-nums">
            {formatCurrency(model.dailyEarnNeeded, currencyCode)}/day
          </p>
          <p class="text-muted-foreground text-xs">
            {formatWorkDays(model.daysLeftForDisplay)} to hit target
          </p>
        {:else}
          <p class="text-muted-foreground text-sm">
            Cannot compute daily earn.
          </p>
        {/if}
      {:else if model.dailyEarnNeeded !== null && model.daysLeftForDisplay !== null}
        <p class="text-foreground text-xl tabular-nums">
          {formatCurrency(model.dailyEarnNeeded, currencyCode)}/day
        </p>
        <p class="text-muted-foreground text-xs">
          {model.daysLeftForDisplay}
          {model.remainingDayLabel} left
        </p>
      {:else}
        <p class="text-muted-foreground text-sm">
          No remaining {model.remainingDayLabel} left this month.
        </p>
      {/if}
    </div>

    <div data-testid="even-spread-hours">
      <p class="text-muted-foreground text-xs">
        {model.showAssumedHoursMode ? 'Assumed hours' : 'Even spread'}
      </p>
      {#if !model.hasHourlyRate}
        <p class="text-muted-foreground text-sm">Enter hourly rate</p>
      {:else if model.showAssumedHoursMode}
        {#if model.assumedWorkDays !== null}
          <p
            class="text-foreground text-xl tabular-nums"
            data-testid="assumed-work-days"
          >
            {formatWorkDays(model.assumedWorkDays)}
          </p>
          <p class="text-muted-foreground text-xs">
            at {model.resolvedAssumedHours}h/day
          </p>
        {:else}
          <p class="text-muted-foreground text-sm">Cannot compute work days.</p>
        {/if}
      {:else if model.evenSpreadHours !== null}
        <p class="text-foreground text-xl tabular-nums">
          {formatHoursPerDay(model.evenSpreadHours)}
        </p>
        <p class="text-muted-foreground text-xs">
          across remaining {model.remainingDayLabel}
        </p>
      {:else}
        <p class="text-muted-foreground text-sm">
          Cannot compute hours — no remaining days.
        </p>
      {/if}
      {#if model.weekendStats}
        <p
          class="text-muted-foreground/80 mt-1 text-xs"
          data-testid="weekend-planning-counts"
        >
          {model.weekendStats.weekendsRemaining} weekends left ({model
            .weekendStats.weekendDaysRemaining} days)
        </p>
      {/if}
    </div>
  </div>

  <div class="space-y-1.5" data-testid="capacity-overflow">
    <p class="text-muted-foreground text-xs">Capacity</p>
    {#if !model.hasHourlyRate}
      <p class="text-muted-foreground text-xs">
        Enter hourly rate to check weekend capacity.
      </p>
    {:else if model.overflow}
      <p class="text-muted-foreground text-xs">
        Weekday capacity: {formatCurrency(
          model.overflow.weekdayCapacity,
          currencyCode,
        )} at {model.resolvedAssumedHours}h/day
      </p>
      {#if model.overflow.weekdaysAloneEnough}
        <Badge variant="default" data-testid="overflow-result"
          >Weekdays enough</Badge
        >
      {:else if model.overflow.exceedsRemainingWeekends}
        <p data-testid="overflow-result">
          <Badge variant="destructive">Exceeds remaining weekends</Badge>
          <Badge variant="default" class="block mt-0.5">
            Need {model.overflow.weekendDaysNeeded} of {model.weekendStats
              ?.weekendDaysRemaining ?? 0} weekend days
          </Badge>
        </p>
      {:else}
        <p data-testid="overflow-result">
          <Badge
            >Need {model.overflow.weekendDaysNeeded} of {model.weekendStats
              ?.weekendDaysRemaining ?? 0} weekend days</Badge
          >
        </p>
      {/if}
    {/if}
  </div>
</div>
