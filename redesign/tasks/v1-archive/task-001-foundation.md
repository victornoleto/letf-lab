# Task 001 — Foundation: tokens, fonts, icons, base components SCSS

**Goal:** Establish the design system primitives that every subsequent task consumes. After this task, Angular components still render with the OLD layout but the new tokens/fonts/icons exist and the base SCSS classes (`.btn`, `.card`, `.badge`, `.input`, `.field`, `.check`, `.toggle`, `.table`, `.chip`, `.skeleton`, `.empty`, `.callout`, `.kpi-tile`) are loaded globally.

This task does NOT touch any `*.ts` component yet. It is pure CSS/asset setup.

## Pre-conditions

- The repo at `/var/www/pessoal/ai-swing` is in its current state.
- The `design-export/` directory exists at the project root.

## Sources (read these first)

1. `design-export/00-OVERVIEW.md` — design intent
2. `design-export/01-tokens.scss` — copy this entire file
3. `design-export/02-typography.md` — fonts, `<link>` snippet, scale rules
4. `design-export/03-icons/README.md` — sprite contents, sizes, conventions
5. `design-export/04-components.md` — every base component CSS

## Files to create

| File | Purpose |
|---|---|
| `frontend/src/styles/tokens.scss` | Drop-in copy of `design-export/01-tokens.scss` |
| `frontend/src/styles/components.scss` | Aggregator that `@use`s every per-component partial below |
| `frontend/src/styles/components/_button.scss` | `.btn` + variants from `04-components.md` |
| `frontend/src/styles/components/_card.scss` | `.card` + accent variants |
| `frontend/src/styles/components/_badge.scss` | `.badge` + `.chip` |
| `frontend/src/styles/components/_field.scss` | `.field`, `.input`, `.select`, `textarea`, `.check`, `.toggle` |
| `frontend/src/styles/components/_table.scss` | `.table-wrap`, `.table`, `.t-head`, `.t-body`, `.t-actions`, `.cell-stack`, `.t-link`, `.t-muted` |
| `frontend/src/styles/components/_modal.scss` | `.modal` + `.modal--wide` |
| `frontend/src/styles/components/_toast.scss` | `.toast-stack`, `.toast`, variants |
| `frontend/src/styles/components/_tabs.scss` | `.tabs`, `.tabs__tab` |
| `frontend/src/styles/components/_empty.scss` | `.empty`, `.error-state` |
| `frontend/src/styles/components/_skeleton.scss` | `.skeleton` + shimmer keyframes |
| `frontend/src/styles/components/_callout.scss` | `.callout` (variants info/danger/warn/success) |
| `frontend/src/styles/components/_kpi.scss` | `.kpi-grid`, `.kpi-tile`, `.metric` |
| `frontend/src/styles/components/_eyebrow.scss` | `.eyebrow` utility |
| `frontend/src/styles/components/_breadcrumb.scss` | `.breadcrumb` |
| `frontend/src/styles/components/_filter-bar.scss` | `.filter-bar` (segmented control of buttons) |
| `frontend/src/styles/components/_search-input.scss` | `.search-input` (icon-prefix wrapper around `.input--inline`) |
| `frontend/src/styles/components/_banner.scss` | `.banner`, `.banner--info/success/danger` |
| `frontend/src/styles/components/_sidebar.scss` | `.sidebar`, `.sidebar__brand`, `.sidebar__nav`, `.sidebar__item`, `.sidebar__foot`, `.sidebar__collapse` |
| `frontend/src/styles/components/_topbar.scss` | `.topbar`, `.topbar__search`, `.topbar__kbd`, `.topbar__actions` (used by shell in task 003) |
| `frontend/src/styles/components/_app-shell.scss` | `.app-shell`, `.app-shell__main`, `.app-shell__content`, mobile drawer rules |
| `frontend/src/styles/components/_chart-card.scss` | `.chart-card`, `.chart-card__head/title/sub/legend/chart`, `.legend-item`, `.legend-dot` |
| `frontend/src/styles/components/_strategy-card.scss` | `.strategy-card`, `.strategy-card__head/title/tickers/metrics/chart/foot/open` |
| `frontend/src/styles/components/_indicator-picker.scss` | `.indicator-picker`, `.indicator-picker__item/body/name/type/desc` |
| `frontend/src/styles/components/_form-grid.scss` | `.form-grid`, `.form-grid__row` (`--2`, `--3`, `--split`), `.field--inline`, `.input--inline` |
| `frontend/src/styles/components/_pagination.scss` | `.table-wrap__foot`, `.pagination` |
| `frontend/src/assets/icons/sprite.svg` | All `<symbol>`s from `design-export/03-icons/README.md` (every snippet under "SVGs prontos") wrapped in `<svg xmlns="http://www.w3.org/2000/svg" style="display:none"><defs>…</defs></svg>` |

## Files to modify

### `frontend/src/index.html`

