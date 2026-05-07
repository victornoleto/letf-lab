# Task 014 (v2) — Final QA: 30 screenshots (15 routes × 2 themes) + AA contrast audit

**Goal:** Capture deterministic screenshots of every screen the canonical design covers (15 screens), in both themes (light/dark). Total = 30 screenshots. Document any visible issues. Final `npx ng build` must pass clean.

## Pre-conditions

- Tasks 001-013 done.
- Backend + frontend boot cleanly:
  - Backend: `cd backend && source .venv/bin/activate && uvicorn ai_swing.main:app --host 127.0.0.1 --port 8000 --log-level warning`
  - Frontend: `cd frontend && npx ng serve --port 4200 --host 127.0.0.1`
- Seeds: 5 strategies + 4 indicators populated (`make seed` if needed).
- Trigger one refresh once: `curl -X POST 'http://127.0.0.1:8000/api/refresh?force=true'` to populate signal_history.

## Sources

1. `design-export/screenshots/README.md` — suggested Playwright script (we'll use the available browser_* tools instead)
2. `design-export/00-OVERVIEW.md` — what the visual outcome should feel like

## Steps

### 14a — Boot stack

Start both servers in the background. Wait for both ports to respond.

```bash
cd /var/www/pessoal/ai-swing/backend && source .venv/bin/activate \
  && uvicorn ai_swing.main:app --host 127.0.0.1 --port 8000 --log-level warning &
cd /var/www/pessoal/ai-swing/frontend && npx ng serve --port 4200 --host 127.0.0.1 &

until curl -s http://127.0.0.1:8000/api/health >/dev/null; do sleep 1; done
until curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4200/ | grep -q '200\|304'; do sleep 2; done
curl -s -X POST 'http://127.0.0.1:8000/api/refresh?force=true' >/dev/null
```

### 14b — Capture matrix (15 routes × 2 themes = 30 screenshots)

Use the available `browser_*` Playwright tools. The canonical spec covers 15 screens. Capture each in **light** and **dark** at viewport 1366×768.

| Slug                  | Route / how to reach it                                                              |
|-----------------------|---------------------------------------------------------------------------------------|
| `dashboard`           | `/dashboard`                                                                          |
| `strategy-list`       | `/strategies`                                                                         |
| `strategy-detail`     | `/strategies/1`                                                                       |
| `strategy-form`       | `/strategies/1/edit`                                                                  |
| `indicator-list`      | `/indicators`                                                                         |
| `indicator-form`      | `/indicators/1/edit`                                                                  |
| `settings`            | `/settings`                                                                           |
| `sidebar-collapsed`   | `/dashboard` after `localStorage.setItem('ai-swing.sidebar.collapsed', '1')` and reload |
| `empty`               | `/strategies` after deleting all strategies (or simulate by mocking the API to return []) |
| `loading`             | `/dashboard` captured during loading. Throttle network OR add `?delay=2000` query handler. If too hard, use `browser_evaluate` to set the component's `loading` signal to true and re-render. |
| `modal`               | `/strategies` with confirm-delete dialog open (click delete icon) |
| `palette`             | Any route with `⌘K` palette open (`browser_evaluate` to call `paletteService.open()`) |
| `toast`               | Any route with toasts displayed (`browser_evaluate` to call `toastService.push(...)`) |
| `login`               | `/login`                                                                              |
| `notfound`            | `/this-route-does-not-exist`                                                          |

For each capture (pseudocode):
1. `browser_resize({ width: 1366, height: 900 })`  (height a bit larger so full-page captures all scrolled content)
2. `browser_navigate('http://127.0.0.1:4200/dashboard')` (set theme first)
3. `browser_evaluate("localStorage.setItem('ai-swing.theme', '<light|dark>')")` then `browser_evaluate("location.reload()")`
4. `browser_navigate('http://127.0.0.1:4200<target route>')`
5. `browser_wait_for({ text: '<recognizable text>' })`
6. For overlay states (modal, palette, toast): trigger via click or `browser_evaluate` calling the appropriate service
7. `browser_take_screenshot({ fullPage: true, filename: 'frontend/screenshots-redesign/<theme>/<slug>_1366.png' })`

Total = 15 × 2 = 30 PNGs.

Create directories first:
```bash
mkdir -p /var/www/pessoal/ai-swing/frontend/screenshots-redesign/{light,dark}
```

Optional bonus (mobile responsive): repeat dashboard + strategy-list + strategy-detail + login at `768×1024` for both themes. +8 screenshots if you have time.

### 14c — Quick AA contrast pass

Eyeball each captured screenshot. Document in `frontend/screenshots-redesign/AA-CHECK.md`:

```markdown
# AA contrast — Linear DNA redesign

## Light
- Body text on bg: ✓ pass
- Muted text on surface: ✓ pass
- Primary button on bg: ✓ pass
- Status badges:
  - on (success-fg on success-soft): ✓ pass
  - off (danger-fg on danger-soft): ✓ pass
  - borderline (warn-fg on warn-soft): ✓ pass

## Dark
- Body text on bg: ✓ pass
- ...

## Issues found
(list each issue: which route, theme, viewport, what is wrong, screenshot file)

## Build warnings
(copy any non-error output from npx ng build, if relevant)
```

If no issues: write "No issues found" — but only after a real eyeball check.

### 14d — Build verify

```bash
cd /var/www/pessoal/ai-swing/frontend
npx ng build --configuration=development
```

Must succeed. Note any warnings in `AA-CHECK.md`.

### 14e — Stop servers

```bash
pkill -f "uvicorn ai_swing" 2>/dev/null
pkill -f "ng serve" 2>/dev/null
```

## Comparison with v1

For self-audit: open `prints/` (which has the v1-DNA screenshots from earlier in the project) and compare side-by-side with `frontend/screenshots-redesign/light/`. The visual difference should be substantial:

- Sharper corners (5-6px vs 8-12px)
- Inter typography vs IBM Plex
- Indigo accent on focus rings, primary button, sparkline borderline state
- Sidebar with kbd hints (`G 1`, `G 2`, `G 3`) and recent transitions inline
- Cards with 2px stripe (vs 3px border-left)
- Score-bar 5 segments visible
- Tables with status-cell dot (no badge in cell)
- Forms as full pages (not modal)
- Theme switch at sidebar bottom (3 icon-only)

Document a 1-paragraph "before/after" summary in `AA-CHECK.md` if helpful.

## Definition of done

1. `frontend/screenshots-redesign/light/` and `dark/` folders contain ≥ 8 PNGs each.
2. `AA-CHECK.md` exists and is filled in honestly (not "all good" without checking).
3. `npx ng build --configuration=development` exits 0.
4. Servers stopped.
5. Print `TASK DONE: task-014-final-qa.md` at end.
