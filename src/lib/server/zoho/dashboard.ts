import { buildDashboardSnapshot } from '$lib/runrate/aggregate';
import { withCarriedOverAmounts } from '$lib/runrate/classify-projects';
import { latestBookedRates } from '$lib/runrate/currency';
import { getMonthContext } from '$lib/runrate/dates';
import type { DashboardSnapshot } from '$lib/runrate/types';
import {
  DEFAULT_BASE_CURRENCY,
  currenciesNeedingCurrentRate,
  fetchFrankfurterFx,
} from '$lib/server/fx/frankfurter';
import type { ZohoClientOptions } from './client';
import { fetchDashboardInvoices } from './invoices';
import { fetchPaymentsInRange } from './payments';
import { fetchHourlyProjectWip } from './projects';
import { fetchUnbilledTimeEntries } from './time-entries';

export async function buildZohoDashboard(
  options: ZohoClientOptions = {},
  now: Date = new Date(),
): Promise<DashboardSnapshot> {
  const ctx = getMonthContext(now);
  const fetchImpl = options.fetchImpl ?? fetch;
  const [invoices, projects, payments, unbilledEntries] = await Promise.all([
    fetchDashboardInvoices(options),
    fetchHourlyProjectWip(options),
    fetchPaymentsInRange(ctx.monthStart, ctx.monthEnd, DEFAULT_BASE_CURRENCY, options),
    fetchUnbilledTimeEntries(options),
  ]);
  const fx = await fetchFrankfurterFx(
    DEFAULT_BASE_CURRENCY,
    currenciesNeedingCurrentRate(invoices, projects),
    fetchImpl,
    latestBookedRates(invoices),
  );
  return buildDashboardSnapshot(
    invoices,
    withCarriedOverAmounts(projects, unbilledEntries, ctx.monthStart),
    payments,
    ctx,
    fx,
    now,
  );
}
