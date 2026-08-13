# Hours vs Revenue Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a top-level Analytics tab that compares Zoho timesheet hours to issued invoice revenue at a configurable hourly rate, split per client, with rolling range presets and previous-period deltas.

**Architecture:** `GET /api/analytics?from=&to=` returns period facts only (hours + issued revenue for current and previous windows). The browser applies the existing session `hourlyRate` to derive sold hours, variance, effective rate, and status. Analytics fetches only when that tab is opened or the preset changes.

**Tech Stack:** TypeScript, Svelte 5 runes, SvelteKit, Vitest (server project), Storybook + play tests, Zoho Books via `$lib/server/zoho/*`, Tailwind v4 + shadcn-svelte (sera/olive, always dark).

**Spec:** `docs/superpowers/specs/2026-08-13-hours-revenue-analytics-design.md`

## Global Constraints

- Package manager: `pnpm`. Unit tests: `pnpm exec vitest run --project server <file>`.
- Svelte 5 runes only (`$props`, `$state`, `$derived`). Always dark; class `dark` on root. No theme toggle.
- Temporary inputs use `runrate:temp-config` and must show “Temporary — cleared when the tab closes”.
- Zoho HTTP stays in `$lib/server/zoho/*` and `+server.ts`. Browser may call `/api/dashboard`, `/api/analytics`, and `/api/auth/zoho/*` only.
- Every money figure has a source badge (`Timesheets` or `Issued`).
- No database. No durable app settings. No Vitest browser/component tests for UI — Storybook play tests only.
- After writing any `.svelte` file, run the Svelte MCP `svelte-autofixer` until it reports no issues.
- Commits: `git commit --no-gpg-sign` (do not GPG-sign). Do not push unless asked.
- Work in the existing worktree: `~/Documents/BrunyeeStudio/Tools/brunyee-studio-runrate.feat-hours-revenue-analytics` on `feat/hours-revenue-analytics`.

---

## File map

| File | Responsibility |
| --- | --- |
| `src/lib/runrate/types.ts` | Add `Timesheets` source, `TimeEntry`, `AnalyticsSnapshot` fact types |
| `src/lib/runrate/format.ts` | `parseHours` (`HH:MM` and decimal) |
| `src/lib/runrate/analytics.ts` | Range presets, previous period, rollup, rate-derived metrics, view model |
| `src/lib/runrate/session-config.ts` | Persist `analyticsRangePreset` |
| `src/lib/server/zoho/time-entries.ts` | Map + paginate `/projects/timeentries` |
| `src/lib/server/zoho/invoices.ts` | Date-bounded invoice list for Analytics |
| `src/lib/server/zoho/analytics.ts` | `buildZohoAnalytics` |
| `src/lib/server/zoho/oauth.ts` | Add timesheet read scope |
| `src/routes/api/analytics/+server.ts` | GET handler |
| `src/lib/components/dashboard/analytics-view.svelte` | Analytics chrome + KPIs |
| `src/lib/components/dashboard/client-analytics-table.svelte` | Studio + per-client table |
| `src/lib/components/dashboard/analytics-range-toggle.svelte` | Preset toggle |
| `src/lib/components/dashboard/dashboard-view.svelte` | Top-level Runrate / Analytics tabs |
| `src/routes/+page.svelte` | Fetch analytics on tab/preset; bind rate + preset |

---

### Task 1: Hours parsing and issued-invoice helper

**Files:**
- Modify: `src/lib/runrate/format.ts`
- Modify: `src/lib/runrate/format.test.ts`
- Modify: `src/lib/runrate/classify-invoices.ts`
- Modify: `src/lib/runrate/classify-invoices.test.ts`
- Modify: `src/lib/runrate/index.ts`
- Modify: `src/lib/runrate/types.ts` (add `'Timesheets'` to `RevenueSource` only)

**Interfaces:**
- Consumes: existing `parseAmount`, `isDraftInvoice`
- Produces: `parseHours(value: unknown): number`; `isIssuedInvoice(invoice: Invoice): boolean`; `RevenueSource` includes `'Timesheets'`

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/runrate/format.test.ts`:

```ts
import { parseHours } from './format';

