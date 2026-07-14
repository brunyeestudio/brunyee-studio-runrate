<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { expect, userEvent, within } from 'storybook/test';
  import { sampleInvoices, sampleProjects, sampleSnapshot } from './fixtures';
  import KpiCard from './kpi-card.svelte';
  import { kpiInfo } from './kpi-info';

  const { Story } = defineMeta({
    title: 'Dashboard/KpiCard',
    component: KpiCard,
    parameters: { layout: 'padded' },
  });
</script>

<Story
  name="CashCollected"
  args={{
    title: 'Cash collected',
    amount: 3100,
    source: 'Cash collected',
    count: 1,
    currencyCode: 'GBP',
    byCurrency: sampleSnapshot.kpis.cashCollected.byCurrency,
    info: kpiInfo.cashCollected,
    invoices: [sampleInvoices[2]],
    amountField: 'total',
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('kpi-card')).toBeInTheDocument();
    await expect(canvas.getByTestId('source-badge')).toHaveTextContent(
      'Cash collected',
    );
    await expect(canvas.getByTestId('kpi-card')).toHaveTextContent(/£3,100/);
    await expect(
      canvas.getByRole('button', { name: 'How Cash collected is calculated' }),
    ).toBeInTheDocument();

    const trigger = canvas.getByTestId('kpi-details-trigger');
    await expect(trigger).toHaveTextContent('1 item');
    await userEvent.click(trigger);
    await expect(
      await canvas.findByTestId('invoice-detail-list'),
    ).toBeInTheDocument();
    await expect(canvas.getByText('INV-0998')).toBeInTheDocument();
    await expect(canvas.getByText(/Fabrikam/)).toBeInTheDocument();
  }}
/>

<Story
  name="EarnedPipelineBreakdown"
  args={{
    title: 'Earned pipeline',
    amount: 6787.5,
    source: 'Draft invoices',
    count: 2,
    currencyCode: 'GBP',
    byCurrency: sampleSnapshot.kpis.earnedPipeline.byCurrency,
    info: kpiInfo.earnedPipeline,
    breakdown: sampleSnapshot.kpis.earnedPipelineBreakdown,
    invoices: [sampleInvoices[1]],
    projects: sampleProjects,
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByTestId('kpi-details-trigger');
    await userEvent.click(trigger);
    await expect(
      await canvas.findByTestId('kpi-breakdown'),
    ).toBeInTheDocument();
    await expect(
      canvas.getAllByText('Projects (hourly)').length,
    ).toBeGreaterThanOrEqual(2);
    await expect(
      canvas.getAllByText('Draft invoices').length,
    ).toBeGreaterThanOrEqual(1);
    await expect(canvas.getByTestId('invoice-detail-list')).toBeInTheDocument();
    await expect(canvas.getByTestId('project-detail-list')).toBeInTheDocument();
    await expect(canvas.getByText('DRAFT-44')).toBeInTheDocument();
    await expect(canvas.getByText('Platform retainers')).toBeInTheDocument();
  }}
/>

<Story
  name="MixedCurrencyOutstanding"
  args={{
    title: 'Outstanding',
    amount: sampleSnapshot.kpis.outstandingBalance.amount,
    source: 'Outstanding',
    count: 2,
    currencyCode: 'GBP',
    byCurrency: sampleSnapshot.kpis.outstandingBalance.byCurrency,
    info: kpiInfo.outstanding,
    invoices: sampleSnapshot.buckets.outstanding.invoices,
    amountField: 'balance',
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('kpi-card')).toHaveTextContent(/£5,050/);

    const amountTrigger = canvas.getByTestId('currency-amount-trigger');
    await userEvent.hover(amountTrigger);
    const tooltip = await within(document.body).findByTestId(
      'currency-amount-tooltip',
    );
    await expect(tooltip).toHaveTextContent(/£4,200/);
    await expect(tooltip).toHaveTextContent(/€1,000/);

    await userEvent.click(canvas.getByTestId('kpi-details-trigger'));
    await expect(
      await canvas.findByTestId('currency-breakdown'),
    ).toBeInTheDocument();
    await expect(canvas.getByText('EUR')).toBeInTheDocument();
    await expect(canvas.getByText('INV-EUR-12')).toBeInTheDocument();
  }}
/>
