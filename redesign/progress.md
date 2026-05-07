# AI-Swing redesign — progress (v2 · Linear DNA · with new screens)

> Drives `loop.sh`. Status legend: `[ ]` pending · `[~]` in-progress · `[x]` done · `[!]` failed.
>
> **v2 redesign** — Linear DNA (Inter + JetBrains Mono, indigo accent `#5e6ad2`, denser sizing,
> forms as routes, sidebar-only shell, 3 new screens: Settings, Login, Command Palette).
>
> Old v1 task files are in `tasks/v1-archive/`. The current codebase has v1 (Stripe-DNA) applied,
> so each v2 task is a *delta* — not from scratch.

## Tasks

- [x] task-001-tokens-fonts.md — tokens.scss (with JSX-canonical dark overrides) + Inter/JetBrains Mono in index.html + FOUC script + key `ai-swing.theme`
- [x] task-002-component-partials.md — rewrite every SCSS partial per Linear specs + new partials (`_settings`, `_palette`, `_login`, `_notfound`, `_brand`)
- [x] task-003-theme-service-update.md — default `'light'`, dispatch `'themechange'`, theme-switch as 3-pill control consumed by Settings (NOT sidebar)
- [x] task-004-chart-tokens-and-options.md — new `readChartTokens()` + `equityOptions` / `ratioOptions` ECharts helpers
- [x] task-005-sidebar-redo.md — custom brand SVG, status-bar without theme-switch, transitions banner at TOP of content (not in sidebar), collapsed mode 52px, mobile drawer
- [x] task-006-forms-as-routes.md — REVERT form modals → page routes (`/strategies/new`, `/strategies/:id/edit`, etc.) with single-column 560px layout
- [x] task-007-list-pages-redo.md — tables with `.status-cell` dot, hover-reveal actions, search input, pagination
- [x] task-008-dashboard-redo.md — cards with 2px accent stripe + score-bar 5 segments + 3-col ind-row + filter pills + SVG sparkline
- [x] task-009-strategy-detail-redo.md — meta-bar + `.section` panel + 3-col metrics-grid + 2-chart grid + signal-history
- [x] task-010-settings-page.md — NEW `/settings` route: 2-col layout (vertical settings-nav + form rows), Aparência section embeds theme-switch
- [x] task-011-login-page.md — NEW `/login` route: full-screen (no shell) centered card with brand + email/password + indigo Entrar + SSO
- [x] task-012-command-palette.md — NEW `<app-command-palette>` overlay opened by `⌘K`, sections (Estratégias / Indicadores / Ações / Navegação)
- [x] task-013-states-keyboard-polish.md — top loading-bar, ToastService, rich confirm-delete modal (alert icon + mono callout), G 1/2/3 keyboard, 404 page
- [x] task-014-final-qa.md — 30 screenshots (15 routes × 2 themes) + AA contrast audit

## How to run

```bash
cd redesign
./loop.sh --status      # see where we are
./loop.sh               # run all remaining
./loop.sh --next        # run only the next pending
./loop.sh --task 010    # force-run a specific
./loop.sh --reset       # reset [~]/[!] back to [ ]
```

## Dependency notes

- Tasks 001-004 are foundation (tokens, partials, theme, charts).
- Task 005 is the shell rebuild — depends on 001-002.
- Tasks 006-009 redo existing pages — depend on 001-005.
- Tasks 010-012 introduce NEW screens — depend on 001-005 (mostly), can be parallelized but the loop runs them sequentially anyway.
- Task 013 polishes states — depends on 010-012 (replaces `?` help with `⌘K` palette).
- Task 014 is final QA — depends on everything.

## Notes

- Each task runs in a fresh `claude --print` headless session. State persists only via files written to disk.
- A task is considered done only after it emits `TASK DONE: <task-file>` AND `npx ng build` exits 0.
- Logs in `logs/<timestamp>-<task>.log`.
- If a task fails, the loop stops. Inspect the log, fix manually, then `--reset` and retry.
- The v1 tasks live in `tasks/v1-archive/` for reference; the loop only picks up files matching `tasks/task-NNN-*.md` directly (the archive subdir is skipped).
