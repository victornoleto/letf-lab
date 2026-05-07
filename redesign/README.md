# Redesign loop

Sequenced execution of the AI-Swing visual redesign produced by Claude Design.

## What this is

The design lives in `/var/www/pessoal/ai-swing/design-export/` (tokens, components, layouts, charts).
This folder is the **execution plan** that translates that design into Angular code, one atomic task at a time.

`loop.sh` reads `progress.md`, picks the next pending task, dispatches a fresh headless
`claude --print` session pointed at the task file, verifies the result (build must pass),
updates progress, and continues.

## Layout

```
redesign/
├── loop.sh             # the runner
├── progress.md         # checklist (state machine)
├── README.md           # this file
├── tasks/
│   ├── task-001-foundation.md
│   ├── task-002-theme-service.md
│   ├── task-003-shell-sidebar.md
│   ├── task-004-dashboard.md
│   ├── task-005-strategy-detail.md
│   ├── task-006-list-pages.md
│   ├── task-007-forms-modals.md
│   ├── task-008-states-polish.md
│   └── task-009-final-qa.md
└── logs/               # one file per run
```

## Usage

```bash
cd /var/www/pessoal/ai-swing/redesign

./loop.sh --status      # show current state
./loop.sh               # run all remaining tasks until done or failure
./loop.sh --next        # run only the next pending task
./loop.sh --task 003    # force-run a specific task by number
./loop.sh --reset       # reset all [~] / [!] back to [ ]
```

Override the claude binary path:

```bash
CLAUDE_BIN=/path/to/claude ./loop.sh
```

## Design choices

- **Atomic tasks.** Each task is a single, reviewable PR-sized change.
  Boundaries match the design-export's "ordem de implementação".
- **Stop on failure.** The loop halts if a task doesn't emit `TASK DONE: <file>`.
  This forces inspection rather than silent breakage.
- **Self-contained tasks.** A task file lists every spec the executing session
  needs. Re-runs work from scratch (no implicit conversation memory).
- **Build is the gate.** Every task must end with a clean
  `npx ng build --configuration=development`. If it fails, the task failed.
- **Filesystem state machine.** Progress lives in plain markdown.
  Stop the loop, edit `progress.md` by hand, and resume — it just works.

## Failure recovery

When a task fails:

1. Open `redesign/logs/<latest>-task-XXX-*.log` and read the failure reason.
2. Decide:
   - **Bug in the task file** → edit the task file, then `--reset` and re-run.
   - **Bug in earlier output** → fix the earlier change manually, then `--reset` and re-run from where it broke.
   - **Spec ambiguity** → consult `design-export/` and clarify the task file before retrying.
3. Run `./loop.sh --reset` (or hand-edit `progress.md` to flip `[!]` back to `[ ]`).
4. Run `./loop.sh` again.

## What each task produces

| # | Task | Touches |
|---|------|---------|
| 001 | foundation | `frontend/src/styles.scss`, `frontend/src/styles/*.scss` (new), `frontend/src/index.html`, `frontend/src/assets/icons/sprite.svg` (new) |
| 002 | theme-service | `frontend/src/app/shared/theme/*` (new), `frontend/src/app/shared/charts/chart-tokens.ts` (new) |
| 003 | shell-sidebar | `frontend/src/app/app.{ts,html,scss}`, `frontend/src/app/shared/sidebar/*` (new) |
| 004 | dashboard | `frontend/src/app/pages/dashboard/{dashboard,strategy-card,sparkline}.ts` |
| 005 | strategy-detail | `frontend/src/app/pages/strategy-detail/{strategy-detail,backtest-panel,signal-history-table}.ts` |
| 006 | list-pages | `frontend/src/app/pages/strategies/strategies-list.ts`, `frontend/src/app/pages/indicators/indicators-list.ts` |
| 007 | forms-modals | `frontend/src/app/shared/modal/modal.ts`, `frontend/src/app/pages/strategies/strategy-form.ts`, `frontend/src/app/pages/indicators/indicator-form.ts` |
| 008 | states-polish | new shared components (skeleton / empty / tooltip) + integration |
| 009 | final-qa | screenshots in `frontend/screenshots-redesign/{light,dark}/` |
