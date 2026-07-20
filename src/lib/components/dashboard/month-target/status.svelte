<script lang="ts">
  import { Progress } from '$lib/components/ui/progress/index.js';
  import { formatCurrency } from '$lib/runrate/format';
  import type { MonthTargetModel } from './model';

  let {
    model,
    earnedThisMonth = 0,
    paidThisMonth = 0,
    currencyCode = 'GBP',
  }: {
    model: MonthTargetModel;
    earnedThisMonth?: number;
    paidThisMonth?: number;
    currencyCode?: string;
  } = $props();
</script>

<div class="space-y-4">
  <div class="space-y-2">
    <div class="flex items-baseline justify-between gap-2">
      <div>
        <p class="text-muted-foreground text-xs">Earned this month</p>
        <p class="text-foreground text-xl tabular-nums">
          {formatCurrency(earnedThisMonth, currencyCode)}
        </p>
      </div>
      <p class="text-foreground text-lg tabular-nums">{model.progress}%</p>
    </div>
    <Progress value={model.progress} max={100} />
    <p class="text-muted-foreground text-xs">
      Paid this month: {formatCurrency(paidThisMonth, currencyCode)}
    </p>
    {#if model.isOnTarget}
      <p
        class="text-foreground text-xs font-medium"
        data-testid="on-target"
      >
        On target
      </p>
    {/if}
  </div>

  <div class="space-y-2 border-t pt-4" data-testid="month-forecast">
    <p class="text-sm font-medium">On current pace</p>
    <div class="grid gap-2 sm:grid-cols-2">
      <div
        class="border-border/80 space-y-1 border p-3"
        data-testid="month-forecast-weekdays"
      >
        <p class="text-muted-foreground text-xs">Weekdays</p>
        <p class="text-foreground text-lg tabular-nums">
          {formatCurrency(model.endOfMonthForecastWeekdays, currencyCode)}
        </p>
        <p class="text-muted-foreground text-xs">
          {model.forecastProgressWeekdays}% of target
          {#if model.weekProgress}
            <span class="text-muted-foreground/80">
              · {model.weekProgress.weekdaysElapsed} of {model.weekProgress
                .weekdaysInMonth} weekdays
            </span>
          {/if}
        </p>
      </div>
      <div
        class="border-border/60 text-muted-foreground space-y-1 border p-3"
        data-testid="month-forecast-all-days"
      >
        <p class="text-xs">All days</p>
        <p class="text-foreground text-lg tabular-nums">
          {formatCurrency(model.endOfMonthForecastAllDays, currencyCode)}
        </p>
        <p class="text-xs">
          {model.forecastProgressAllDays}% of target
          {#if model.dayProgress}
            <span class="text-muted-foreground/80">
              · {model.dayProgress.daysElapsed} of {model.dayProgress
                .daysInMonth} days
            </span>
          {/if}
        </p>
      </div>
    </div>
  </div>
</div>
