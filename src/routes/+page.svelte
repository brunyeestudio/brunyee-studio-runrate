<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import DashboardView from '$lib/components/dashboard/dashboard-view.svelte';
  import type { DashboardSnapshot } from '$lib/runrate/types';
  import {
    type PaceHoursMode,
    readTempConfig,
    writeTempConfig,
  } from '$lib/runrate/session-config';

  let snapshot = $state<DashboardSnapshot | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let errorCode = $state<string | null>(null);
  let connected = $state(false);
  let monthTarget = $state<number | undefined>(undefined);
  let hourlyRate = $state<number | undefined>(undefined);
  let includeWeekends = $state(false);
  let assumedWeekdayHours = $state<number | undefined>(undefined);
  let paceHoursMode = $state<PaceHoursMode>('even-spread');
  let hydrated = $state(false);

  async function loadDashboard() {
    loading = true;
    error = null;
    errorCode = null;
    try {
      const response = await fetch('/api/dashboard');
      const data = await response.json();
      if (!response.ok) {
        error =
          typeof data.error === 'string'
            ? data.error
            : 'Failed to load dashboard';
        errorCode = typeof data.code === 'string' ? data.code : null;
        snapshot = null;
        connected = errorCode !== 'ZOHO_AUTH';
        return;
      }
      snapshot = data as DashboardSnapshot;
      connected = true;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load dashboard';
      errorCode = null;
      snapshot = null;
      connected = false;
    } finally {
      loading = false;
    }
  }

  async function disconnectZoho() {
    loading = true;
    try {
      await fetch('/api/auth/zoho/logout', { method: 'POST' });
      snapshot = null;
      connected = false;
      error = 'Zoho Books is not connected. Connect to continue.';
      errorCode = 'ZOHO_AUTH';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to disconnect Zoho';
      errorCode = null;
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    const config = readTempConfig();
    monthTarget = config.monthTarget;
    hourlyRate = config.hourlyRate;
    includeWeekends = config.includeWeekends ?? false;
    assumedWeekdayHours = config.assumedWeekdayHours;
    paceHoursMode = config.paceHoursMode ?? 'even-spread';
    hydrated = true;

    const authError = page.url.searchParams.get('authError');
    if (authError) {
      error = authError;
      errorCode = null;
      loading = false;
      return;
    }

    void loadDashboard();
  });

  $effect(() => {
    if (!hydrated) return;
    writeTempConfig({
      monthTarget,
      hourlyRate,
      includeWeekends,
      assumedWeekdayHours,
      paceHoursMode,
    });
  });
</script>

<DashboardView
  {snapshot}
  {loading}
  {error}
  {errorCode}
  {connected}
  bind:monthTarget
  bind:hourlyRate
  bind:includeWeekends
  bind:assumedWeekdayHours
  bind:paceHoursMode
  ondisconnect={disconnectZoho}
  onrefresh={loadDashboard}
/>
