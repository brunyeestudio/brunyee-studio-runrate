<script lang="ts" generics="T = never">
  import { Tooltip as TooltipPrimitive } from 'bits-ui';
  import { getContext } from 'svelte';
  import {
    TOOLTIP_OPEN_CONTEXT,
    type TooltipOpenContext,
  } from './tooltip-open-context.js';

  let {
    ref = $bindable(null),
    onpointerup,
    ...restProps
  }: TooltipPrimitive.TriggerProps<T> = $props();

  const tooltipOpen = getContext<TooltipOpenContext | undefined>(
    TOOLTIP_OPEN_CONTEXT,
  );

  const handlePointerUp: typeof onpointerup = (event) => {
    // bits-ui skips touch for hover; toggle so tips work on mobile.
    if (event.pointerType === 'touch' && tooltipOpen) {
      tooltipOpen.setOpen(!tooltipOpen.getOpen());
    }
    onpointerup?.(event);
  };
</script>

<TooltipPrimitive.Trigger
  bind:ref
  data-slot="tooltip-trigger"
  onpointerup={handlePointerUp}
  {...restProps}
/>
