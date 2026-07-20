<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { expect, userEvent, within } from 'storybook/test';
  import MonthTargetInput from './month-target-input.svelte';

  const { Story } = defineMeta({
    title: 'Dashboard/MonthTargetInput',
    component: MonthTargetInput,
    parameters: { layout: 'padded' },
  });
</script>

<Story
  name="TemporaryLabel"
  args={{
    monthTarget: 12000,
    hourlyRate: 100,
    includeWeekends: false,
    assumedWeekdayHours: 8,
    earnedThisMonth: 6787.5,
    paidThisMonth: 3100,
    asOf: '2026-07-14T10:00:00.000Z',
    currencyCode: 'GBP',
    monthLabel: 'July 2026',
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('temporary-label')).toHaveTextContent(
      /Temporary/,
    );
    await expect(canvas.getByTestId('month-remaining-days')).toHaveTextContent(
      /13 weekdays remaining · 2 weekends remaining/,
    );
    await expect(canvas.getByTestId('month-target-input')).toBeInTheDocument();
    await expect(
      canvas.getByTestId('assumed-weekday-hours'),
    ).toBeInTheDocument();
    await expect(canvas.getByTestId('month-forecast')).toHaveTextContent(
      /On current pace/,
    );
    await expect(
      canvas.getByTestId('month-forecast-weekdays'),
    ).toHaveTextContent(/Weekdays/);
    await expect(
      canvas.getByTestId('month-forecast-all-days'),
    ).toHaveTextContent(/All days/);
    await expect(canvas.getByTestId('pace-to-target')).toHaveTextContent(
      /To hit target/,
    );
    await expect(canvas.getByTestId('required-daily-earn')).toHaveTextContent(
      /workdays left/,
    );
    await expect(canvas.getByTestId('even-spread-hours')).toBeInTheDocument();
    await expect(canvas.getByTestId('pace-hours-mode')).toBeInTheDocument();
    await expect(canvas.getByTestId('even-spread-hours')).toHaveTextContent(
      /h\/day/,
    );
    await expect(canvas.getByTestId('capacity-overflow')).toBeInTheDocument();
    await expect(canvas.getByTestId('overflow-result')).toBeInTheDocument();

    await userEvent.click(canvas.getByTestId('pace-hours-assumed'));
    await expect(canvas.getByTestId('assumed-work-days')).toBeInTheDocument();
    await expect(canvas.getByTestId('even-spread-hours')).toHaveTextContent(
      /work days/,
    );
    await expect(canvas.getByTestId('even-spread-hours')).toHaveTextContent(
      /at 8h\/day/,
    );
    // Assumed hours: per day = rate × hours (£100 × 8h), days = shortfall / that.
    await expect(canvas.getByTestId('required-daily-earn')).toHaveTextContent(
      /£800\.00\/day/,
    );
    await expect(canvas.getByTestId('required-daily-earn')).toHaveTextContent(
      /work days to hit target/,
    );

    await userEvent.click(canvas.getByTestId('pace-hours-even-spread'));
    await expect(canvas.getByTestId('even-spread-hours')).toHaveTextContent(
      /h\/day/,
    );
    await expect(
      canvas.queryByTestId('assumed-work-days'),
    ).not.toBeInTheDocument();
    await expect(canvas.getByTestId('required-daily-earn')).toHaveTextContent(
      /workdays left/,
    );

    const weekendsSwitch = canvas.getByTestId('include-weekends');
    await userEvent.click(weekendsSwitch);
    await expect(canvas.getByTestId('required-daily-earn')).toHaveTextContent(
      /\d+ days left/,
    );
    await expect(
      canvas.getByTestId('required-daily-earn'),
    ).not.toHaveTextContent(/workdays/);

    const input = canvas.getByTestId('month-target-input');
    await userEvent.clear(input);
    await userEvent.type(input, '15000');
    await expect(input).toHaveValue(15000);
  }}
/>

<Story
  name="OnTarget"
  args={{
    monthTarget: 5000,
    hourlyRate: 100,
    includeWeekends: false,
    assumedWeekdayHours: 8,
    earnedThisMonth: 6787.5,
    paidThisMonth: 3100,
    asOf: '2026-07-14T10:00:00.000Z',
    currencyCode: 'GBP',
    monthLabel: 'July 2026',
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('on-target')).toHaveTextContent(
      /On target/,
    );
    await expect(
      canvas.queryByTestId('pace-to-target'),
    ).not.toBeInTheDocument();
  }}
/>
