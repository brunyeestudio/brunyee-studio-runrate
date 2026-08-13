# Runrate

In-month run-rate and receivables dashboard for Brunyee Studio. It reads Zoho Books invoices and unbilled hourly project WIP so the operator can see whether they are on target for the current month.

There is **no app-user authentication**, **no database**, and **no durable app settings**. Zoho Books is linked via a one-operator OAuth flow; tokens live in an encrypted httpOnly cookie. Temporary UI inputs (e.g. month target figures) live in **browser `sessionStorage`** and must be labeled as temporary in the UI.

## Directory map

| Path                                                | Role                                      |
| --------------------------------------------------- | ----------------------------------------- |
| `src/lib/runrate/`                                  | Pure domain (classify, aggregate, format) |
| `src/lib/server/zoho/`                              | Zoho auth + HTTP + dashboard aggregation  |
| `src/lib/components/dashboard/`                     | App UI (shadcn-svelte)                    |
| `src/routes/api/dashboard/`                         | GET snapshot JSON                         |
| `src/routes/+page.svelte`                           | Dashboard shell                           |
| `.agents/`                                          | Skills, Superpowers plugin, shared rules  |
| `.cursor/rules`, `.claude/rules`, `.windsurf/rules` | Harness mirrors of `.agents/rules/`       |
| `.github/`                                          | CI, Copilot instructions, PR template     |

## Setup

1. `mise install` — Node 24 (Corepack) + Codegraph tool postinstall
2. `pnpm install`
3. `pnpm exec playwright install --with-deps chromium` (first machine / CI image; Storybook / browser Vitest)
4. `pnpm setup:hooks` — Lefthook (format/lint pre-commit, commitlint)

## Commands

| Command                             | Purpose                                         |
| ----------------------------------- | ----------------------------------------------- |
| `pnpm dev`                          | Vite / SvelteKit dev server                     |
| `pnpm build` / `pnpm start`         | Production build and preview (`vite preview`)   |
| `pnpm lint`                         | ESLint                                          |
| `pnpm format` / `pnpm format:check` | Oxfmt write / check                             |
| `pnpm typecheck`                    | `svelte-kit sync` + `svelte-check`              |
| `pnpm test`                         | Vitest server/unit project                      |
| `pnpm test:coverage`                | Same suite with v8 coverage gate                |
| `pnpm test:unit`                    | All Vitest projects (server, client, Storybook) |
| `pnpm storybook`                    | Component stories                               |
| `pnpm commit`                       | Commitizen conventional commit                  |
| `pnpm setup:hooks`                  | Install Lefthook git hooks                      |

## Stack & conventions

- **Svelte 5** with runes (`$props`, `$state`, `$derived`) — forced on in Vite config
- **SvelteKit** with `@sveltejs/adapter-vercel`
- **Tailwind CSS v4** + **shadcn-svelte** (sera style, olive base) under `$lib/components/ui`
- **Always dark mode** — root must have class `dark`; do not add a theme toggle or light-mode UI
- Reuse theme tokens from `src/routes/layout.css`
- Icons: Phosphor (`phosphor-svelte`)
- Specs for Zoho Books live in `openapi-all/` (reference only; do not generate a full SDK unless needed)
- Formatter is **Oxfmt** (Svelte + Tailwind class sorting enabled in `.oxfmtrc.json`)

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

| Concern                     | Notes                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------- |
| Outstanding invoices        | Unpaid-like status with `balance > 0` and `due_date` today or earlier (excludes not-yet-due)            |
| Drafts                      | `Status.Draft`                                                                                          |
| Scheduled next month        | Non-empty `schedule_time` in next calendar month                                                        |
| Draft dated 1st next month  | Draft with `date ===` first day of next month → **earned pipeline**, source `Draft invoices`            |
| Due this / next month       | Receivable invoices (`balance > 0`, unpaid-like) bucketed by `due_date` month — includes not-yet-due    |
| Cash collected              | Payments with `last_payment_date` in current month                                                      |
| Issued this month           | Non-draft invoices with `date` in current month                                                         |
| Issued on 1st of this month | Non-draft invoices with `date ===` first day of current month → NET 30 cash forecast, source `Issued`   |
| Issued on 1st last month    | Non-draft invoices with `date ===` first day of previous month → **earned last month**, source `Issued` |
| Hourly project WIP          | Active projects with hourly `billing_type`; use detail `un_billed_amount` → source `Projects (hourly)`  |

**Brunyee billing pattern:** invoices may be created any day, often sent/scheduled on the 1st of the month, due ~30 days later. Payment timing follows `due_date`, not create date.

Every money figure shown in the UI should carry a clear **source** label/badge (`Outstanding`, `Draft invoices`, `Scheduled`, `Projects (hourly)`, `Cash collected`, `Issued`, etc.).

Hourly billing types: `based_on_project_hours`, `based_on_staff_hours`, `based_on_task_hours`.

## Testing & coverage requirements

Every domain/server change must be covered by tests and must not regress coverage.

- **Unit tests** (`src/**/*.test.ts`, Vitest server project) cover domain logic, formatters, session-config, and Zoho client helpers.
- `pnpm test:coverage` runs that suite with the v8 provider and fails when coverage drops below the thresholds in `vite.config.ts`.
- **Storybook stories** (`src/**/*.stories.svelte`) are required for dashboard components and should cover the main visual states (`play` interaction tests).
- Do **not** use Vitest browser/component tests for UI coverage — prefer Storybook + `@storybook/addon-vitest`.
- **Gate before merge:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test:coverage`. CI also builds Storybook and checks Oxfmt. Do not remove or weaken coverage thresholds to make a failing suite pass; add the missing tests instead.

Co-locate tests with features:

- `$lib/runrate/*.test.ts`
- `$lib/server/zoho/*.test.ts`
- `$lib/components/dashboard/*.stories.svelte`

## Agent assets

| Kind           | Location                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------- |
| Rules          | `.agents/rules/` (`clean-code`, `context-mode`) + Cursor/Claude/Windsurf/Copilot mirrors |
| Project skills | `.agents/skills/` (optional)                                                             |
| Superpowers    | `.agents/plugins/superpowers/` (plugin skills, hooks, harness manifests)                 |

Follow shared rules always. Prefer Superpowers skills under `.agents/plugins/superpowers/skills/` when they apply (`using-superpowers`, brainstorming, plans, TDD, debugging). Install the plugin in your harness so bootstrap runs — see [`README.md`](README.md#superpowers) and [`.agents/plugins/superpowers/README.md`](.agents/plugins/superpowers/README.md). Claude loads this file via `CLAUDE.md` (`@AGENTS.md`). Gemini uses `.gemini/settings.json`.

## Available Svelte MCP Tools

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant to the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.
