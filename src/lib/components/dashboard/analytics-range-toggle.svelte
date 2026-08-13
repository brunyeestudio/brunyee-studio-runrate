<script lang="ts">
  import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
  import {
    DEFAULT_ANALYTICS_RANGE_PRESET,
    type AnalyticsRangePreset,
  } from '$lib/runrate/analytics';

  const PRESETS: { value: AnalyticsRangePreset; label: string }[] = [
    { value: '7d', label: '7d' },
    { value: '1m', label: '1m' },
    { value: '3m', label: '3m' },
    { value: '6m', label: '6m' },
    { value: '1y', label: '1y' },
  ];

  let {
    preset = $bindable<AnalyticsRangePreset>(DEFAULT_ANALYTICS_RANGE_PRESET),
  }: {
    preset?: AnalyticsRangePreset;
  } = $props();

  function handleValueChange(value: string | undefined) {
    if (
      value === '7d' ||
      value === '1m' ||
      value === '3m' ||
      value === '6m' ||
      value === '1y'
    ) {
      preset = value;
    }
  }
</script>

<ToggleGroup.Root
  type="single"
  variant="outline"
  size="sm"
  value={preset}
  onValueChange={handleValueChange}
  aria-label="Analytics range"
  data-testid="analytics-range"
  class="h-8"
>
  {#each PRESETS as option (option.value)}
    <ToggleGroup.Item
      value={option.value}
      class="h-full px-2.5 text-xs"
      data-testid={`analytics-range-${option.value}`}
    >
      {option.label}
    </ToggleGroup.Item>
  {/each}
</ToggleGroup.Root>
