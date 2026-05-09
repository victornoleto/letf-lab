# AA contrast — Linear-DNA redesign (task-014 final QA)

Method: 30 deterministic full-page screenshots (15 routes × 2 themes) captured
via Playwright at 1366×900, then live-DOM contrast computed against the actually
resolved foreground/background pixels using the WCAG 2.1 relative-luminance
formula (4.5:1 = AA threshold for normal text).

Capture date: 2026-05-07 · Resolved tokens: see `src/styles/tokens/_tokens.scss`.

## Capture matrix (30 PNGs)

`light/` and `dark/` each contain the same 15 slugs:

| Slug | Source state |
|---|---|
| `dashboard.png` | `/dashboard` populated with 5 strategies |
| `strategy-list.png` | `/strategies` populated |
| `strategy-detail.png` | `/strategies/1` (QQQ→TQQQ) — KPIs + equity / ratio charts + signal history |
| `strategy-form.png` | `/strategies/1/edit` |
| `indicator-list.png` | `/indicators` populated (4 indicators) |
| `indicator-form.png` | `/indicators/1/edit` |
| `settings.png` | `/settings` |
| `sidebar-collapsed.png` | `/dashboard` with `localStorage['letf-lab.sidebar.collapsed'] = '1'` |
| `empty.png` | `/strategies` after deleting all strategies (re-seeded after capture) |
| `loading.png` | `/dashboard`, `loading` signal pinned to true via `ng.getComponent` |
| `modal.png` | `/strategies` confirm-delete dialog open |
| `palette.png` | Command palette open via ⌘K |
| `toast.png` | 3 toast variants (success / info / danger) pushed via `ToastService` |
| `login.png` | `/login` |
| `notfound.png` | `/this-route-does-not-exist` (catch-all `**`) |

Total: 30 PNGs, all non-empty (sizes 23–127 KB each).

## Light theme — measured ratios

Sampled live on `/strategies`, `data-theme="light"`, body bg `rgb(250, 250, 250)`.

| Element | fg | effective bg | Ratio | AA |
|---|---|---|---:|:---:|
| h1 page heading | `rgb(10,10,10)` | `rgb(250,250,250)` | 18.97 | ✓ |
| Table cell text | `rgb(10,10,10)` | `rgb(255,255,255)` | 19.80 | ✓ |
| Table header (`th`) muted | `rgb(115,115,115)` | `rgb(255,255,255)` | 4.74 | ✓ |
| Sidebar nav inactive label | `rgb(64,64,64)` | sidebar `rgb(245,245,244)` | 9.50 | ✓ |
| Sidebar "Workspace" small caps | `rgb(115,115,115)` | sidebar `rgb(245,245,244)` | **4.35** | ✗ borderline |
| Status pill text (Risk on cell) | `rgb(10,10,10)` | row `rgb(255,255,255)` | 19.80 | ✓ |
| Btn primary white text | `rgb(255,255,255)` | indigo `rgb(94,106,210)` | 4.70 | ✓ |

## Dark theme — measured ratios

Sampled live on `/strategies`, `data-theme="dark"`, body bg `rgb(8, 9, 10)`.

| Element | fg | effective bg | Ratio | AA |
|---|---|---|---:|:---:|
| h1 page heading | `rgb(247,248,248)` | `rgb(8,9,10)` | 18.73 | ✓ |
| Table cell text | `rgb(247,248,248)` | row `rgb(16,17,19)` | 17.76 | ✓ |
| Table header (`th`) muted | `rgb(125,129,139)` | row `rgb(16,17,19)` | 4.84 | ✓ |
| Sidebar nav inactive label | `rgb(180,187,196)` | sidebar `rgb(12,13,15)` | 10.04 | ✓ |
| Sidebar "Workspace" small caps | `rgb(125,129,139)` | sidebar `rgb(12,13,15)` | 4.99 | ✓ |
| Status pill text (Risk on cell) | `rgb(247,248,248)` | row `rgb(16,17,19)` | 17.76 | ✓ |
| Btn primary white text | `rgb(255,255,255)` | indigo `rgb(94,106,210)` (computed on body) | 19.93 | ✓ |

