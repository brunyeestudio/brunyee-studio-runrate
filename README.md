# Runrate

In-month run-rate and receivables dashboard for Brunyee Studio. It reads Zoho
Books invoices and unbilled hourly project WIP so you can see whether you are
on target for the current month.

There is no app-user login and no database. Zoho Books is linked with a
one-operator OAuth flow; tokens live in an encrypted httpOnly cookie. Temporary
UI inputs (month targets, and similar) live in browser `sessionStorage` and are
cleared when the tab closes.

## Prerequisites

- [mise](https://mise.jdx.dev/) for pinned tools (Node 24, Corepack, Codegraph)
- Network for first-time installs (Node, pnpm via Corepack, Codegraph, Playwright browsers)

## Setup

```bash
mise install
pnpm install
pnpm exec playwright install --with-deps chromium   # first machine
pnpm setup:hooks                                    # Lefthook: format, lint, commitlint
cp .env.example .env
```

Fill `.env` with Zoho OAuth app credentials (`ZOHO_CLIENT_ID`,
`ZOHO_CLIENT_SECRET`, `ZOHO_ORGANIZATION_ID`, `ZOHO_REDIRECT_URI`,
`AUTH_SECRET`). Optional: `ZOHO_ACCOUNTS_URL` and `ZOHO_API_BASE_URL` for
region hosts.

```bash
pnpm dev
```

Then open `/api/auth/zoho/login` to connect the operator Zoho account.

## Scripts

| Script                              | Description                                           |
| ----------------------------------- | ----------------------------------------------------- |
| `pnpm dev`                          | Development server                                    |
| `pnpm build` / `pnpm start`         | Production build / preview (`vite preview`)           |
| `pnpm lint`                         | ESLint                                                |
| `pnpm format` / `pnpm format:check` | Format with Prettier                                  |
| `pnpm typecheck`                    | `svelte-check`                                        |
| `pnpm test`                         | Vitest server/unit tests                              |
| `pnpm test:coverage`                | Same suite with v8 coverage; fails if thresholds drop |
| `pnpm test:unit`                    | All Vitest projects (including Storybook)             |
| `pnpm storybook`                    | Component stories                                     |
| `pnpm commit`                       | Commitizen (conventional commits)                     |
| `pnpm setup:hooks`                  | Install Lefthook hooks                                |

## Tools

| Area    | Stack                                                       |
| ------- | ----------------------------------------------------------- |
| App     | SvelteKit, Svelte 5, TypeScript, Tailwind v4, shadcn-svelte |
| Data    | Zoho Books API (server-only OAuth); no app database         |
| Quality | Vitest, Storybook, ESLint, Prettier, Lefthook               |
| Tooling | pnpm, mise, Commitizen / commitlint, GitHub Actions         |

## AI agents

Start at [`AGENTS.md`](AGENTS.md) (Claude also loads it via `CLAUDE.md`). Shared
rules live under `.agents/rules/` (`clean-code`, `context-mode`) and are mirrored
for Cursor, Claude, Windsurf, and Copilot.

| Layer          | Path                                                                                           | Role                                                           |
| -------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Rules          | `.agents/rules/` (+ `.cursor/rules`, `.claude/rules`, `.windsurf/rules`, Copilot instructions) | Project conventions (`clean-code`, `context-mode`)             |
| Project skills | `.agents/skills/`                                                                              | Optional repo-specific Agent Skills                            |
| Superpowers    | `.agents/plugins/superpowers/`                                                                 | Vendored methodology plugin (skills, hooks, harness manifests) |
| Pointers       | `AGENTS.md`, `CLAUDE.md`, `.gemini/settings.json`                                              | Agent entry points                                             |

### Superpowers

Install the [Superpowers](https://github.com/obra/superpowers) plugin in your
harness so `using-superpowers` bootstraps at session start. Skills are vendored
at `.agents/plugins/superpowers/skills/`. Typical flow: brainstorm → plan →
implement with TDD → finish the branch.

| Harness         | Install                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Claude Code     | `/plugin install superpowers@claude-plugins-official`                                                                           |
| Cursor          | `/add-plugin superpowers`                                                                                                       |
| Codex App / CLI | Plugins UI or `/plugins` → Superpowers                                                                                          |
| Gemini CLI      | `gemini extensions install https://github.com/obra/superpowers` or `gemini extensions install ./.agents/plugins/superpowers`    |
| Copilot CLI     | `copilot plugin marketplace add obra/superpowers-marketplace` then `copilot plugin install superpowers@superpowers-marketplace` |
| OpenCode        | `"plugin": ["superpowers@git+https://github.com/obra/superpowers.git"]` in `opencode.json`                                      |
| Pi              | `pi install git:github.com/obra/superpowers` or `pi -e .agents/plugins/superpowers`                                             |

Full details: [`.agents/plugins/superpowers/README.md`](.agents/plugins/superpowers/README.md).

## Testing

Domain and server helpers under `src/lib/runrate/` and `src/lib/server/` need
unit tests that cover their branches. Dashboard components also need Storybook
stories for the main visual states. Do not lower coverage thresholds to make
the suite pass.

| Command              | What it runs                                                              |
| -------------------- | ------------------------------------------------------------------------- |
| `pnpm test`          | Vitest server/unit tests                                                  |
| `pnpm test:coverage` | Same suite with v8 coverage; fails if thresholds in `vite.config.ts` drop |
| `pnpm storybook`     | Component stories                                                         |

Before merge: `pnpm typecheck`, `pnpm lint`, `pnpm test:coverage`. CI also
builds Storybook and enforces the coverage floor.

## Quality gates

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test:coverage
pnpm build
```
