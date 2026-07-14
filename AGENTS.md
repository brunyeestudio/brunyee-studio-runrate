## Project Configuration

- **Language**: TypeScript
- **Package Manager**: pnpm
- **Add-ons**: prettier, eslint, vitest, playwright, tailwindcss, sveltekit-adapter, mcp, storybook

---

## Product

**Runrate** is an in-month run-rate and receivables dashboard for Brunyee Studio. It reads Zoho Books invoices and unbilled hourly project WIP so the user can see whether they are on target for the current month.

There is **no app-user authentication**, **no database**, and **no durable app settings**. Zoho Books is linked via a one-operator OAuth flow; tokens live in an encrypted httpOnly cookie. Temporary UI inputs (e.g. month target figures) live in **browser `sessionStorage`** and must be labeled as temporary in the UI.

---

## Stack & conventions

- **Svelte 5** with runes (`$props`, `$state`, `$derived`) — forced on in Vite config
- **SvelteKit** with `@sveltejs/adapter-vercel`
- **Tailwind CSS v4** + **shadcn-svelte** (sera style, olive base) under `$lib/components/ui`
- **Always dark mode** — root must have class `dark`; do not add a theme toggle or light-mode UI
- Reuse theme tokens from `src/routes/layout.css`
- Icons: Phosphor (`phosphor-svelte`)
- Specs for Zoho Books live in `openapi-all/` (reference only; do not generate a full SDK unless needed)

---

## Architecture rules

### Zoho Books — server only

- OAuth app credentials come from environment variables (`.env` / Vercel):
  - `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_ORGANIZATION_ID`, `ZOHO_REDIRECT_URI`, `AUTH_SECRET`
  - Optional: `ZOHO_ACCOUNTS_URL`, `ZOHO_API_BASE_URL` (region hosts; may be overridden from token response)
- Operator connects via `/api/auth/zoho/login` → Zoho authorize → `/api/auth/zoho/callback`
- Access/refresh tokens are sealed with `AUTH_SECRET` into an httpOnly cookie (`runrate_zoho`) — no DB
- All Zoho HTTP calls go through `$lib/server/zoho/*` and SvelteKit `+server.ts` routes
- Never expose refresh tokens, client secrets, or access tokens to the browser
- Browser calls `/api/dashboard` and `/api/auth/zoho/*` only

### Temporary browser config

- Key: `runrate:temp-config` in `sessionStorage`
- Helpers live in `$lib/runrate/session-config.ts`
- Mark every temporary input in the UI (e.g. “Temporary — cleared when the tab closes”)

### Domain model (`$lib/runrate/`)

Pure TypeScript, no Svelte — unit-tested with Vitest:

| Concern | Notes |
|---------|--------|
| Outstanding invoices | Unpaid-like status with `balance > 0` and `due_date` today or earlier (excludes not-yet-due) |
| Drafts | `Status.Draft` |
| Scheduled next month | Non-empty `schedule_time` in next calendar month |
| Draft dated 1st next month | Draft with `date ===` first day of next month → **earned pipeline**, source `Draft invoices` |
| Due this / next month | Receivable invoices (`balance > 0`, unpaid-like) bucketed by `due_date` month — includes not-yet-due |
| Cash collected | Payments with `last_payment_date` in current month |
| Issued this month | Non-draft invoices with `date` in current month |
| Issued on 1st of this month | Non-draft invoices with `date ===` first day of current month → NET 30 cash forecast, source `Issued` |
| Hourly project WIP | Active projects with hourly `billing_type`; use detail `un_billed_amount` → source `Projects (hourly)` |

**Brunyee billing pattern:** invoices may be created any day, often sent/scheduled on the 1st of the month, due ~30 days later. Payment timing follows `due_date`, not create date.

Every money figure shown in the UI should carry a clear **source** label/badge (`Outstanding`, `Draft invoices`, `Scheduled`, `Projects (hourly)`, `Cash collected`, `Issued`, etc.).

Hourly billing types: `based_on_project_hours`, `based_on_staff_hours`, `based_on_task_hours`.

---

## Testing rules

| What | How |
|------|-----|
| Domain logic, formatters, session-config, Zoho client helpers | **Vitest** `*.test.ts` (server/node project) |
| UI components | **Storybook** `*.stories.svelte` with `play` interaction tests |
| Do **not** use Vitest browser/component tests for UI coverage | Prefer Storybook + `@storybook/addon-vitest` |

Co-locate tests with features:

- `$lib/runrate/*.test.ts`
- `$lib/server/zoho/*.test.ts`
- `$lib/components/dashboard/*.stories.svelte`

---

## File layout (app)

```
src/lib/runrate/           # pure domain
src/lib/server/zoho/       # Zoho auth + HTTP + dashboard aggregation
src/lib/components/dashboard/  # app UI (shadcn-based)
src/routes/api/dashboard/  # GET snapshot JSON
src/routes/+page.svelte    # dashboard shell
```

---

## Available Svelte MCP Tools

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.
