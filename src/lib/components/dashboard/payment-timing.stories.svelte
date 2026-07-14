<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, userEvent, within } from 'storybook/test';
	import { sampleInvoices, sampleSnapshot } from './fixtures';
	import PaymentTiming from './payment-timing.svelte';

	const { Story } = defineMeta({
		title: 'Dashboard/PaymentTiming',
		component: PaymentTiming,
		parameters: { layout: 'padded' }
	});
</script>

<Story
	name="WithDetails"
	args={{
		dueThisMonth: sampleSnapshot.paymentTiming.dueThisMonth,
		dueNextMonth: sampleSnapshot.paymentTiming.dueNextMonth,
		dueThisMonthInvoices: sampleSnapshot.buckets.dueThisMonth.invoices,
		dueNextMonthInvoices: [sampleInvoices[1]],
		currencyCode: 'GBP'
	}}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByTestId('payment-timing')).toBeInTheDocument();
		await expect(canvas.getByText('Due end of this month')).toBeInTheDocument();
		await expect(canvas.getByText('Due next month')).toBeInTheDocument();
		await expect(canvas.getByTestId('payment-timing')).toHaveTextContent(/£5,050/);

		const amountTrigger = canvas.getByTestId('currency-amount-trigger');
		await userEvent.hover(amountTrigger);
		const tooltip = await within(document.body).findByTestId('currency-amount-tooltip');
		await expect(tooltip).toHaveTextContent(/€1,000/);

		const triggers = canvas.getAllByTestId('payment-timing-details-trigger');
		await expect(triggers).toHaveLength(2);
		await userEvent.click(triggers[0]);
		await expect(triggers[0]).toHaveAttribute('aria-expanded', 'true');
		await expect(await canvas.findByTestId('currency-breakdown')).toBeInTheDocument();
		const invoice = await canvas.findByText('INV-1001');
		await expect(invoice.closest('[hidden]')).toBeNull();
		await expect(canvas.getByText(/Northwind Ltd/)).toBeInTheDocument();
		await expect(canvas.getByText('INV-EUR-12')).toBeInTheDocument();
	}}
/>