1. Add Google Fonts `<link>`s before `</head>` exactly as listed in `design-export/02-typography.md` (preconnect + IBM Plex Sans + IBM Plex Mono).
2. Inject the FOUC-prevention script in `<head>` (use the exact snippet from `design-export/06-theme-toggle.md` under "FOUC prevention").
3. After `<body>` opens (or before `<app-root>`), include the icon sprite by inlining its content OR linking it via `<svg><use href="/assets/icons/sprite.svg#..."></use></svg>` references later — choose inlining the sprite directly into `index.html` for simplicity (paste the entire `sprite.svg` content here), so `<use href="#plus">` works without resolving the file.

### `frontend/src/styles.scss`

Replace the entire content with:

```scss
@use 'styles/tokens';
@use 'styles/components';

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

a { color: inherit; }
button { font-family: inherit; }
table { border-collapse: collapse; width: 100%; }

::selection { background: var(--primary-soft); color: var(--text-primary); }
```

`frontend/src/styles/components.scss` should aggregate every partial:

```scss
@use 'components/eyebrow';
@use 'components/button';
@use 'components/card';
@use 'components/badge';
@use 'components/field';
@use 'components/form-grid';
@use 'components/table';
@use 'components/pagination';
@use 'components/modal';
@use 'components/toast';
@use 'components/tabs';
@use 'components/empty';
@use 'components/skeleton';
@use 'components/callout';
@use 'components/kpi';
@use 'components/breadcrumb';
@use 'components/filter-bar';
@use 'components/search-input';
@use 'components/banner';
@use 'components/sidebar';
@use 'components/topbar';
@use 'components/app-shell';
@use 'components/chart-card';
@use 'components/strategy-card';
@use 'components/indicator-picker';
```

## Step-by-step

1. **Read** every source listed above. Note that `04-components.md` is the canonical place for each `.btn`, `.card`, etc. — copy the SCSS verbatim into the right partial. Do not reinvent.
2. **Copy** `design-export/01-tokens.scss` → `frontend/src/styles/tokens.scss` (verbatim, no edits — this includes the `@media (prefers-color-scheme: dark)` block and the base reset hooks at the bottom; you can keep both or move the reset hooks to `styles.scss` if cleaner — your call, but don't lose them).
3. **Build** `sprite.svg` by concatenating every `<symbol id="...">…</symbol>` from `design-export/03-icons/README.md` and wrapping in:
   ```html
   <svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">
     <defs>
       <!-- all symbols here -->
     </defs>
   </svg>
   ```
   Then either: (a) save as `frontend/src/assets/icons/sprite.svg` AND inline the same content into `index.html` body, or (b) just inline into `index.html` (skip the file). Inlining is simpler and avoids HTTP round-trip; do (b). Add a comment in index.html `<!-- icon sprite — referenced via <use href="#name"> -->` above the inlined block.
4. **Write** each `_*.scss` partial. Source = `04-components.md`. Keep CSS exactly as written there. Notable exceptions:
   - `_app-shell.scss` and `_topbar.scss`: source = `design-export/layouts/10-shell-sidebar.md`.
   - `_strategy-card.scss`: source = `design-export/layouts/11-dashboard.md` (`.strategy-card`, `.metric`, `.filter-bar`, `.search-input`).
   - `_chart-card.scss`, `_breadcrumb.scss`: source = `design-export/layouts/12-strategy-detail.md`.
   - `_indicator-picker.scss`, `_form-grid.scss`: source = `design-export/layouts/14-forms.md`.
   - `_callout.scss`, `_skeleton.scss` shimmer keyframes: source = `04-components.md` and `design-export/layouts/15-modals-states.md`.
5. **Add** `.ico--spin` keyframes (from `design-export/03-icons/README.md` last block) into `_button.scss` or its own `_icon.scss`. Choose `_icon.scss` (rule `.ico` baseline alignment + `.ico--spin` keyframe). Add `@use 'components/icon';` to `components.scss`.
6. **Update** `frontend/src/index.html` — add fonts `<link>`, FOUC script, inlined sprite. Do NOT remove `<app-root>` or anything Angular needs.
7. **Update** `frontend/src/styles.scss` to the version above.

## Verification

```bash
cd /var/www/pessoal/ai-swing/frontend
npx ng build --configuration=development
```

The build MUST succeed with zero errors. CSS warnings about unused selectors are fine (components don't use them yet).

Optional sanity check:
```bash
# Confirm tokens file exists and has both themes
grep -E '^\[data-theme="dark"\]' /var/www/pessoal/ai-swing/frontend/src/styles/tokens.scss

# Confirm sprite has all symbols mentioned in icons README
for sym in dashboard strategies indicators history holdings settings plus pencil trash chevron-right chevron-down chevron-up arrow-up-right arrow-down-right search filter bell x check alert-circle info-circle circle-check loader sun moon monitor refresh download external-link play pause; do
  grep -q "id=\"$sym\"" /var/www/pessoal/ai-swing/frontend/src/index.html || echo "MISSING: $sym"
done
```
The MISSING list should be empty.

## Definition of done

1. Every file listed in "Files to create" exists with the correct content.
2. `index.html` has fonts, FOUC script, and full icon sprite inlined.
3. `styles.scss` `@use`s tokens + components.
4. `npx ng build --configuration=development` succeeds.
5. No `*.component.ts` / `*.html` was modified — only assets/styles.
6. Print `TASK DONE: task-001-foundation.md` as the final line.
