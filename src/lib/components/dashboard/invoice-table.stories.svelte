<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import InvoiceTable from './invoice-table.svelte';
	import { sampleInvoices } from './fixtures';

	const { Story } = defineMeta({
		title: 'Dashboard/InvoiceTable',
		component: InvoiceTable,
		parameters: { layout: 'padded' }
	});
</script>

<Story
	name="Outstanding"
	args={{
		invoices: [sampleInvoices[0], sampleInvoices[3]],
		source: 'Outstanding'
	}}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByTestId('source-badge')).toHaveTextContent('Outstanding');
		await expect(canvas.getByText('INV-1001')).toBeInTheDocument();
		await expect(canvas.getByText('Northwind Ltd')).toBeInTheDocument();
		await expect(canvas.getByText('INV-EUR-12')).toBeInTheDocument();
		await expect(canvas.getByText('EUR')).toBeInTheDocument();
	}}
/>

<Story
	name="Empty"
	args={{
		invoices: [],
		source: 'Draft invoices',
		emptyMessage: 'No draft invoices.'
	}}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('No draft invoices.')).toBeInTheDocument();
	}}
/>
