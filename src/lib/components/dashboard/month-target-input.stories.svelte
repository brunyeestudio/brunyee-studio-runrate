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
    earnedPipeline: 6787.5,
    cashCollected: 3100,
    currencyCode: 'GBP',
    monthLabel: 'July 2026',
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('temporary-label')).toHaveTextContent(
      /Temporary/,
    );
    await expect(canvas.getByTestId('month-target-input')).toBeInTheDocument();
    const input = canvas.getByTestId('month-target-input');
    await userEvent.clear(input);
    await userEvent.type(input, '15000');
    await expect(input).toHaveValue(15000);
  }}
/>
