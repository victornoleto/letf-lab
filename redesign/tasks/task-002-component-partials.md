# Task 002 (v2) — Rewrite all component SCSS partials (Linear DNA)

**Goal:** Rewrite every `frontend/src/styles/components/_*.scss` partial so that classes (`.btn`, `.card`, `.badge`, `.input`, `.table`, etc.) consume the new Linear-DNA tokens (`--accent`, `--fs-base`, `--h-btn`, etc.) and follow the new visual rules (denser, hairline borders, indigo accent, mono everywhere there's a number).

This task is the largest of the redesign — but it's contained: only SCSS, no Angular code changes. After it, the visual primitives match Linear; component templates still reference the same class names so they keep working.

## Pre-conditions

- Task 001 done. New tokens.scss in place.
- The aggregator `frontend/src/styles/components.scss` already `@use`s a list of partials. Most of those partials currently exist but with old (Stripe-DNA) rules.

## Sources (canonical for every partial)

1. `design-export/04-components.md` — every base component (Button, Card, Badge, Input, Field, Chip, Pill group, Tabs, Table, Sidebar, Banner, Modal, Toast, Empty, Skeleton, Kbd)
2. `design-export/02-typography.md` — `.kbd`, `.hint`, `.label`, `.ticker`, `.label-up`
3. `design-export/layouts/11-dashboard.md` — `.score-bar`, `.score-bar__seg`, `.ind-row`, `.metric` (page-head)
4. `design-export/layouts/12-strategy-detail.md` — `.meta-bar`, `.section`, `.metric-card`, `.metric-row`, `.charts-grid`, `.chart-cell`, `.breadcrumb`
5. `design-export/layouts/13-list-pages.md` — `.list-head`, `.search`, `.status-cell`, `.pagination`
6. `design-export/layouts/14-forms.md` — `.form`, `.row-2`, `.chips-field`, `.kmin`, `.form-footer`
7. `design-export/layouts/10-shell-sidebar.md` — `.shell`, `.main`, `.transitions`, `.transition__tickers`, mobile drawer (`.topbar-mobile`)
8. `design-export/layouts/15-modals-states.md` — `.loading-bar`, `.error-state`, `.spin`

## Files to rewrite

For every partial below, **delete the current contents** and replace with the snippets from the source(s) listed. **Do not** keep stale rules from the old design — that creates conflicts.

| Partial | Sources | Notes |
|---|---|---|
| `_button.scss` | 04-components.md §1 | New: 30px height, 12.5px font, 6px radius, primary uses `--accent`, ghost variant, sm modifier 24px |
| `_card.scss` | 04-components.md §2 | New: 6px radius, 2px vertical accent stripe (`__accent`, `--on/--off/--borderline`), `__head/__meta/__spark/__rows` regions, `--accent-fg` removed |
| `_badge.scss` | 04-components.md §3 | New: mono uppercase 10.5px, soft bg + fg-text colors, NO ponto colorido (status-cell em tabelas tem dot, badge não) |
| `_field.scss` | 04-components.md §4 | New: `.field`/`.label`/`.input`/`.hint`/`.error`. Input 32px, 5px radius, focus = 2px ring `--focus-ring`, `.input--mono` for tickers, `.input--error`. **Drop** `.toggle`, `.check` from old version — Linear forms don't use them; replace with native `<input type="checkbox">` or simple chip pattern |
| `_chip.scss` | 04-components.md §5 | New: 4px radius, `&--selected` invert (preto sólido), no accent indigo here |
| `_pill.scss` (NEW) | 04-components.md §6 | `.pills` segmented control: 5px radius, padded 2px, child `.pill` 11.5px mono. Used by dashboard filters and detail timeframe |
| `_tabs.scss` | 04-components.md §7 | New: bottom border, 2px ink underline on active (NOT accent), 12.5px font |
| `_table.scss` | 04-components.md §8 | New: 12px font, 9px row padding, hairline `--border-subtle` between rows, hover row bg = `--bg`, hover-reveal `.table__actions`, NO zebra. Helper `.icon-btn` 24×24 ghost square |
| `_sidebar.scss` | 04-components.md §9 + 10-shell-sidebar.md | New: 232px width, sticky, `--sidebar-bg`, `.brand`, `.brand__mark`, `.brand__name`, `.nav-section`, `.nav-item`, `.nav-item__kbd`, `.status-bar`, `.status-bar__row/__dot`. Mobile drawer rules included |
| `_banner.scss` | 04-components.md §10 | Keep — but verify uses `--info-soft` etc. with `color-mix` for borders, not new explicit `*-border` tokens |
| `_modal.scss` | 04-components.md §11 | New: `.modal-backdrop` (centered, 32px padding, fadeIn animation), `.modal` (560px max, 8px radius `--radius-xl`, slideUp animation), `__header/__title/__body/__footer`. **Drop** the old `.modal__head`, `.modal--wide` markup-coupling — Linear modal is a single shape |
| `_toast.scss` | 04-components.md §12 | New: `.toast-stack` fixed bottom-right, `.toast` 6px radius, `__icon/__close`, `slideInR` animation |
| `_empty.scss` | 04-components.md §13 | New: 24px icon, 13.5px title, 12.5px copy, max-width 320px |
| `_skeleton.scss` | 04-components.md §14 | New: shimmer animation 1.4s linear, `--text/--title/--card` modifiers |
| `_kbd.scss` (NEW) | 04-components.md §15 | `.kbd` 10px mono, 3px radius |
| `_app-shell.scss` | 10-shell-sidebar.md | New: `.shell` flex, `.main` flex:1 min-width:0 padding 24/32/64 max-width 1280, `.transitions` list inside sidebar, mobile media query for drawer |
| `_breadcrumb.scss` | 12-strategy-detail.md | `.breadcrumb`, `.breadcrumb__back` — 12px muted with chevrons |
| `_meta-bar.scss` (NEW) | 12-strategy-detail.md | `.meta-bar`, `.label`, `.val` (mono 18px medium), `.val--success/--danger/--warn` |
| `_section.scss` (NEW) | 12-strategy-detail.md | `.section`, `.section__head/__title/__sub`. Used as panel container in detail page |
| `_metric-card.scss` (NEW) | 12-strategy-detail.md | `.metrics-grid` (3 cols, vertical dividers), `.metric-card`, `.metric-card__title/__rows`, `.metric-row` with `__k/__v/__diff/--pos/--neg` |
| `_charts-grid.scss` (NEW) | 12-strategy-detail.md | `.charts-grid` (2 cols, divider), `.chart-cell`, `.chart-cap` |
| `_score-bar.scss` (NEW) | 04-components.md §2 | `.score-bar`, `.score-bar__seg`, `&--filled-on/--filled-borderline/--filled-off`. 14×4px segs |
| `_ind-row.scss` (NEW) | 04-components.md §2 | `.ind-row` 3-col grid (icon/name/detail), `__icon-pass/__icon-fail/__name/__detail` |
| `_status-cell.scss` (NEW) | 13-list-pages.md | `.status-cell::before { width:6px; height:6px; circle }`, `--on/--off/--borderline` color the dot |
| `_search.scss` | 13-list-pages.md | `.search` (replaces old `.search-input` styling) |
| `_pagination.scss` | 13-list-pages.md | `.pagination` footer flex |
| `_form.scss` (NEW) | 14-forms.md | `.form` (max-width 560px), `.row-2`, `.chips-field`, `.kmin`, `.form-footer` (sticky bottom with gradient) |
| `_loading-bar.scss` (NEW) | 15-modals-states.md | `.loading-bar` 2px indigo, `loading-bar` keyframes |
| `_error-state.scss` (NEW) | 15-modals-states.md | `.error-state`, `__icon/__title/__copy` |
| `_brand.scss` (NEW) | `capture-shell.jsx` Logo/LogoMark | `.brand`, `.brand__mark` (rounded square dark bg with logo SVG inside), `.brand__name` (wordmark "AI · Swing" with mid-dot in muted color, font-weight 600, letter-spacing -0.015em). Used in sidebar (small) and login (larger). |
| `_settings.scss` (NEW) | `linear-extras.jsx` SettingsScreen + 06-theme-toggle.md | `.settings-grid` 2-col 200px / 1fr, `.settings-nav` vertical list with `.item.active` state, `.settings-section` border-bottom-separated blocks, `.settings-row` 1fr / 280px grid with `.lbl` semibold + `.desc` muted on the left, control on the right. The Aparência section uses `.pill-group` with theme icons. |
| `_palette.scss` (NEW) | `linear-extras.jsx` CommandPaletteOverlay | `.palette-overlay` (fixed full screen scrim, top-aligned with 120px top padding), `.palette` (560px, 8px radius, shadow-lg), `.palette__input` (search field bar with icon + input + esc kbd), `.palette__list`, `.palette__section` (uppercase muted eyebrow), `.palette__item` (8/16 padding, hover bg muted, with optional `.is-active`), `.palette__foot` (kbd hints + count, footer on `--bg`). |
| `_login.scss` (NEW) | `linear-extras.jsx` LoginScreen | `.login-shell` (full-viewport grid place-items center on `--bg`), `.login-card` (380px wide, 32px padding, surface, 8px radius, hairline border), `.login-brand` (centered logo block with margin-bottom 24px), `.login-title` (18px semibold), `.login-sub` (12.5px muted), `.login-divider` ("OU" with hairlines on each side, uppercase letterspaced), `.login-foot` (mono small version+sync info). |
| `_notfound.scss` (NEW) | `linear-extras.jsx` NotFoundScreen | `.notfound-shell` (full-viewport grid place-items center on `--bg`), `.notfound-inner` (max-width 420 centered text), `.notfound-code` (mono 64px font-weight 500 letter-spacing -0.04em), `.notfound-title` (18px semibold), `.notfound-sub` (13px muted), `.notfound-actions` flex gap 8 centered. |
| `_filter-bar.scss` | (REMOVE — superseded by `_pill.scss`) | Delete partial; remove `@use` from components.scss |
| `_strategy-card.scss` | (REMOVE — class moved into `_card.scss`) | Delete partial; the card variants now live in `_card.scss` |
| `_chart-card.scss` | (REMOVE — superseded by `_section.scss` + `_charts-grid.scss`) | Delete |
| `_indicator-picker.scss` | (REMOVE — Linear forms use `.chips-field` with `.chip`s) | Delete |
| `_form-grid.scss` | (REMOVE — replaced by `.form/.row-2`) | Delete |
| `_topbar.scss` | (KEEP minimal — only `.topbar-mobile`) | Most rules go away; only the mobile-only sticky topbar remains. See 10-shell-sidebar.md |
| `_kpi.scss` | (REMOVE — Linear uses meta-bar + metric-card instead) | Delete |
| `_callout.scss` | (REMOVE — Linear uses `.banner` for soft alerts and `.error-state` for hard ones) | Delete |
| `_eyebrow.scss` | (REMOVE — collapse `.eyebrow` rule into `_kbd.scss` or inline) | Delete |
| `_theme-switch.scss` | (KEEP but rewrite) | New rules from `06-theme-toggle.md` §4 — `.theme-row` flex with 3 child `.theme-btn`s, sm icon-only buttons. Drops the labeled segmented control variant |

### Update aggregator `components.scss`

Edit `frontend/src/styles/components.scss` so it `@use`s the **new full list** and removes the deleted partials. Final file looks roughly:

```scss
@use 'components/button';
@use 'components/card';
@use 'components/badge';
@use 'components/field';
@use 'components/chip';
@use 'components/pill';
@use 'components/tabs';
@use 'components/table';
@use 'components/sidebar';
@use 'components/banner';
@use 'components/modal';
@use 'components/toast';
@use 'components/empty';
@use 'components/skeleton';
@use 'components/kbd';
@use 'components/app-shell';
@use 'components/breadcrumb';
@use 'components/meta-bar';
@use 'components/section';
@use 'components/metric-card';
@use 'components/charts-grid';
@use 'components/score-bar';
@use 'components/ind-row';
@use 'components/status-cell';
@use 'components/search';
@use 'components/pagination';
@use 'components/form';
@use 'components/loading-bar';
@use 'components/error-state';
@use 'components/topbar';
@use 'components/theme-switch';
@use 'components/brand';
@use 'components/settings';
@use 'components/palette';
@use 'components/login';
@use 'components/notfound';
```

(Adjust as needed if a partial is missing from this list — it's the *intent* matrix; the file should match exactly the partials present on disk.)

## What NOT to do in this task

- **No** Angular template/TS edits. Class names are stable; templates may reference classes whose styling changed but that's fine — visual change is the goal.
- **No** new SCSS variables in component partials. Always reference tokens from `tokens.scss` via `var(--*)`.
- **No** `@import` — use `@use` only (already used by the aggregator).

## Verification

```bash
cd /var/www/pessoal/ai-swing/frontend
npx ng build --configuration=development
```

Build must succeed. The browser, if you boot the app, will show the visual transition starting (typography is Inter, surface is white-ish in light mode, indigo focus rings) — but the layouts are still wrong (sidebar, dashboard, detail still have v1 markup). That's expected.

Optional checks:
```bash
ls /var/www/pessoal/ai-swing/frontend/src/styles/components/_score-bar.scss
ls /var/www/pessoal/ai-swing/frontend/src/styles/components/_ind-row.scss
ls /var/www/pessoal/ai-swing/frontend/src/styles/components/_meta-bar.scss
ls /var/www/pessoal/ai-swing/frontend/src/styles/components/_section.scss
ls /var/www/pessoal/ai-swing/frontend/src/styles/components/_metric-card.scss

# Files that should NOT exist:
! ls /var/www/pessoal/ai-swing/frontend/src/styles/components/_kpi.scss 2>/dev/null
! ls /var/www/pessoal/ai-swing/frontend/src/styles/components/_indicator-picker.scss 2>/dev/null
! ls /var/www/pessoal/ai-swing/frontend/src/styles/components/_form-grid.scss 2>/dev/null
```

## Definition of done

1. Every partial listed under "Files to rewrite" has been rewritten or deleted as specified.
2. `components.scss` aggregator is in sync (no dangling `@use` for deleted partials, no missing `@use` for new ones).
3. Build passes.
4. Print `TASK DONE: task-002-component-partials.md` at end.
