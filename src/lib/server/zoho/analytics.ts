import { previousPeriod, rollupPeriod } from '$lib/runrate/analytics';
import type {
  AnalyticsPeriodBounds,
  AnalyticsSnapshot,
  FxContext,
  Invoice,
  TimeEntry,
} from '$lib/runrate/types';
import {
  DEFAULT_BASE_CURRENCY,
  collectCurrencyCodes,
  fetchFrankfurterFx,
} from '$lib/server/fx/frankfurter';
import type { ZohoClientOptions } from './client';
import { fetchInvoicesInRange } from './invoices';
import { fetchTimeEntriesInRange } from './time-entries';

export function assembleAnalyticsSnapshot(input: {
  invoices: Invoice[];
  entries: TimeEntry[];
  fx: FxContext;
  current: AnalyticsPeriodBounds;
  previous: AnalyticsPeriodBounds;
  now: Date;
}): AnalyticsSnapshot {
  return {
    asOf: input.now.toISOString(),
    currencyCode: input.fx.baseCurrencyCode,
    exchangeRates: input.fx.rates,
    current: rollupPeriod(
      input.entries,
      input.invoices,
      input.fx,
      input.current,
    ),
    previous: rollupPeriod(
      input.entries,
      input.invoices,
      input.fx,
      input.previous,
    ),
  };
}

export async function buildZohoAnalytics(
  from: string,
  to: string,
  options: ZohoClientOptions = {},
  now: Date = new Date(),
): Promise<AnalyticsSnapshot> {
  const current = { from, to };
  const previous = previousPeriod(current);
  const fetchImpl = options.fetchImpl ?? fetch;
  const [invoices, entries] = await Promise.all([
    fetchInvoicesInRange(previous.from, current.to, options),
    fetchTimeEntriesInRange(previous.from, current.to, options),
  ]);
  const currencyCodes = collectCurrencyCodes(invoices);
  const fx = await fetchFrankfurterFx(
    DEFAULT_BASE_CURRENCY,
    currencyCodes,
    fetchImpl,
  );
  return assembleAnalyticsSnapshot({
    invoices,
    entries,
    fx,
    current,
    previous,
    now,
  });
}
