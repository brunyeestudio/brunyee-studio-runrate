<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  import ArrowClockwiseIcon from 'phosphor-svelte/lib/ArrowClockwise';
  import SignOutIcon from 'phosphor-svelte/lib/SignOut';

  let {
    monthLabel,
    loading = false,
    connected = false,
    ondisconnect,
    onrefresh,
  }: {
    monthLabel: string;
    loading?: boolean;
    connected?: boolean;
    ondisconnect?: () => void;
    onrefresh?: () => void;
  } = $props();
</script>

<header
  class="flex flex-wrap items-end justify-between gap-4"
  data-testid="dashboard-header"
>
  <div class="space-y-1">
    <p
      class="text-muted-foreground text-[0.625rem] font-semibold tracking-[0.2em] uppercase"
    >
      Brunyee Studio
    </p>
    <h1 class="text-3xl font-medium tracking-tight">Runrate</h1>
    <p class="text-muted-foreground text-sm">
      In-month overview · {monthLabel}
    </p>
  </div>
  <div class="flex flex-wrap items-center gap-2">
    {#if connected}
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        data-testid="disconnect-zoho"
        onclick={() => ondisconnect?.()}
      >
        <SignOutIcon />
        Disconnect Zoho
      </Button>
    {/if}
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onclick={() => onrefresh?.()}
    >
      <ArrowClockwiseIcon class={loading ? 'animate-spin' : ''} />
      Refresh
    </Button>
  </div>
</header>
