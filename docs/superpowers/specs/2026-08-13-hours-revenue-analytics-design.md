# Hours vs revenue analytics

Date: 2026-08-13  
Status: Approved for implementation planning  
Branch: `feat/hours-revenue-analytics`

## Problem

Runrate shows in-month invoices and unbilled hourly WIP. It does not show whether time logged is covered by issued revenue at a target hourly rate. Fixed-quote clients (for example Quantum) need to be judged on their own row, not mixed into a studio average.

## Approach

**Approach A.** A top-level **Analytics** tab with its own API. The server returns period facts (hours and issued revenue). The browser applies the existing session hourly rate so changing the rate recalculates instantly without a refetch.

## Architecture

Top-level tabs on the existing dashboard shell: **Runrate** | **Analytics**. Runrate is unchanged. Analytics does not call Zoho until that tab is opened, or the range preset changes while it is open.

```
Browser                    SvelteKit                         Zoho
  |                            |                               |
  |  GET /api/analytics        |                               |
  |  ?from=&to=                |  GET /invoices (date range)   |
  |                            |------------------------------>|
  |                            |  GET /projects/timeentries    |
  |                            |------------------------------>|
  |  AnalyticsSnapshot         |                               |
  |<---------------------------|                               |
  |                            |                               |
  |  hourlyRate (session)      |                               |
  |  → sold hours, variance,   |                               |
  |    effective rate          |                               |
```

### API

`GET /api/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD`

- `from` and `to` are inclusive calendar dates.
- The server derives the **previous period** as the same number of days immediately before `from`.
  - Example: current `2026-07-15`–`2026-08-13` (30 days) → previous `2026-06-15`–`2026-07-14`.
- Invalid or missing dates → `400` with a short error. The UI only sends preset-derived dates.

### Server returns (facts only)

No sold hours, variance, or status. Those depend on the hourly rate.

For **current** and **previous** periods:

- Studio totals: hours spent, issued revenue (GBP), time-entry count, invoice count, currency breakdowns
- Per-customer rows: same fields, keyed by Zoho `customer_name`
- Source labels: `Timesheets` and `Issued`
- Period date bounds the server actually used

Foreign invoice amounts convert to GBP with the same Frankfurter path as Runrate.

### Browser derives (when hourly rate is set and > 0)

- Sold hours = revenue ÷ hourly rate
- Hours variance = hours spent − sold hours
- £ variance = revenue − (hours spent × hourly rate)
- Effective rate = revenue ÷ hours spent (only when hours spent > 0)

### Inclusions

| Fact | Rule |
| --- | --- |
| Revenue | Non-draft, non-void invoices whose **invoice date** is in the period |
| Hours | All Zoho time entries whose **log date** is in the period |
| Client key | Zoho `customer_name`; blank → `Unassigned` |
| Client set | Union of customers that appear in hours or invoices in the **current** period. Previous-period figures attach to those same names (0 if absent). |

### Out of scope

- Project WIP, drafts, cash collected, and Runrate KPIs in this API
- Hardcoded Quantum (or any client) special-case
- Durable settings or a database
- Calendar-month presets (windows are rolling, not “August 2026”)
- Marking clients as fixed-quote vs hourly

## Metrics

All rate-based figures recompute in the browser from the existing `hourlyRate` in `runrate:temp-config`. Changing the rate does not refetch.

### Per client and studio total

| Metric | Formula | Source |
| --- | --- | --- |
| Hours spent | Sum of time-entry hours in range | `Timesheets` |
| Revenue | Sum of issued invoice totals in range (GBP) | `Issued` |
| Sold hours | Revenue ÷ hourly rate | Derived |
| Hours variance | Hours spent − sold hours | Derived |
| £ variance | Revenue − (hours spent × rate) | Derived |
| Effective rate | Revenue ÷ hours spent | Derived |

### Status

| Status | When |
| --- | --- |
| **Overshoot** | Hours variance > +0.5h. Spent more time than invoices paid for at the target rate. Effective rate is below the configured rate. £ variance is negative. |
| **Headroom** | Hours variance < −0.5h. Invoices more than cover the time. Effective rate is above the configured rate. £ variance is positive. |
| **On rate** | Absolute hours variance ≤ 0.5h. Slack exists so rounding does not flip the label. Exactly ±0.5h is On rate. |
| **No time logged** | Hours spent = 0 and revenue > 0. Sold hours still shown when rate is set. Effective rate blank. |
| **No invoices** | Hours spent > 0 and revenue = 0. Effective rate is £0. Full overshoot at any positive rate. |

### Missing inputs

- No hourly rate (unset, non-finite, or ≤ 0) → show hours and revenue only. Sold hours, both variances, effective rate, and Overshoot/Headroom/On rate stay blank. UI copy: “Enter hourly rate”.
- Hours spent = 0 and revenue = 0 should not appear as a client row (no current-period activity).

### Period comparison

Presets are rolling windows **ending today (inclusive)**:

| Preset | Length |
| --- | --- |
| `7d` | 7 days |
| `1m` | 30 days (default) |
| `3m` | 90 days |
| `6m` | 180 days |
| `1y` | 365 days |

Previous period is the same length immediately before the current window.