it('parses HH:MM and decimal hours', () => {
  expect(parseHours('02:30')).toBe(2.5);
  expect(parseHours('00:15')).toBe(0.25);
  expect(parseHours('8:00')).toBe(8);
  expect(parseHours(2.5)).toBe(2.5);
  expect(parseHours('2.5')).toBe(2.5);
  expect(parseHours('')).toBe(0);
  expect(parseHours(undefined)).toBe(0);
  expect(parseHours('not-a-time')).toBe(0);
});
```

Add to `src/lib/runrate/classify-invoices.test.ts` (import `isIssuedInvoice` and reuse an existing invoice fixture in that file, or inline):

```ts
it('treats non-draft non-void invoices as issued', () => {
  expect(
    isIssuedInvoice({
      invoiceId: '1',
      invoiceNumber: 'INV-1',
      customerName: 'Quantum',
      status: 'sent',
      date: '2026-08-01',
      dueDate: '2026-08-31',
      total: 1000,
      balance: 1000,
      scheduleTime: null,
      lastPaymentDate: null,
      currencyCode: 'GBP',
    }),
  ).toBe(true);
  expect(
    isIssuedInvoice({
      invoiceId: '2',
      invoiceNumber: 'D-1',
      customerName: 'Quantum',
      status: 'draft',
      date: '2026-08-01',
      dueDate: '2026-08-31',
      total: 1000,
      balance: 1000,
      scheduleTime: null,
      lastPaymentDate: null,
      currencyCode: 'GBP',
    }),
  ).toBe(false);
  expect(
    isIssuedInvoice({
      invoiceId: '3',
      invoiceNumber: 'V-1',
      customerName: 'Quantum',
      status: 'void',
      date: '2026-08-01',
      dueDate: '2026-08-31',
      total: 1000,
      balance: 0,
      scheduleTime: null,
      lastPaymentDate: null,
      currencyCode: 'GBP',
    }),
  ).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run --project server src/lib/runrate/format.test.ts src/lib/runrate/classify-invoices.test.ts`

Expected: FAIL — `parseHours` / `isIssuedInvoice` are not exported.

- [ ] **Step 3: Implement**

In `format.ts`:

```ts
export function parseHours(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (typeof value !== 'string') return 0;
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const hhmm = trimmed.match(/^(\d+):([0-5]\d)$/);
  if (hhmm) {
    return Number(hhmm[1]) + Number(hhmm[2]) / 60;
  }
  const decimal = Number(trimmed.replace(/,/g, ''));
  return Number.isFinite(decimal) && decimal >= 0 ? decimal : 0;
}
```

In `classify-invoices.ts`:

```ts
export function isIssuedInvoice(invoice: Invoice): boolean {
  const status = invoice.status.toLowerCase();
  return status !== 'draft' && status !== 'void';
}
```

Add `'Timesheets'` to `RevenueSource` in `types.ts`. Export `parseHours` and `isIssuedInvoice` from `src/lib/runrate/index.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run --project server src/lib/runrate/format.test.ts src/lib/runrate/classify-invoices.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/runrate/format.ts src/lib/runrate/format.test.ts src/lib/runrate/classify-invoices.ts src/lib/runrate/classify-invoices.test.ts src/lib/runrate/index.ts src/lib/runrate/types.ts
git commit --no-gpg-sign -m "$(cat <<'EOF'
Add hours parsing and issued-invoice helper for analytics.

EOF
)"
```

---

### Task 2: Range presets and previous period

**Files:**
- Create: `src/lib/runrate/analytics.ts`
- Create: `src/lib/runrate/analytics.test.ts`
- Modify: `src/lib/runrate/index.ts`

**Interfaces:**
- Consumes: `date-fns` (`subDays`, `differenceInCalendarDays`, `parseISO`, `format`, `isValid`)
- Produces:

```ts
export type AnalyticsRangePreset = '7d' | '1m' | '3m' | '6m' | '1y';
export const ANALYTICS_RANGE_DAYS: Record<AnalyticsRangePreset, number> = {
  '7d': 7,
  '1m': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
};
export const DEFAULT_ANALYTICS_RANGE_PRESET: AnalyticsRangePreset = '1m';
export function isAnalyticsRangePreset(value: unknown): value is AnalyticsRangePreset;
export function resolveAnalyticsRange(
  preset: AnalyticsRangePreset,
  todayIso: string,
): { from: string; to: string };
export function previousPeriod(bounds: { from: string; to: string }): {
  from: string;
  to: string;
};
export function parseAnalyticsDates(
  from: string | null,
  to: string | null,
): { from: string; to: string } | null;
```

- [ ] **Step 1: Write the failing test**

Create `src/lib/runrate/analytics.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ANALYTICS_RANGE_PRESET,
  isAnalyticsRangePreset,
  parseAnalyticsDates,
  previousPeriod,
  resolveAnalyticsRange,
} from './analytics';

