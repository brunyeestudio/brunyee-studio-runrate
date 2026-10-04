import { parseAmount } from '$lib/runrate/format';
import type { Payment } from '$lib/runrate/types';
import { zohoFetch, type ZohoClientOptions } from './client';

interface ZohoPaymentRaw {
  payment_id?: string;
  payment_number?: string;
  customer_name?: string;
  invoice_numbers?: string;
  invoice_number?: string;
  date?: string;
  amount?: number | string;
  bcy_amount?: number | string;
  currency_code?: string;
}

interface ListPaymentsResponse {
  customer_payments?: ZohoPaymentRaw[];
  page_context?: {
    has_more_page?: boolean;
  };
}

export function mapZohoPayment(raw: ZohoPaymentRaw, baseCurrencyCode: string): Payment {
  const amount = parseAmount(raw.amount);
  return {
    paymentId: String(raw.payment_id ?? ''),
    paymentNumber: String(raw.payment_number ?? ''),
    customerName: String(raw.customer_name ?? ''),
    invoiceNumbers: String(raw.invoice_numbers ?? raw.invoice_number ?? ''),
    date: String(raw.date ?? '').slice(0, 10),
    currencyCode: String(raw.currency_code ?? baseCurrencyCode),
    amount,
    bcyAmount: raw.bcy_amount === undefined ? amount : parseAmount(raw.bcy_amount),
  };
}

/** Paginate customer payments dated in [from, to] (max 200 per page). */
export async function fetchPaymentsInRange(
  from: string,
  to: string,
  baseCurrencyCode: string,
  options: ZohoClientOptions = {},
): Promise<Payment[]> {
  const results: Payment[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await zohoFetch<ListPaymentsResponse>(
      '/customerpayments',
      { date_start: from, date_end: to, page, per_page: 200 },
      options,
    );
    for (const raw of data.customer_payments ?? []) {
      results.push(mapZohoPayment(raw, baseCurrencyCode));
    }
    hasMore = Boolean(data.page_context?.has_more_page);
    page += 1;
    if (page > 50) break;
  }

  return results;
}
