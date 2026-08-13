<script lang="ts">
  import { onMount } from 'svelte';
  import { replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import DashboardView from '$lib/components/dashboard/dashboard-view.svelte';
  import {
    DEFAULT_ANALYTICS_RANGE_PRESET,
    isAnalyticsRangePreset,
    resolveAnalyticsRange,
    type AnalyticsRangePreset,
  } from '$lib/runrate/analytics';
  import type { AnalyticsSnapshot, DashboardSnapshot } from '$lib/runrate/types';
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

  let view = $state<'runrate' | 'analytics'>(
    page.url.searchParams.get('view') === 'analytics' ? 'analytics' : 'runrate',
  );
  let analyticsSnapshot = $state<AnalyticsSnapshot | null>(null);
  let analyticsLoading = $state(false);
  let analyticsError = $state<string | null>(null);
  let analyticsRangePreset = $state<AnalyticsRangePreset>(
    DEFAULT_ANALYTICS_RANGE_PRESET,
  );
  let fetchedAnalyticsPreset = $state<AnalyticsRangePreset | null>(null);

  function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

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

  function canFetchAnalytics(): boolean {
    if (errorCode === 'ZOHO_AUTH') return false;
    if (page.url.searchParams.get('authError')) return false;
    if (loading && !snapshot) return false;
    if (!connected && !snapshot) return false;
    return true;
  }

  async function loadAnalytics() {
    if (!canFetchAnalytics()) return;

    const preset = analyticsRangePreset;
    const today = snapshot?.asOf.slice(0, 10) ?? todayIso();
    const { from, to } = resolveAnalyticsRange(preset, today);

    // Record attempted preset before the request so failures do not re-trigger
    // the analytics $effect until the preset or tab changes.
    fetchedAnalyticsPreset = preset;
    analyticsLoading = true;
    analyticsError = null;
    try {
      const response = await fetch(`/api/analytics?from=${from}&to=${to}`);
      const data = await response.json();
      if (!response.ok) {
        analyticsError =
          typeof data.error === 'string'
            ? data.error
            : 'Failed to load analytics';
        if (typeof data.code === 'string' && data.code === 'ZOHO_AUTH') {
          errorCode = 'ZOHO_AUTH';
          error =
            typeof data.error === 'string'
              ? data.error
              : 'Zoho Books is not connected. Connect to continue.';
          connected = false;
          snapshot = null;
        }
        analyticsSnapshot = null;
        return;
      }
      analyticsSnapshot = data as AnalyticsSnapshot;
    } catch (err) {
      analyticsError =
        err instanceof Error ? err.message : 'Failed to load analytics';
      analyticsSnapshot = null;
    } finally {
      analyticsLoading = false;
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
      analyticsSnapshot = null;
      analyticsError = null;
      fetchedAnalyticsPreset = null;
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
    if (isAnalyticsRangePreset(config.analyticsRangePreset)) {
      analyticsRangePreset = config.analyticsRangePreset;
    }
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
      analyticsRangePreset,
    });
  });

  $effect(() => {
    if (!hydrated) return;
    if (view !== 'analytics') return;
    if (!canFetchAnalytics()) return;
    if (fetchedAnalyticsPreset === analyticsRangePreset) return;
    void loadAnalytics();
  });

  $effect(() => {
    if (!hydrated) return;
    const url = new URL(page.url);
    if (view === 'analytics') {
      if (url.searchParams.get('view') !== 'analytics') {
        url.searchParams.set('view', 'analytics');
        replaceState(url, page.state);
      }
    } else if (url.searchParams.has('view')) {
      url.searchParams.delete('view');
      replaceState(url, page.state);
    }
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
  bind:view
  {analyticsSnapshot}
  {analyticsLoading}
  {analyticsError}
  bind:rangePreset={analyticsRangePreset}
  ondisconnect={disconnectZoho}
  onrefresh={loadDashboard}
  onanalyticsrefresh={loadAnalytics}
/>
