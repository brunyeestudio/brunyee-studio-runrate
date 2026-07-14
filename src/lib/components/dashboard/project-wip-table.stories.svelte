<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import ProjectWipTable from './project-wip-table.svelte';
	import { sampleProjects } from './fixtures';

	const { Story } = defineMeta({
		title: 'Dashboard/ProjectWipTable',
		component: ProjectWipTable,
		parameters: { layout: 'padded' }
	});
</script>

<Story
	name="HourlyWip"
	args={{
		projects: sampleProjects
	}}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByTestId('source-badge')).toHaveTextContent('Projects (hourly)');
		await expect(canvas.getByText('Platform retainers')).toBeInTheDocument();
		await expect(canvas.getByText('12:30')).toBeInTheDocument();
		await expect(canvas.getByText('GBP')).toBeInTheDocument();
	}}
/>
