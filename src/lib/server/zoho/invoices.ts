import { parseAmount } from '$lib/runrate/format';
import type { Invoice } from '$lib/runrate/types';
import { zohoFetch, type ZohoClientOptions, type QueryValue } from './client';

interface ZohoInvoiceRaw {
	invoice_id?: string;
	invoice_number?: string;
	customer_name?: string;
	status?: string;
	date?: string;
	due_date?: string;
	total?: number | string;
	balance?: number | string;
	schedule_time?: string;
	last_payment_date?: string;
	currency_code?: string;
}

interface ListInvoicesResponse {
	invoices?: ZohoInvoiceRaw[];
	page_context?: {
		page?: number;
		per_page?: number;
		has_more_page?: boolean;
	};
}

export function mapZohoInvoice(raw: ZohoInvoiceRaw): Invoice {
	return {
		invoiceId: String(raw.invoice_id ?? ''),
		invoiceNumber: String(raw.invoice_number ?? ''),
		customerName: String(raw.customer_name ?? ''),
		status: String(raw.status ?? ''),
		date: String(raw.date ?? '').slice(0, 10),
		dueDate: String(raw.due_date ?? '').slice(0, 10),
		total: parseAmount(raw.total),
		balance: parseAmount(raw.balance),
		scheduleTime: raw.schedule_time?.trim() ? raw.schedule_time : null,
		lastPaymentDate: raw.last_payment_date?.trim()
			? String(raw.last_payment_date).slice(0, 10)
			: null,
		currencyCode: String(raw.currency_code ?? 'GBP')
	};
}

export async function listInvoicesPage(
	query: Record<string, QueryValue>,
	options: ZohoClientOptions = {}
): Promise<{ invoices: Invoice[]; hasMore: boolean; page: number }> {
	const data = await zohoFetch<ListInvoicesResponse>('/invoices', query, options);
	const page = data.page_context?.page ?? Number(query.page ?? 1);
	return {
		invoices: (data.invoices ?? []).map(mapZohoInvoice),
		hasMore: Boolean(data.page_context?.has_more_page),
		page
	};
}

/** Paginate a filter until exhausted (max 200 per page). */
export async function listAllInvoices(
	filterBy: string,
	options: ZohoClientOptions = {}
): Promise<Invoice[]> {
	const results: Invoice[] = [];
	let page = 1;
	let hasMore = true;

	while (hasMore) {
		const batch = await listInvoicesPage(
			{
				filter_by: filterBy,
				page,
				per_page: 200,
				sort_column: 'date'
			},
			options
		);
		results.push(...batch.invoices);
		hasMore = batch.hasMore;
		page += 1;
		if (page > 50) break;
	}

	return results;
}

export async function fetchDashboardInvoices(options: ZohoClientOptions = {}): Promise<Invoice[]> {
	const filters = [
		'Status.Unpaid',
		'Status.PartiallyPaid',
		'Status.Draft',
		'Status.OverDue',
		'Status.Paid',
		'Status.Sent'
	];

	const batches = await Promise.all(filters.map((filter) => listAllInvoices(filter, options)));
	const byId = new Map<string, Invoice>();
	for (const invoice of batches.flat()) {
		if (!invoice.invoiceId) continue;
		byId.set(invoice.invoiceId, invoice);
	}
	return [...byId.values()];
}