describe('analytics range', () => {
  it('resolves rolling windows ending today inclusive', () => {
    expect(DEFAULT_ANALYTICS_RANGE_PRESET).toBe('1m');
    expect(resolveAnalyticsRange('7d', '2026-08-13')).toEqual({
      from: '2026-08-07',
      to: '2026-08-13',
    });
    expect(resolveAnalyticsRange('1m', '2026-08-13')).toEqual({
      from: '2026-07-15',
      to: '2026-08-13',
    });
    expect(resolveAnalyticsRange('3m', '2026-08-13')).toEqual({
      from: '2026-05-16',
      to: '2026-08-13',
    });
  });

  it('computes an equal-length previous period immediately before from', () => {
    expect(
      previousPeriod({ from: '2026-07-15', to: '2026-08-13' }),
    ).toEqual({ from: '2026-06-15', to: '2026-07-14' });
    expect(previousPeriod({ from: '2026-08-07', to: '2026-08-13' })).toEqual({
      from: '2026-07-31',
      to: '2026-08-06',
    });
  });

  it('parses valid inclusive ISO dates and rejects invalid', () => {
    expect(parseAnalyticsDates('2026-07-15', '2026-08-13')).toEqual({
      from: '2026-07-15',
      to: '2026-08-13',
    });
    expect(parseAnalyticsDates('2026-08-13', '2026-07-15')).toBeNull();
    expect(parseAnalyticsDates('nope', '2026-08-13')).toBeNull();
    expect(parseAnalyticsDates(null, '2026-08-13')).toBeNull();
    expect(isAnalyticsRangePreset('1m')).toBe(true);
    expect(isAnalyticsRangePreset('2m')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run --project server src/lib/runrate/analytics.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/runrate/analytics.ts` with the range functions only (metrics come in Task 3). Use `yyyy-MM-dd` via `date-fns` `format` / `parseISO` / `subDays` / `differenceInCalendarDays`. Inclusive length is `differenceInCalendarDays(to, from) + 1`. `previousPeriod` sets `to = subDays(from, 1)` and `from = subDays(that to, length - 1)`. `parseAnalyticsDates` returns null unless both are valid `yyyy-MM-dd` and `from <= to`.

Export the new symbols from `src/lib/runrate/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run --project server src/lib/runrate/analytics.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/runrate/analytics.ts src/lib/runrate/analytics.test.ts src/lib/runrate/index.ts
git commit --no-gpg-sign -m "$(cat <<'EOF'
Add rolling analytics range presets and previous-period bounds.

EOF
)"
```

---

### Task 3: Rate-derived metrics and status

**Files:**
- Modify: `src/lib/runrate/analytics.ts`
- Modify: `src/lib/runrate/analytics.test.ts`
- Modify: `src/lib/runrate/index.ts`

**Interfaces:**
- Consumes: Task 2 module
- Produces:

```ts
export const ON_RATE_HOURS_BAND = 0.5;
export type AnalyticsStatus =
  | 'overshoot'
  | 'headroom'
  | 'on-rate'
  | 'no-time'
  | 'no-invoices';
export interface AnalyticsDerivedMetrics {
  soldHours: number | null;
  hoursVariance: number | null;
  moneyVariance: number | null;
  effectiveRate: number | null;
  status: AnalyticsStatus | null;
}
export function hasHourlyRate(hourlyRate: number | undefined): boolean;
export function deriveMetrics(
  hoursSpent: number,
  revenue: number,
  hourlyRate: number | undefined,
): AnalyticsDerivedMetrics;
export function percentChange(current: number, previous: number): number | null;
```

Rules (copy exactly):
- No rate (unset, non-finite, or ≤ 0) → all derived fields `null` including status.
- Hours = 0 and revenue > 0 → `soldHours` set when rate exists; `effectiveRate` null; status `'no-time'`.
- Hours > 0 and revenue = 0 → `effectiveRate` 0; status `'no-invoices'`.
- Otherwise: soldHours = revenue / rate; hoursVariance = hours − soldHours; moneyVariance = revenue − hours × rate; effectiveRate = revenue / hours.
- Status: hoursVariance > 0.5 → `'overshoot'`; < −0.5 → `'headroom'`; else `'on-rate'` (includes exactly ±0.5).
- `percentChange` is null when previous === 0.

- [ ] **Step 1: Write the failing tests**

Append to `analytics.test.ts`:

```ts
import { deriveMetrics, hasHourlyRate, percentChange } from './analytics';

describe('deriveMetrics', () => {
  it('returns blanks without a positive hourly rate', () => {
    expect(hasHourlyRate(undefined)).toBe(false);
    expect(hasHourlyRate(0)).toBe(false);
    expect(deriveMetrics(10, 1000, undefined)).toEqual({
      soldHours: null,
      hoursVariance: null,
      moneyVariance: null,
      effectiveRate: null,
      status: null,
    });
  });

  it('flags overshoot when spent hours exceed sold hours by more than 0.5h', () => {
    const result = deriveMetrics(12, 1000, 100);
    expect(result.soldHours).toBe(10);
    expect(result.hoursVariance).toBe(2);
    expect(result.moneyVariance).toBe(-200);
    expect(result.effectiveRate).toBeCloseTo(1000 / 12);
    expect(result.status).toBe('overshoot');
  });

  it('flags headroom when invoices more than cover time', () => {
    const result = deriveMetrics(8, 1000, 100);
    expect(result.soldHours).toBe(10);
    expect(result.hoursVariance).toBe(-2);
    expect(result.moneyVariance).toBe(200);
    expect(result.status).toBe('headroom');
  });

  it('treats ±0.5h as on rate', () => {
    expect(deriveMetrics(10.5, 1000, 100).status).toBe('on-rate');
    expect(deriveMetrics(9.5, 1000, 100).status).toBe('on-rate');
    expect(deriveMetrics(10, 1000, 100).status).toBe('on-rate');
  });

  it('handles no time logged and no invoices', () => {
    expect(deriveMetrics(0, 1000, 100).status).toBe('no-time');
    expect(deriveMetrics(0, 1000, 100).soldHours).toBe(10);
    expect(deriveMetrics(0, 1000, 100).effectiveRate).toBeNull();
    expect(deriveMetrics(6, 0, 100).status).toBe('no-invoices');
    expect(deriveMetrics(6, 0, 100).effectiveRate).toBe(0);
  });
});

describe('percentChange', () => {
  it('returns null when previous is zero', () => {
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(12, 10)).toBeCloseTo(0.2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run --project server src/lib/runrate/analytics.test.ts`

Expected: FAIL — `deriveMetrics` not exported.

- [ ] **Step 3: Implement** the functions in `analytics.ts` and export them from `index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run --project server src/lib/runrate/analytics.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/runrate/analytics.ts src/lib/runrate/analytics.test.ts src/lib/runrate/index.ts
git commit --no-gpg-sign -m "$(cat <<'EOF'
Derive sold hours, variance, and overshoot status from hourly rate.

EOF
)"
```

---

### Task 4: Period rollup and view model

**Files:**
- Modify: `src/lib/runrate/types.ts`
- Modify: `src/lib/runrate/analytics.ts`
- Modify: `src/lib/runrate/analytics.test.ts`
- Modify: `src/lib/runrate/index.ts`

**Interfaces:**
- Consumes: `TimeEntry`, `Invoice`, `FxContext`, `sumMoney`, `isDateInRange`, `isIssuedInvoice`, `deriveMetrics`, `percentChange`
- Produces: types below plus `rollupPeriod`, `buildAnalyticsView`

Add to `types.ts`:

```ts
export interface TimeEntry {
  timeEntryId: string;
  customerName: string;
  projectName: string;
  logDate: string;
  hours: number;
}

export interface AnalyticsPeriodBounds {
  from: string;
  to: string;
}

export interface AnalyticsClientFacts {
  customerName: string;
  hoursSpent: number;
  revenue: number;
  timeEntryCount: number;
  invoiceCount: number;
  revenueByCurrency: CurrencyAmount[];
}

export interface AnalyticsPeriodFacts {
  bounds: AnalyticsPeriodBounds;
  studio: AnalyticsClientFacts;
  clients: AnalyticsClientFacts[];
}

export interface AnalyticsSnapshot {
  asOf: string;
  currencyCode: string;
  exchangeRates: Record<string, number>;
  current: AnalyticsPeriodFacts;
  previous: AnalyticsPeriodFacts;
}
```

In `analytics.ts`:

```ts
export const UNASSIGNED_CUSTOMER = 'Unassigned';
export const STUDIO_CUSTOMER = 'Studio';
export function customerKey(name: string | null | undefined): string;
export function rollupPeriod(
  entries: TimeEntry[],
  invoices: Invoice[],
  fx: FxContext,
  bounds: AnalyticsPeriodBounds,
): AnalyticsPeriodFacts;
export interface AnalyticsClientRow extends AnalyticsDerivedMetrics {
  customerName: string;
  hoursSpent: number;
  hoursSpentPrevious: number;
  hoursDelta: number;
  revenue: number;
  revenuePrevious: number;
  revenueDelta: number;
  hoursChangePercent: number | null;
  revenueChangePercent: number | null;
}
export interface AnalyticsViewModel {
  studio: AnalyticsClientRow;
  clients: AnalyticsClientRow[];
  hasHourlyRate: boolean;
  currentBounds: AnalyticsPeriodBounds;
  previousBounds: AnalyticsPeriodBounds;
}
export function buildAnalyticsView(
  snapshot: AnalyticsSnapshot,
  hourlyRate: number | undefined,
): AnalyticsViewModel;
```

Rollup rules:
- Filter entries by `logDate` in bounds; invoices by `isIssuedInvoice` and `date` in bounds.
- `customerKey('')` → `Unassigned`.
- Studio facts are the sums of all in-range items (`customerName: 'Studio'`).
- Client rows are the union of customers in **this** period only. Drop customers with hours = 0 and revenue = 0.
- `buildAnalyticsView` attaches previous-period hours/revenue by customer name (0 if missing).
- Sort clients by `Math.abs(moneyVariance)` descending; `moneyVariance === null` sorts after computable rows; tie-break `hoursSpent` descending.

- [ ] **Step 1: Write the failing tests**

Append to `analytics.test.ts` (GBP fx `{ baseCurrencyCode: 'GBP', rates: { GBP: 1 } }`):

```ts
import type { Invoice, TimeEntry } from './types';
import {
  STUDIO_CUSTOMER,
  UNASSIGNED_CUSTOMER,
  buildAnalyticsView,
  rollupPeriod,
} from './analytics';

const fx = { baseCurrencyCode: 'GBP', rates: { GBP: 1 } };
const current = { from: '2026-07-15', to: '2026-08-13' };
const previous = { from: '2026-06-15', to: '2026-07-14' };

function invoice(
  partial: Pick<Invoice, 'invoiceId' | 'customerName' | 'date' | 'total' | 'status'>,
): Invoice {
  return {
    invoiceNumber: partial.invoiceId,
    dueDate: partial.date,
    balance: partial.total,
    scheduleTime: null,
    lastPaymentDate: null,
    currencyCode: 'GBP',
    ...partial,
  };
}

function entry(
  partial: Pick<TimeEntry, 'timeEntryId' | 'customerName' | 'logDate' | 'hours'>,
): TimeEntry {
  return { projectName: 'Work', ...partial };
}

const invoices: Invoice[] = [
  invoice({
    invoiceId: 'q-now',
    customerName: 'Quantum',
    date: '2026-08-01',
    total: 1000,
    status: 'sent',
  }),
  invoice({
    invoiceId: 'n-now',
    customerName: 'Northwind',
    date: '2026-08-02',
    total: 400,
    status: 'paid',
  }),
  invoice({
    invoiceId: 'draft',
    customerName: 'Quantum',
    date: '2026-08-01',
    total: 9999,
    status: 'draft',
  }),
  invoice({
    invoiceId: 'old',
    customerName: 'Ghost',
    date: '2026-01-01',
    total: 50,
    status: 'paid',
  }),
  invoice({
    invoiceId: 'q-prev',
    customerName: 'Quantum',
    date: '2026-07-01',
    total: 800,
    status: 'paid',
  }),
];

const entries: TimeEntry[] = [
  entry({
    timeEntryId: '1',
    customerName: 'Quantum',
    logDate: '2026-08-10',
    hours: 12,
  }),
  entry({
    timeEntryId: '2',
    customerName: 'Northwind',
    logDate: '2026-08-11',
    hours: 4,
  }),
  entry({
    timeEntryId: '3',
    customerName: '',
    logDate: '2026-08-12',
    hours: 1,
  }),
  entry({
    timeEntryId: '4',
    customerName: 'Quantum',
    logDate: '2026-07-01',
    hours: 6,
  }),
  entry({
    timeEntryId: '5',
    customerName: 'OnlyPrevious',
    logDate: '2026-07-01',
    hours: 3,
  }),
];

describe('rollupPeriod', () => {
  it('groups issued invoices and time entries in range', () => {
    const period = rollupPeriod(entries, invoices, fx, current);
    expect(period.studio.customerName).toBe(STUDIO_CUSTOMER);
    expect(period.studio.hoursSpent).toBe(17);
    expect(period.studio.revenue).toBe(1400);
    const names = period.clients.map((c) => c.customerName);
    expect(names).toContain('Quantum');
    expect(names).toContain('Northwind');
    expect(names).toContain(UNASSIGNED_CUSTOMER);
    expect(names).not.toContain('Ghost');
    expect(names).not.toContain('OnlyPrevious');
    expect(period.clients.find((c) => c.customerName === 'Quantum')).toMatchObject({
      hoursSpent: 12,
      revenue: 1000,
    });
  });
});

describe('buildAnalyticsView', () => {
  const snapshot = {
    asOf: '2026-08-13T10:00:00.000Z',
    currencyCode: 'GBP',
    exchangeRates: { GBP: 1 },
    current: rollupPeriod(entries, invoices, fx, current),
    previous: rollupPeriod(entries, invoices, fx, previous),
  };

  it('attaches previous period and sorts by absolute money variance', () => {
    const view = buildAnalyticsView(snapshot, 100);
    expect(view.hasHourlyRate).toBe(true);
    expect(view.studio.hoursSpent).toBe(17);
    const quantum = view.clients.find((c) => c.customerName === 'Quantum');
    expect(quantum?.hoursSpentPrevious).toBe(6);
    expect(quantum?.revenuePrevious).toBe(800);
    expect(quantum?.status).toBe('overshoot');
    expect(view.clients.map((c) => c.customerName)[0]).toBe('Quantum');
    expect(view.clients.some((c) => c.customerName === 'OnlyPrevious')).toBe(
      false,
    );
  });

  it('sorts missing-rate rows after computable variance', () => {
    const view = buildAnalyticsView(snapshot, undefined);
    expect(view.clients.every((c) => c.moneyVariance === null)).toBe(true);
    expect(view.clients[0]?.hoursSpent).toBeGreaterThanOrEqual(
      view.clients[1]?.hoursSpent ?? 0,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run --project server src/lib/runrate/analytics.test.ts`

Expected: FAIL — `rollupPeriod` / `buildAnalyticsView` missing.

- [ ] **Step 3: Implement** rollup + view model. Export new types from `index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run --project server src/lib/runrate/analytics.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/runrate/types.ts src/lib/runrate/analytics.ts src/lib/runrate/analytics.test.ts src/lib/runrate/index.ts
git commit --no-gpg-sign -m "$(cat <<'EOF'
Roll up timesheets and issued invoices per client for analytics.

EOF
)"
```

---

### Task 5: Persist analytics range preset

**Files:**
- Modify: `src/lib/runrate/session-config.ts`
- Modify: `src/lib/runrate/session-config.test.ts`

**Interfaces:**
- Consumes: `isAnalyticsRangePreset`, `AnalyticsRangePreset`
- Produces: `TempSessionConfig.analyticsRangePreset?: AnalyticsRangePreset` read/written like other fields

- [ ] **Step 1: Extend the existing read/write test** in `session-config.test.ts` to include `analyticsRangePreset: '3m'`, and add a case that ignores `'2m'`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run --project server src/lib/runrate/session-config.test.ts`

Expected: FAIL — property not persisted.

- [ ] **Step 3: Implement** read/write of `analyticsRangePreset` using `isAnalyticsRangePreset`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run --project server src/lib/runrate/session-config.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/runrate/session-config.ts src/lib/runrate/session-config.test.ts
git commit --no-gpg-sign -m "$(cat <<'EOF'
Persist the analytics range preset in temporary session config.

EOF
)"
```

---

### Task 6: Zoho time-entry mapper and timesheet scope

**Files:**
- Create: `src/lib/server/zoho/time-entries.ts`
- Modify: `src/lib/server/zoho/zoho.test.ts`
- Modify: `src/lib/server/zoho/oauth.ts`
- Modify: `src/lib/server/zoho/index.ts`

**Interfaces:**
- Consumes: `zohoFetch`, `parseHours`, `customerKey` (mapper stores raw name; rollup applies `customerKey`)
- Produces:

```ts
export function mapZohoTimeEntry(raw: ZohoTimeEntryRaw): TimeEntry | null;
export async function fetchTimeEntriesInRange(
  from: string,
  to: string,
  options?: ZohoClientOptions,
): Promise<TimeEntry[]>;
```

`ZohoTimeEntryRaw` fields (all optional): `time_entry_id`, `customer_name`, `project_name`, `log_date`, `date`, `hours`, `billed_hours`, `time`.

Mapper:
- id from `time_entry_id`; skip if missing
- `logDate` from `log_date` or `date`, sliced to 10 chars; skip if not `yyyy-MM-dd`
- `hours` from `hours` ?? `billed_hours` ?? `time` via `parseHours`
- `customerName` raw string (blank allowed)
- `projectName` raw string

`fetchTimeEntriesInRange` paginates `GET /projects/timeentries` with `from_date`, `to_date`, `page`, `per_page: 200`, max 50 pages — same loop style as `listAllInvoices`.

OAuth: change `ZOHO_OAUTH_SCOPES` to  
`ZohoBooks.invoices.READ,ZohoBooks.projects.READ,ZohoBooks.timesheet.READ`  
Existing connects must reconnect once for timesheet access. The API will surface Zoho’s 401 message if the scope is missing (do not swallow as 0 hours).

- [ ] **Step 1: Write mapper tests** in `zoho.test.ts`:

```ts
import { mapZohoTimeEntry } from './time-entries';

it('maps HH:MM and decimal time entries', () => {
  expect(
    mapZohoTimeEntry({
      time_entry_id: 'te1',
      customer_name: 'Quantum',
      project_name: 'Retainer',
      log_date: '2026-08-10',
      hours: '02:30',
    }),
  ).toEqual({
    timeEntryId: 'te1',
    customerName: 'Quantum',
    projectName: 'Retainer',
    logDate: '2026-08-10',
    hours: 2.5,
  });
  expect(
    mapZohoTimeEntry({
      time_entry_id: 'te2',
      date: '2026-08-11 00:00:00',
      time: '1.5',
    }),
  ).toMatchObject({
    timeEntryId: 'te2',
    customerName: '',
    logDate: '2026-08-11',
    hours: 1.5,
  });
  expect(mapZohoTimeEntry({ customer_name: 'X' })).toBeNull();
});
```

Also update the existing scope assertion to include `ZohoBooks.timesheet.READ`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run --project server src/lib/server/zoho/zoho.test.ts`

Expected: FAIL — module / scope mismatch.

- [ ] **Step 3: Implement** mapper, fetch, scope, and `index.ts` exports.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run --project server src/lib/server/zoho/zoho.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/zoho/time-entries.ts src/lib/server/zoho/zoho.test.ts src/lib/server/zoho/oauth.ts src/lib/server/zoho/index.ts
git commit --no-gpg-sign -m "$(cat <<'EOF'
Fetch Zoho time entries and request timesheet read scope.

EOF
)"
```

---

### Task 7: Date-bounded invoices and `buildZohoAnalytics`

**Files:**
- Modify: `src/lib/server/zoho/invoices.ts`
- Create: `src/lib/server/zoho/analytics.ts`
- Modify: `src/lib/server/zoho/index.ts`
- Create: `src/lib/server/zoho/analytics.test.ts` (pure assembly with stubbed lists — or test `buildAnalyticsSnapshot` wrapper)

**Interfaces:**
- Consumes: `listInvoicesPage`, `fetchTimeEntriesInRange`, `rollupPeriod`, `previousPeriod`, `parseAnalyticsDates`, Frankfurter FX
- Produces:

```ts
export async function fetchInvoicesInRange(
  from: string,
  to: string,
  options?: ZohoClientOptions,
): Promise<Invoice[]>;
export async function buildZohoAnalytics(
  from: string,
  to: string,
  options?: ZohoClientOptions,
  now?: Date,
): Promise<AnalyticsSnapshot>;
```

`fetchInvoicesInRange`: paginate `/invoices` with `date_start`, `date_end`, `per_page: 200`, max 50 pages. Deduplicate by `invoiceId` like `fetchDashboardInvoices`. Domain rollup still drops draft/void.

`buildZohoAnalytics`:
1. `current = { from, to }`; `previous = previousPeriod(current)`.
2. Fetch invoices and time entries for **current.from through current.to** and **previous.from through previous.to** (four calls, or two wider fetches covering `previous.from`–`current.to` then filter — prefer two wider fetches: invoices + time entries for `previous.from`–`current.to`, then filter in `rollupPeriod`).
3. Collect currency codes from invoices; `fetchFrankfurterFx` with `DEFAULT_BASE_CURRENCY`.
4. Return `{ asOf, currencyCode, exchangeRates, current: rollupPeriod(...), previous: rollupPeriod(...) }`.

- [ ] **Step 1: Write a unit test** for a pure helper `assembleAnalyticsSnapshot` exported from `src/lib/server/zoho/analytics.ts` (keep `buildZohoAnalytics` as the I/O wrapper). The test feeds invoices + entries + fx + bounds and asserts Quantum appears in `current.clients` and previous revenue attaches.

```ts
export function assembleAnalyticsSnapshot(input: {
  invoices: Invoice[];
  entries: TimeEntry[];
  fx: FxContext;
  current: AnalyticsPeriodBounds;
  previous: AnalyticsPeriodBounds;
  now: Date;
}): AnalyticsSnapshot;
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run --project server src/lib/server/zoho/analytics.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `fetchInvoicesInRange`, `assembleAnalyticsSnapshot`, `buildZohoAnalytics`. Export from `zoho/index.ts`.

- [ ] **Step 4: Run tests**

Run: `pnpm exec vitest run --project server src/lib/server/zoho/analytics.test.ts src/lib/runrate/analytics.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/zoho/invoices.ts src/lib/server/zoho/analytics.ts src/lib/server/zoho/analytics.test.ts src/lib/server/zoho/index.ts
git commit --no-gpg-sign -m "$(cat <<'EOF'
Assemble analytics snapshots from date-bounded Zoho invoices and time entries.

EOF
)"
```

---

### Task 8: `GET /api/analytics`

**Files:**
- Create: `src/routes/api/analytics/+server.ts`

**Interfaces:**
- Consumes: `parseAnalyticsDates`, `buildZohoAnalytics`, same error mapping as `src/routes/api/dashboard/+server.ts`
- Produces: `200` JSON `AnalyticsSnapshot`; `400` `{ error, code: 'ANALYTICS_RANGE' }` when dates are invalid; Zoho/FX errors use the same codes as dashboard (`ZOHO_AUTH`, `ZOHO_ENV`, `ZOHO_API`, `FX_ERROR`)

- [ ] **Step 1: Implement the handler** by copying the dashboard try/catch and replacing the happy path:

```ts
const bounds = parseAnalyticsDates(
  url.searchParams.get('from'),
  url.searchParams.get('to'),
);
if (!bounds) {
  return json(
    { error: 'from and to must be yyyy-MM-dd with from ≤ to', code: 'ANALYTICS_RANGE' },
    { status: 400 },
  );
}
const snapshot = await buildZohoAnalytics(bounds.from, bounds.to, { env, store });
```

Use `code: 'ANALYTICS_ERROR'` for the unknown 500 fallback (not `DASHBOARD_ERROR`).

There is no existing +server unit test for dashboard; do not add a brittle route test. Manual check: invalid dates → 400.

- [ ] **Step 2: Commit**

```bash
git add src/routes/api/analytics/+server.ts
git commit --no-gpg-sign -m "$(cat <<'EOF'
Expose GET /api/analytics for date-bounded hours and issued revenue.

EOF
)"
```

---

### Task 9: Range toggle and client table (Storybook)

**Files:**
- Create: `src/lib/components/dashboard/analytics-fixtures.ts`
- Create: `src/lib/components/dashboard/analytics-range-toggle.svelte`
- Create: `src/lib/components/dashboard/analytics-range-toggle.stories.svelte`
- Create: `src/lib/components/dashboard/client-analytics-table.svelte`
- Create: `src/lib/components/dashboard/client-analytics-table.stories.svelte`

**Interfaces:**
- Consumes: `AnalyticsRangePreset`, `AnalyticsClientRow`, `formatCurrency`, `SourceBadge`, `Badge`, `Table`, `ToggleGroup`
- Produces: presentational components only

Fixture: `sampleAnalyticsView` with studio + Quantum (overshoot) + Northwind (headroom) at £100/h, GBP.

Range toggle: line `ToggleGroup` values `7d|1m|3m|6m|1y`, `data-testid="analytics-range"`, bindable `preset`.

Client table:
- `data-testid="client-analytics-table"`
- First body row is studio (`data-testid="analytics-studio-row"`)
- Then clients; Quantum before Northwind when sorted by |£ variance|
- Columns: Client, Hours (current + Δ), Revenue (current + Δ), Sold hours, Hours var + status badge, £ var, Effective rate
- Status badge `data-testid="analytics-status"`: Overshoot `destructive`, Headroom default/positive, others `secondary`
- Empty: “No timesheets or issued invoices in this range”
- Missing rate: sold/variance/effective cells show “Enter hourly rate”

- [ ] **Step 1: Write components + stories with play tests** for: range switch to `3m`; table shows Quantum Overshoot and Northwind Headroom; empty state; missing rate copy.

- [ ] **Step 2: Run Svelte autofixer** on each new `.svelte` file until clean.

- [ ] **Step 3: Run Storybook tests**

Run: `pnpm exec vitest run --project storybook src/lib/components/dashboard/client-analytics-table.stories.svelte src/lib/components/dashboard/analytics-range-toggle.stories.svelte`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/dashboard/analytics-fixtures.ts src/lib/components/dashboard/analytics-range-toggle.svelte src/lib/components/dashboard/analytics-range-toggle.stories.svelte src/lib/components/dashboard/client-analytics-table.svelte src/lib/components/dashboard/client-analytics-table.stories.svelte
git commit --no-gpg-sign -m "$(cat <<'EOF'
Add analytics range toggle and per-client hours-vs-revenue table.

EOF
)"
```

---

### Task 10: Analytics view

**Files:**
- Create: `src/lib/components/dashboard/analytics-view.svelte`
- Create: `src/lib/components/dashboard/analytics-view.stories.svelte`

**Interfaces:**
- Consumes: `AnalyticsSnapshot`, `buildAnalyticsView`, range toggle, client table, hourly rate bindable
- Produces: `AnalyticsView` props:

```ts
{
  snapshot: AnalyticsSnapshot | null;
  loading?: boolean;
  error?: string | null;
  hourlyRate?: number | undefined; // bindable
  rangePreset?: AnalyticsRangePreset; // bindable
  currencyCode?: string;
  onrangechange?: (preset: AnalyticsRangePreset) => void;
}
```

Layout:
1. Chrome: range toggle, hourly rate number input (`data-testid="analytics-hourly-rate"`), temporary label (`data-testid="temporary-label"`), period caption (`data-testid="analytics-period"`) formatted `d MMM yyyy – d MMM yyyy` vs previous.
2. Four KPI cards (`data-testid="analytics-kpis"`): Hours spent (`Timesheets`), Issued revenue (`Issued`), Hours vs sold (status + £ variance), Effective rate vs configured rate.
3. Client table.
4. Loading with no snapshot: four skeletons.
5. Loading with snapshot: keep previous data (no wipe).
6. Error: destructive alert `data-testid="analytics-error"`.
7. Cards 3–4 show “Enter hourly rate” when rate missing.

- [ ] **Step 1: Implement view + stories:** Loaded, Empty range, Missing rate, Error. Play tests assert source badges, Quantum in the table, temporary label, and missing-rate copy.

- [ ] **Step 2: Run Svelte autofixer** until clean.

- [ ] **Step 3: Run Storybook tests**

Run: `pnpm exec vitest run --project storybook src/lib/components/dashboard/analytics-view.stories.svelte`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/dashboard/analytics-view.svelte src/lib/components/dashboard/analytics-view.stories.svelte
git commit --no-gpg-sign -m "$(cat <<'EOF'
Add the analytics view with studio KPIs and period comparison.

EOF
)"
```

---

### Task 11: Top-level tabs and page fetch

**Files:**
- Modify: `src/lib/components/dashboard/dashboard-view.svelte`
- Modify: `src/lib/components/dashboard/dashboard-view.stories.svelte`
- Modify: `src/routes/+page.svelte`

**Interfaces:**
- Consumes: existing dashboard props plus analytics props
- Produces: dashboard-view bindable `view: 'runrate' | 'analytics'`, analytics snapshot/loading/error, `rangePreset`, `onanalyticsrefresh`

`+page.svelte`:
- Read `view` from `?view=analytics`, default `'runrate'`.
- Hydrate `analyticsRangePreset` from `readTempConfig()` (default `'1m'`).
- Persist `analyticsRangePreset` in the existing `writeTempConfig` effect.
- `loadAnalytics()` calls `/api/analytics?from=&to=` using `resolveAnalyticsRange(preset, today)` where `today` is `snapshot?.asOf.slice(0, 10)` if loaded, else today’s ISO date.
- Call `loadAnalytics` when `view === 'analytics'` and (`analyticsSnapshot` is null or preset changed). Do not refetch when only `hourlyRate` changes.
- Not connected (`ZOHO_AUTH`): do not call `/api/analytics`.
- Refresh button: if analytics tab, `loadAnalytics`; else `loadDashboard`.
- Header title can stay “Runrate”; tabs sit under the header (`data-testid="app-tabs"`).

Dashboard stories: extend Loaded to click Analytics and expect `data-testid="analytics-view"` (pass a `sampleAnalyticsSnapshot` so the tab is not empty). Keep existing Runrate assertions on the default tab.

- [ ] **Step 1: Wire tabs + fetch. Run Svelte autofixer on edited `.svelte` files.**

- [ ] **Step 2: Run Storybook dashboard tests**

Run: `pnpm exec vitest run --project storybook src/lib/components/dashboard/dashboard-view.stories.svelte`

Expected: PASS (existing stories still pass; new Analytics click story passes).

- [ ] **Step 3: Run domain tests once more**

Run: `pnpm exec vitest run --project server src/lib/runrate/analytics.test.ts src/lib/runrate/session-config.test.ts src/lib/server/zoho/analytics.test.ts`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/dashboard/dashboard-view.svelte src/lib/components/dashboard/dashboard-view.stories.svelte src/routes/+page.svelte
git commit --no-gpg-sign -m "$(cat <<'EOF'
Add Runrate and Analytics tabs and load analytics on demand.

EOF
)"
```

---

## Spec coverage

| Spec requirement | Task |
| --- | --- |
| Top-level Runrate / Analytics tabs | 11 |
| `GET /api/analytics?from=&to=` | 8 |
| Previous period = equal length before `from` | 2, 7 |
| Server facts only; rate math in browser | 3, 4, 10 |
| Issued non-draft non-void by invoice date | 1, 4, 7 |
| All time entries by log date | 4, 6 |
| Per-client rows + studio total; Quantum not special-cased | 4, 9 |
| Unassigned blank customer | 4 |
| Sold hours, hours/£ variance, effective rate | 3 |
| Overshoot / Headroom / On rate (≤ 0.5h) / No time / No invoices | 3, 9 |
| Rolling 7d / 1m / 3m / 6m / 1y | 2, 9 |
| Session hourly rate + temporary label | 5, 10, 11 |
| `analyticsRangePreset` in session config | 5 |
| `?view=analytics` | 11 |
| Fetch only on tab open / preset change | 11 |
| Connect / analytics error / empty / missing rate / 400 dates | 8, 10, 11 |
| Timesheet scope + do not swallow 401 as 0 hours | 6, 8 |
| Vitest domain + Zoho mapper tests | 1–7 |
| Storybook play tests | 9–11 |
| Source badges Timesheets / Issued | 9, 10 |

## Placeholder / type check

- No TBD/TODO left in tasks.
- Names are stable across tasks: `parseHours`, `isIssuedInvoice`, `resolveAnalyticsRange`, `previousPeriod`, `parseAnalyticsDates`, `deriveMetrics`, `rollupPeriod`, `buildAnalyticsView`, `mapZohoTimeEntry`, `fetchTimeEntriesInRange`, `fetchInvoicesInRange`, `assembleAnalyticsSnapshot`, `buildZohoAnalytics`, `AnalyticsSnapshot`, `AnalyticsRangePreset`.
