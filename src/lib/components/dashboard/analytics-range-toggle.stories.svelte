<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { expect, userEvent, within } from 'storybook/test';
  import AnalyticsRangeToggle from './analytics-range-toggle.svelte';

  const { Story } = defineMeta({
    title: 'Dashboard/AnalyticsRangeToggle',
    component: AnalyticsRangeToggle,
    parameters: { layout: 'padded' },
  });
</script>

<Story
  name="Default"
  args={{
    preset: '1m',
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const group = canvas.getByTestId('analytics-range');
    await expect(group).toBeInTheDocument();

    const oneMonth = canvas.getByTestId('analytics-range-1m');
    await expect(oneMonth).toHaveAttribute('data-state', 'on');

    const threeMonth = canvas.getByTestId('analytics-range-3m');
    await userEvent.click(threeMonth);
    await expect(threeMonth).toHaveAttribute('data-state', 'on');
    await expect(oneMonth).toHaveAttribute('data-state', 'off');
  }}
/>
