<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { expect, within } from 'storybook/test';
  import AnalyticsView from './analytics-view.svelte';
  import {
    emptyAnalyticsSnapshot,
    sampleAnalyticsSnapshot,
  } from './analytics-fixtures';

  const { Story } = defineMeta({
    title: 'Dashboard/AnalyticsView',
    component: AnalyticsView,
    parameters: { layout: 'padded' },
  });
</script>

<Story
  name="Loaded"
  args={{
    snapshot: sampleAnalyticsSnapshot,
    loading: false,
    error: null,
    hourlyRate: 100,
    rangePreset: '1m',
    currencyCode: 'GBP',
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('analytics-view')).toBeInTheDocument();
    await expect(canvas.getByTestId('temporary-label')).toHaveTextContent(
      'Temporary — cleared when the tab closes',
    );
    await expect(canvas.getByTestId('analytics-period')).toHaveTextContent(
      '15 Jul 2026 – 13 Aug 2026 vs previous 15 Jun 2026 – 14 Jul 2026',
    );
    await expect(canvas.getByTestId('analytics-kpis')).toBeInTheDocument();

    const badges = canvas.getAllByTestId('source-badge');
    await expect(
      badges.some((el) => el.textContent?.includes('Timesheets')),
    ).toBe(true);
    await expect(badges.some((el) => el.textContent?.includes('Issued'))).toBe(
      true,
    );

    await expect(canvas.getByText('Hours spent')).toBeInTheDocument();
    await expect(canvas.getByText('Issued revenue')).toBeInTheDocument();
    await expect(canvas.getByTestId('analytics-client-Quantum')).toBeInTheDocument();
    await expect(canvas.getByTestId('analytics-client-Quantum')).toHaveTextContent(
      'Overshoot',
    );
  }}
/>

<Story
  name="Empty range"
  args={{
    snapshot: emptyAnalyticsSnapshot,
    loading: false,
    error: null,
    hourlyRate: 100,
    rangePreset: '1m',
    currencyCode: 'GBP',
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('analytics-view')).toBeInTheDocument();
    await expect(
      canvas.getByText(/No timesheets or issued invoices/),
    ).toBeInTheDocument();
    await expect(
      canvas.queryByTestId('analytics-studio-row'),
    ).not.toBeInTheDocument();
  }}
/>

<Story
  name="Missing rate"
  args={{
    snapshot: sampleAnalyticsSnapshot,
    loading: false,
    error: null,
    hourlyRate: undefined,
    rangePreset: '1m',
    currencyCode: 'GBP',
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Quantum')).toBeInTheDocument();
    await expect(
      canvas.getAllByText('Enter hourly rate').length,
    ).toBeGreaterThan(0);
    await expect(canvas.getByTestId('analytics-kpi-hours-vs-sold')).toHaveTextContent(
      'Enter hourly rate',
    );
    await expect(
      canvas.getByTestId('analytics-kpi-effective-rate'),
    ).toHaveTextContent('Enter hourly rate');
    await expect(canvas.queryByText('Overshoot')).not.toBeInTheDocument();
  }}
/>

<Story
  name="Error"
  args={{
    snapshot: null,
    loading: false,
    error: 'Zoho time entries request failed',
    hourlyRate: 100,
    rangePreset: '1m',
    currencyCode: 'GBP',
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('analytics-error')).toBeInTheDocument();
    await expect(
      canvas.getByText(/Zoho time entries request failed/),
    ).toBeInTheDocument();
    await expect(canvas.queryByTestId('analytics-kpis')).not.toBeInTheDocument();
  }}
/>