Each metric shows current, previous, and delta (current − previous). Percent change is shown only when the previous value is not zero.

### Hourly rate

Reuse the existing session `hourlyRate`. Analytics shows the same input, labeled temporary, so the rate can be changed without switching back to Runrate. Writes go through the existing `writeTempConfig` helper.

Range preset is also stored in `runrate:temp-config` (new optional field `analyticsRangePreset`) and labeled temporary.

## UI

### Navigation

Tab list under the existing dashboard header: **Runrate** | **Analytics**.

- Runrate keeps month-target / pace and current KPIs.
- Analytics replaces that body.
- Optional query `?view=analytics` so a refresh stays on the tab. Default is Runrate.
- Dark sera/olive language only. No theme toggle.

### Analytics chrome

- Range toggle (line variant): `7d` / `1m` / `3m` / `6m` / `1y`
- Hourly rate input (same session field as Runrate)
- Temporary label on both: “Temporary — cleared when the tab closes”
- Period caption, e.g. `15 Jul 2026 – 13 Aug 2026` vs previous `15 Jun 2026 – 14 Jul 2026`

### Studio KPI row

Four cards, each with a source badge where applicable:

1. **Hours spent** — current hours, delta vs previous · source `Timesheets`
2. **Issued revenue** — current £, delta vs previous · source `Issued`
3. **Hours vs sold** — hours variance + status badge, plus £ variance
4. **Effective rate** — £/h vs the configured rate (blank until rate and hours exist)

### Client table

Studio total row pinned at the top. Then one row per Zoho customer.

Columns: Client, Hours (current + Δ), Revenue (current + Δ), Sold hours, Hours var (badge + hours), £ var, Effective rate.

Default sort: largest absolute £ variance first (clients with no rate sort after those with a computable £ variance, then by hours spent descending). Quantum appears as a normal customer row.

Status badge colours: Overshoot destructive, Headroom positive, On rate muted, No time logged / No invoices muted.

### Fetch behaviour

- Fetch Analytics only when the Analytics tab is opened or the preset changes.
- Changing the hourly rate does not refetch.
- While a range request is in flight, show skeleton KPI row + table; keep the previous snapshot if one exists.

## File layout

| Area | Path |
| --- | --- |
| Domain (pure TS) | `$lib/runrate/analytics.ts`, types in `$lib/runrate/types.ts` (or a sibling `analytics-types.ts` if `types.ts` would become crowded) |
| Session | Extend `TempSessionConfig` with `analyticsRangePreset` |
| Zoho time entries | `$lib/server/zoho/time-entries.ts` |
| Zoho aggregation | `$lib/server/zoho/analytics.ts` (`buildZohoAnalytics`) |
| Route | `src/routes/api/analytics/+server.ts` |
| UI | `$lib/components/dashboard/analytics-view.svelte`, `client-analytics-table.svelte`, range-preset control |
| Shell | Top-level tabs in `dashboard-view.svelte`; fetch wiring in `+page.svelte` |

Hours parsing must accept Zoho `HH:MM` and decimal hour strings.

New revenue sources: `Timesheets` and keep `Issued` for invoice revenue.

Browser calls `/api/dashboard` and `/api/auth/zoho/*` today; add `/api/analytics` only. Tokens stay server-side.

## Error handling

| Situation | Behaviour |
| --- | --- |
| Zoho not connected | Same connect alert as Runrate. Analytics tab is visible but does not call the API. |
| Analytics fetch fails | Destructive alert in the Analytics body only. Runrate snapshot is left alone. |
| Zoho time-entries API missing or unauthorized | Surface as a fetch error with the Zoho message. Do not silently show 0 hours. |
| Empty range (connected, no time entries and no issued invoices) | Empty table plus “No timesheets or issued invoices in this range”. |
| Hourly rate missing | KPIs 1–2 still fill. Cards 3–4 and sold/variance columns show “Enter hourly rate”. |
| Invalid `from`/`to` | HTTP 400. UI does not send free-form dates. |

## Testing

Follow existing project rules.

**Vitest** (`$lib/runrate/analytics.test.ts`, `$lib/server/zoho/*.test.ts`):

- Range preset → `from`/`to` and previous-period bounds (inclusive, equal length)
- Invoice + timesheet rollup by customer, including `Unassigned` and previous-period zeros
- Sold hours, hours variance, £ variance, effective rate
- Status: Overshoot, Headroom, On rate (0.5h band), No time logged, No invoices, missing rate
- FX totals into GBP
- Time-entry hours parse (`HH:MM` and decimal)
- Date-range invoice filter (exclude draft and void)

**Storybook** (`*.stories.svelte` with `play`):

- Analytics loaded
- Empty range
- Missing hourly rate
- Overshoot vs Headroom badges
- Preset switch
- Client table default sort

Do not add Vitest browser/component tests for UI.

## Implementation notes

- Zoho list path for time entries is `/projects/timeentries` (confirm against `openapi-all/` when implementing; paginate like invoices, max 50 pages).
- Invoice fetch for Analytics should be date-bounded, not the dashboard’s multi-status full list.
- Work happens on worktree `brunyee-studio-runrate.feat-hours-revenue-analytics` / branch `feat/hours-revenue-analytics`.