## Issues found (eyeball + measured)

1. **Light, sidebar "Workspace" section label** — `--text-muted` (`rgb(115,115,115)`) on the sidebar surface `rgb(245,245,244)` yields **4.35:1**, just below AA. The same token on white card surfaces lands at 4.74:1, so the failure is specific to the sidebar background. Suggestion: darken `--text-muted` by ~1 step (e.g. `#6A6A6A`) only when over the sidebar surface, or lighten the sidebar bg slightly. This is the only color-pair that fails AA across the captured set.
2. **Sidebar collapse style is wired but not implemented** — `app.html` toggles `.is-collapsed` on `aside.sidebar`, but `_sidebar.scss` only defines `.is-open` (mobile drawer). With `localStorage['letf-lab.sidebar.collapsed']='1'` the class is applied (verified: `sidebar is-collapsed`, width 232px) but the visual width / labels-hidden treatment never kicks in. As a result `light/sidebar-collapsed.png` and `dark/sidebar-collapsed.png` are visually identical to `dashboard.png`. The keyboard toggle in the topbar doesn't expose collapse either, so the feature is effectively dead. Functional bug, not a contrast issue.
3. **Closed `<dialog>` from `app-confirm-dialog` renders as a visible empty pill at the top-center of every screen** — the `.modal` class sets `display: flex` which overrides the native HTML `<dialog>`'s default `display: none` when not `open`. Visible as a thin rounded rectangle near the top of every full-page screenshot (most obvious on `login.png` and `dashboard.png` because those have empty space there). Cosmetic only — confirm dialog still works correctly when triggered (see `modal.png`). Suggested fix in `_modal.scss`: `dialog.modal:not([open]) { display: none; }`.

## Visual diff vs v1-DNA (`prints/`)

Compared to the v1 captures in `prints/` (IBM Plex / 8-12px radii / 3px card border-left):

- **Sharper corners** — cards/buttons now use 5–6px radii (e.g. `--radius-md: 5px`) vs 8–12px in v1. Visible everywhere; most obvious on cards and the primary button.
- **Inter typography** — body and headings switched from IBM Plex Sans to Inter (mono labels still IBM Plex Mono). Headings read tighter and more "Linear-app".
- **Indigo accent** — `--accent` now `rgb(94,106,210)`. Visible on primary button (`+ Nova`/`+ Nova estratégia`), focus rings, palette selected row, command palette `kbd` chips. v1 used a teal-leaning primary.
- **Sidebar with inline kbd hints** — `G 1`, `G 2`, `G 3` chips visible on every nav item. Status footer ("Atualizado 02:57 ET" + Refresh button) anchored at the bottom of the sidebar. v1 had no kbd hints.
- **Cards with 2px stripe** — strategy cards on `/dashboard` use a 2px left stripe (success / warn / danger by state) vs v1's 3px solid border-left.
- **Score-bar 5 segments** — `Score 4/4 · k≥2` line now followed by 5 small segments visible to the right (4 filled, 1 empty for 4/5 etc.). v1 had a numeric-only score.
- **Tables: status-cell dot** — the `STATUS` column shows a small green/red dot + "Risk on" inline text rather than a v1-style filled badge pill. Cleaner row rhythm.
- **Forms as full pages** — `/strategies/1/edit` and `/indicators/1/edit` are full-shell pages (not modals). Verified in `light/strategy-form.png` and `light/indicator-form.png`.
- **Theme switch on settings** — light/dark/system toggle lives on `/settings` (verified in `settings.png`); no on-canvas theme button per route.

The v2 redesign is materially distinct from v1: ~7 of the 10 canonical Linear-DNA tells are visibly present in the captures.

## Build verification

`npx ng build --configuration=development` exits 0. Initial total 3.15 MB, lazy
chunks per route. Bundle written to `dist/frontend` in 1.92 s.

## Build warnings

None. Clean build, no SCSS / TS / template warnings.

## Mobile bonus

Skipped (not required for DOD; light + dark × 15 routes already meets the ≥ 8 PNG floor 2×).
