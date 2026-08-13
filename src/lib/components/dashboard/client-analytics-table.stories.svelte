<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { expect, within } from 'storybook/test';
  import ClientAnalyticsTable from './client-analytics-table.svelte';
  import {
    emptyAnalyticsView,
    sampleAnalyticsView,
    sampleAnalyticsViewMissingRate,
  } from './analytics-fixtures';

  const { Story } = defineMeta({
    title: 'Dashboard/ClientAnalyticsTable',
    component: ClientAnalyticsTable,
    parameters: { layout: 'padded' },
  });
</script>

<Story
  name="WithClients"
  args={{
    view: sampleAnalyticsView,
    currencyCode: 'GBP',
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('client-analytics-table')).toBeInTheDocument();
    await expect(canvas.getByTestId('analytics-studio-row')).toHaveTextContent('Studio');

    const quantum = canvas.getByTestId('analytics-client-Quantum');
    const northwind = canvas.getByTestId('analytics-client-Northwind');
    await expect(quantum).toHaveTextContent('Overshoot');
    await expect(northwind).toHaveTextContent('Headroom');

    const body = canvas.getByTestId('client-analytics-table');
    const quantumIndex = body.textContent?.indexOf('Quantum') ?? -1;
    const northwindIndex = body.textContent?.indexOf('Northwind') ?? -1;
    await expect(quantumIndex).toBeGreaterThan(-1);
    await expect(northwindIndex).toBeGreaterThan(quantumIndex);

    const statuses = canvas.getAllByTestId('analytics-status');
    await expect(statuses.some((el) => el.textContent?.includes('Overshoot'))).toBe(true);
    await expect(statuses.some((el) => el.textContent?.includes('Headroom'))).toBe(true);
  }}
/>

<Story
  name="Empty"
  args={{
    view: emptyAnalyticsView,
    currencyCode: 'GBP',
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/No timesheets or issued invoices/)).toBeInTheDocument();
    await expect(canvas.queryByTestId('analytics-studio-row')).not.toBeInTheDocument();
  }}
/>

<Story
  name="MissingRate"
  args={{
    view: sampleAnalyticsViewMissingRate,
    currencyCode: 'GBP',
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Quantum')).toBeInTheDocument();
    await expect(canvas.getAllByText('Enter hourly rate').length).toBeGreaterThan(0);
    await expect(canvas.queryByText('Overshoot')).not.toBeInTheDocument();
  }}
/>
