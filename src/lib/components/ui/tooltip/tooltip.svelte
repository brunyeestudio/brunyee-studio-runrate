<script lang="ts" generics="T = never">
  import { Tooltip as TooltipPrimitive } from 'bits-ui';
  import { setContext } from 'svelte';
  import {
    TOOLTIP_OPEN_CONTEXT,
    type TooltipOpenContext,
  } from './tooltip-open-context.js';

  let {
    open = $bindable(false),
    // Keep the tooltip open through the click that follows a touch toggle.
    disableCloseOnTriggerClick = true,
    ...restProps
  }: TooltipPrimitive.RootProps<T> = $props();

  setContext<TooltipOpenContext>(TOOLTIP_OPEN_CONTEXT, {
    getOpen: () => open,
    setOpen: (next) => {
      open = next;
    },
  });

  // bits-ui skips touch hover and outside-dismiss is unreliable after a
  // controlled touch open — close when the user presses elsewhere.
  $effect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        open = false;
        return;
      }

      if (target.closest('[data-slot="tooltip-content"]')) return;

      const openTrigger = target.closest(
        '[data-slot="tooltip-trigger"][data-state="instant-open"], [data-slot="tooltip-trigger"][data-state="delayed-open"]',
      );
      if (openTrigger) return;

      open = false;
    };

    // Attach after this gesture so the opening touch doesn't dismiss immediately.
    const timeoutId = window.setTimeout(() => {
      document.addEventListener('pointerdown', handlePointerDown);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  });
</script>

<TooltipPrimitive.Root
  bind:open
  {disableCloseOnTriggerClick}
  {...restProps}
/>
