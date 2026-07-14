<script lang="ts">
  import { Badge } from '$lib/components/ui/badge/index.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Field from '$lib/components/ui/field/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Progress } from '$lib/components/ui/progress/index.js';
  import { forecastEndOfMonth, monthDayProgress } from '$lib/runrate/dates';
  import { clampProgress, formatCurrency } from '$lib/runrate/format';
  import InfoHint from './info-hint.svelte';
  import { kpiInfo } from './kpi-info';

  let {
    monthTarget = $bindable<number | undefined>(undefined),
    earnedThisMonth = 0,
    paidThisMonth = 0,
    asOf = '',
    currencyCode = 'GBP',
    monthLabel = '',
  }: {
    monthTarget?: number | undefined;
    earnedThisMonth?: number;
    paidThisMonth?: number;
    asOf?: string;
    currencyCode?: string;
    monthLabel?: string;
  } = $props();

  const dayProgress = $derived(monthDayProgress(asOf));
  const endOfMonthForecast = $derived(
    dayProgress
      ? forecastEndOfMonth(
          earnedThisMonth,
          dayProgress.daysElapsed,
          dayProgress.daysInMonth,
        )
      : 0,
  );
  const progress = $derived(clampProgress(earnedThisMonth, monthTarget ?? 0));
  const forecastProgress = $derived(
    clampProgress(endOfMonthForecast, monthTarget ?? 0),
  );
  const displayTarget = $derived(
    monthTarget === undefined || Number.isNaN(monthTarget)
      ? ''
      : String(monthTarget),
  );

  function handleInput(event: Event) {
    const value = (event.currentTarget as HTMLInputElement).value;
    if (value.trim() === '') {
      monthTarget = undefined;
      return;
    }
    const parsed = Number(value);
    monthTarget = Number.isFinite(parsed) ? parsed : undefined;
  }
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
      </div>
      <Badge variant="secondary" data-testid="temporary-label">
        Temporary — cleared when the tab closes
      </Badge>
    </div>
  </Card.Header>
  <Card.Content class="space-y-4">
    <Field.Field>
      <Field.Label for="month-target-input">Target amount</Field.Label>
      <Input
        id="month-target-input"
        type="number"
        min="0"
        step="100"
        placeholder="e.g. 12000"
        value={displayTarget}
        oninput={handleInput}
        data-testid="month-target-input"
      />
    </Field.Field>

    <div class="space-y-2">
      <div class="text-muted-foreground flex justify-between text-xs">
        <span
          >Earned this month {formatCurrency(
            earnedThisMonth,
            currencyCode,
          )}</span
        >
        <span class="tabular-nums">{progress}%</span>
      </div>
      <Progress value={progress} max={100} />
      <div
        class="text-muted-foreground flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs"
      >
        <span data-testid="month-forecast">
          Est. end of month {formatCurrency(endOfMonthForecast, currencyCode)}
          {#if dayProgress}
            <span class="text-muted-foreground/80">
              ({dayProgress.daysElapsed} of {dayProgress.daysInMonth} days · {forecastProgress}%
              of target)
            </span>
          {/if}
        </span>
        <span>
          Paid this month: {formatCurrency(paidThisMonth, currencyCode)}
        </span>
      </div>
    </div>
  </Card.Content>
</Card.Root>
