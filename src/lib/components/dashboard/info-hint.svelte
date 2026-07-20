<script lang="ts">
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';
  import InfoIcon from 'phosphor-svelte/lib/Info';

  let {
    label,
    text,
  }: {
    label: string;
    text: string;
  } = $props();
</script>

<Tooltip.Provider delayDuration={200}>
  <Tooltip.Root>
    <Tooltip.Trigger
      type="button"
      class="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex size-4 shrink-0 items-center justify-center rounded-sm outline-none focus-visible:ring-2"
      aria-label={label}
      data-testid="info-hint"
    >
      <InfoIcon class="size-3.5" weight="bold" aria-hidden="true" />
    </Tooltip.Trigger>
    <Tooltip.Content
      side="top"
      sideOffset={4}
      class="max-w-64 text-left leading-snug"
      data-testid="info-hint-tooltip"
    >
      {text}
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
