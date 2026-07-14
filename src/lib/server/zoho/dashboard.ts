import { buildDashboardSnapshot } from '$lib/runrate/aggregate';
import { getMonthContext } from '$lib/runrate/dates';
import type { DashboardSnapshot } from '$lib/runrate/types';
import {
  DEFAULT_BASE_CURRENCY,
  collectCurrencyCodes,
  fetchFrankfurterFx,
} from '$lib/server/fx/frankfurter';
import type { ZohoClientOptions } from './client';
import { fetchDashboardInvoices } from './invoices';
import { fetchHourlyProjectWip } from './projects';

export async function buildZohoDashboard(
  options: ZohoClientOptions = {},
  now: Date = new Date(),
): Promise<DashboardSnapshot> {
  const ctx = getMonthContext(now);
  const fetchImpl = options.fetchImpl ?? fetch;
  const [invoices, projects] = await Promise.all([
    fetchDashboardInvoices(options),
    fetchHourlyProjectWip(options),
  ]);
  const currencyCodes = collectCurrencyCodes([...invoices, ...projects]);
  const fx = await fetchFrankfurterFx(
    DEFAULT_BASE_CURRENCY,
    currencyCodes,
    fetchImpl,
  );
  return buildDashboardSnapshot(invoices, projects, ctx, fx, now);
}
