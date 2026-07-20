<script lang="ts">
  import * as Field from '$lib/components/ui/field/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import InfoHint from '../info-hint.svelte';
  import { kpiInfo } from '../kpi-info';
  import { parseOptionalNumber } from './format';

  let {
    monthTarget = $bindable<number | undefined>(undefined),
    hourlyRate = $bindable<number | undefined>(undefined),
    assumedWeekdayHours = $bindable<number | undefined>(undefined),
    displayTarget = '',
    displayHourlyRate = '',
    displayAssumedHours = '',
    currencyCode = 'GBP',
  }: {
    monthTarget?: number | undefined;
    hourlyRate?: number | undefined;
    assumedWeekdayHours?: number | undefined;
    displayTarget?: string;
    displayHourlyRate?: string;
    displayAssumedHours?: string;
    currencyCode?: string;
  } = $props();

  function handleTargetInput(event: Event) {
    monthTarget = parseOptionalNumber(
      (event.currentTarget as HTMLInputElement).value,
    );
  }

  function handleHourlyRateInput(event: Event) {
    hourlyRate = parseOptionalNumber(
      (event.currentTarget as HTMLInputElement).value,
    );
  }

  function handleAssumedHoursInput(event: Event) {
    assumedWeekdayHours = parseOptionalNumber(
      (event.currentTarget as HTMLInputElement).value,
    );
  }
</script>

<div
  class="bg-muted/30 space-y-3 rounded-none border p-3"
  data-testid="hourly-rate-section"
>
  <div class="flex items-center gap-1.5">
    <p class="text-sm font-medium">Setup</p>
    <InfoHint
      label="How hourly rate planning is calculated"
      text={kpiInfo.hourlyRate}
    />
  </div>

  <div class="grid gap-3 sm:grid-cols-3">
    <Field.Field>
      <Field.Label for="month-target-input">Target amount</Field.Label>
      <Input
        id="month-target-input"
        type="number"
        min="0"
        step="100"
        placeholder="e.g. 10000"
        value={displayTarget}
        oninput={handleTargetInput}
        data-testid="month-target-input"
      />
    </Field.Field>

    <Field.Field>
      <Field.Label for="hourly-rate-input"
        >Rate per hour ({currencyCode})</Field.Label
      >
      <Input
        id="hourly-rate-input"
        type="number"
        min="0"
        step="5"
        placeholder="e.g. 50"
        value={displayHourlyRate}
        oninput={handleHourlyRateInput}
        data-testid="hourly-rate-input"
      />
    </Field.Field>

    <Field.Field>
      <Field.Label for="assumed-weekday-hours"
        >Assumed weekday hours/day</Field.Label
      >
      <Input
        id="assumed-weekday-hours"
        type="number"
        min="0.5"
        step="0.5"
        value={displayAssumedHours}
        oninput={handleAssumedHoursInput}
        data-testid="assumed-weekday-hours"
      />
    </Field.Field>
  </div>
</div>
