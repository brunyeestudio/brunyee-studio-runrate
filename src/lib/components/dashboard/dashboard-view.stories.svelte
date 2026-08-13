<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { expect, userEvent, within } from 'storybook/test';
  import { sampleAnalyticsSnapshot } from './analytics-fixtures';
  import DashboardView from './dashboard-view.svelte';
  import { sampleSnapshot } from './fixtures';

  const { Story } = defineMeta({
    title: 'Dashboard/DashboardView',
    component: DashboardView,
    parameters: { layout: 'fullscreen' },
  });
</script>

<Story
  name="Loaded"
  args={{
    snapshot: sampleSnapshot,
    loading: false,
    error: null,
    errorCode: null,
    connected: true,
    monthTarget: 12000,
    analyticsSnapshot: sampleAnalyticsSnapshot,
    analyticsLoading: false,
    analyticsError: null,
    hourlyRate: 100,
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('dashboard')).toBeInTheDocument();
    await expect(
      canvas.getByRole('heading', { name: 'Runrate' }),
    ).toBeInTheDocument();
    await expect(canvas.getByTestId('app-tabs')).toBeInTheDocument();
    await expect(
      canvas.getAllByTestId('temporary-label').length,
    ).toBeGreaterThanOrEqual(1);
    await expect(
      canvas.getAllByText('Paid this month').length,
    ).toBeGreaterThanOrEqual(1);
    await expect(canvas.getByText('Earned last month')).toBeInTheDocument();
    await expect(canvas.getByTestId('kpi-payment-split')).toHaveTextContent(
      /£0\.00 paid.*£850\.00 outstanding/,
    );
    await expect(
      canvas.getAllByText(/Earned this month/).length,
    ).toBeGreaterThanOrEqual(1);
    await expect(
      canvas.getAllByText('Outstanding').length,
    ).toBeGreaterThanOrEqual(1);
    await expect(canvas.getByTestId('month-forecast')).toBeInTheDocument();
    await expect(
      canvas.getByTestId('month-forecast-weekdays'),
    ).toBeInTheDocument();
    await expect(
      canvas.getByTestId('month-forecast-all-days'),
    ).toBeInTheDocument();
    await expect(canvas.queryByText('Payment timing')).not.toBeInTheDocument();
    await expect(canvas.getByTestId('disconnect-zoho')).toBeInTheDocument();

    const kpiTriggers = canvas.getAllByTestId('kpi-details-trigger');
    await expect(kpiTriggers.length).toBeGreaterThanOrEqual(4);
    await userEvent.click(kpiTriggers[0]);
    await expect(kpiTriggers[0]).toHaveAttribute('aria-expanded', 'true');
    const invoice = await canvas.findByText('INV-0998');
    await expect(invoice.closest('[hidden]')).toBeNull();
    await expect(canvas.getByText(/Fabrikam/)).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('tab', { name: 'Analytics' }));
    await expect(canvas.getByTestId('analytics-view')).toBeInTheDocument();
  }}
/>

<Story
  name="AnalyticsTab"
  args={{
    snapshot: sampleSnapshot,
    loading: false,
    error: null,
    errorCode: null,
    connected: true,
    monthTarget: 12000,
    view: 'runrate',
    analyticsSnapshot: sampleAnalyticsSnapshot,
    analyticsLoading: false,
    analyticsError: null,
    hourlyRate: 100,
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('app-tabs')).toBeInTheDocument();
    await expect(
      canvas.queryByTestId('analytics-view'),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('tab', { name: 'Analytics' }));
    await expect(canvas.getByTestId('analytics-view')).toBeInTheDocument();
    await expect(canvas.getByTestId('analytics-range')).toBeInTheDocument();
    await expect(canvas.getByText('Quantum')).toBeInTheDocument();
  }}
/>

<Story
  name="NeedsConnect"
  args={{
    snapshot: null,
    loading: false,
    error: 'Zoho Books is not connected. Connect to continue.',
    errorCode: 'ZOHO_AUTH',
    connected: false,
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('zoho-connect')).toBeInTheDocument();
    await expect(canvas.getByTestId('connect-zoho')).toBeInTheDocument();
    await expect(
      canvas.queryByTestId('dashboard-error'),
    ).not.toBeInTheDocument();
    await expect(canvas.getByTestId('app-tabs')).toBeInTheDocument();
  }}
/>

<Story
  name="ErrorState"
  args={{
    snapshot: null,
    loading: false,
    error: 'Missing required environment variable: ZOHO_CLIENT_ID',
    errorCode: 'ZOHO_ENV',
    connected: false,
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('dashboard-error')).toBeInTheDocument();
    await expect(canvas.getByText(/ZOHO_CLIENT_ID/)).toBeInTheDocument();
  }}
/>
