# Task 009 — Final QA (light/dark screenshots + AA contrast + build verify)

**Goal:** Capture deterministic screenshots of every route in both themes (light/dark) and both viewports (1366×768 and 768×1024), confirm the build is clean, and document any AA contrast issues found. The output is `frontend/screenshots-redesign/` ready for visual review against the design canvas.

## Pre-conditions

- Tasks 001-008 done.
- The app builds and runs locally:
  - Backend: `cd backend && source .venv/bin/activate && uvicorn ai_swing.main:app --host 127.0.0.1 --port 8000 --log-level warning`
  - Frontend: `cd frontend && npx ng serve --port 4200 --host 127.0.0.1`
- Seeds exist (5 example strategies + 4 indicators). If not: `cd backend && python -m scripts.seed`.
- Optional: `curl -X POST 'http://127.0.0.1:8000/api/refresh?force=true'` to populate signal_history.

## Sources

1. `design-export/screenshots/README.md` — suggested Playwright script
2. `design-export/00-OVERVIEW.md` — what the final design should feel like
3. The design canvas HTML (if present): `design-export/AI-Swing redesign.html`

## Steps

### 9a — Boot the stack

Start both servers in the background. Wait until both respond:

```bash
cd /var/www/pessoal/ai-swing/backend && source .venv/bin/activate \
  && uvicorn ai_swing.main:app --host 127.0.0.1 --port 8000 --log-level warning &
cd /var/www/pessoal/ai-swing/frontend && npx ng serve --port 4200 --host 127.0.0.1 &

# Wait for readiness
until curl -s http://127.0.0.1:8000/api/health >/dev/null; do sleep 1; done
until curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4200/ | grep -q '200\|304'; do sleep 2; done
```

Trigger refresh once to populate signal_history:
```bash
curl -s -X POST 'http://127.0.0.1:8000/api/refresh?force=true' >/dev/null
```

### 9b — Capture screenshots

Use Playwright via the available tools (`browser_navigate`, `browser_resize`, `browser_take_screenshot`). Capture matrix:

| Theme | Viewport | Routes |
|---|---|---|
| light | 1366×768 | `/dashboard`, `/strategies`, `/strategies/1`, `/indicators`, `/strategies?new=true`, `/strategies?edit=1`, `/indicators?new=true`, `/indicators?edit=1` |
| light | 768×1024 | `/dashboard`, `/strategies`, `/strategies/1` |
| dark | 1366×768 | (same as light 1366×768) |
| dark | 768×1024 | (same as light 768×1024) |

Total ≈ 22 screenshots.

For each capture:
1. Set viewport (`browser_resize`).
2. Apply theme: navigate to `/dashboard`, run `localStorage.setItem('aiswing.theme', '<light|dark>')` via `browser_evaluate`, then `browser_navigate` again to the target route.
3. Wait for content (`browser_wait_for` with a recognizable text from the page).
4. Save `fullPage: true` PNG to `frontend/screenshots-redesign/<theme>/<route-slug>_<viewport-w>x<h>.png`.

Naming convention for `<route-slug>`:
- `/dashboard` → `dashboard`
- `/strategies` → `strategies-list`
- `/strategies/1` → `strategy-detail-1`
- `/indicators` → `indicators-list`
- `/strategies?new=true` → `strategy-modal-create`
- `/strategies?edit=1` → `strategy-modal-edit`
- `/indicators?new=true` → `indicator-modal-create`
- `/indicators?edit=1` → `indicator-modal-edit`

Create the directories ahead of time:
```bash
mkdir -p /var/www/pessoal/ai-swing/frontend/screenshots-redesign/{light,dark}
```

### 9c — AA contrast check (sanity)

For each theme, manually inspect (via the captured screenshots or a contrast tool):

- Body text on `--bg` and `--surface` — should be ≥ 4.5:1.
- Muted text (`--text-muted`) — must remain ≥ 4.5:1 on its surface.
- Status badges (success/danger/warn) — text on bg ≥ 4.5:1.
- Primary button — text on background ≥ 4.5:1.

Quick scripted check via Playwright `evaluate` is acceptable but not required. Document findings in a markdown file:

`frontend/screenshots-redesign/AA-CHECK.md`:
```markdown
# AA contrast — quick audit

## Light
- Body text on bg: ✓ pass
- ...

## Dark
- ...

## Issues found
(list any element where contrast < 4.5:1 with theme/component)
```

If no issues: write "No issues found" under "Issues found" — don't pretend everything is perfect if you see something off.

### 9d — Build verify

```bash
cd /var/www/pessoal/ai-swing/frontend
npx ng build --configuration=development
```

Build must succeed with zero errors. Warnings are acceptable but list them in the AA-CHECK.md file under "Build warnings" if present.

### 9e — Stop servers

```bash
pkill -f "uvicorn ai_swing" 2>/dev/null
pkill -f "ng serve" 2>/dev/null
```

## What NOT to change

- No code changes in this task. Only screenshot capture and audit.
- If you spot a real visual bug, document it in `AA-CHECK.md` under "Bugs found" but DO NOT fix it here. The user reviews and decides whether to add a follow-up task.

## Verification

After completion the directory tree should look like:

```
frontend/screenshots-redesign/
├── AA-CHECK.md
├── light/
│   ├── dashboard_1366x768.png
│   ├── dashboard_768x1024.png
│   ├── strategies-list_1366x768.png
│   ├── strategy-detail-1_1366x768.png
│   ├── strategy-detail-1_768x1024.png
│   ├── indicators-list_1366x768.png
│   ├── strategy-modal-create_1366x768.png
│   ├── strategy-modal-edit_1366x768.png
│   ├── indicator-modal-create_1366x768.png
│   └── indicator-modal-edit_1366x768.png
└── dark/
    └── (same files mirrored)
```

(viewport count for tablet may be smaller — minimum 3 routes per theme/viewport combo; 22 total is the target.)

```bash
ls /var/www/pessoal/ai-swing/frontend/screenshots-redesign/light/ | wc -l
# Should print >= 8
ls /var/www/pessoal/ai-swing/frontend/screenshots-redesign/dark/ | wc -l
# Should print >= 8
```

## Definition of done

1. Both `light/` and `dark/` directories under `screenshots-redesign/` contain the expected files.
2. `AA-CHECK.md` exists and is filled in honestly.
3. Final `npx ng build --configuration=development` succeeds.
4. Servers stopped at the end.
5. Print `TASK DONE: task-009-final-qa.md` at end.
