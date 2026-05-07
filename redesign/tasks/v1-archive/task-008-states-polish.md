# Task 008 — States + polish (skeleton, empty, error, tooltip, sidebar mobile drawer)

**Goal:** Fill in the remaining UX states: skeletons during loading, empty states with CTAs, error states, lightweight tooltips for icon buttons, and the sidebar mobile drawer behavior. After this task the app is feature-complete for the redesign.

## Pre-conditions

- Tasks 001-007 done.
- `.skeleton`, `.empty`, `.error-state`, `.callout` classes exist.
- `[data-tooltip]` styling from `design-export/layouts/15-modals-states.md` exists in `_components.scss` (or add now).

## Sources

1. `design-export/layouts/15-modals-states.md` — empty, skeleton, error, tooltip, confirm-on-leave
2. `design-export/04-components.md` — skeleton variants, empty
3. `design-export/layouts/10-shell-sidebar.md` — mobile drawer rules

## Scope

This task is a sweep across the existing pages to plug skeleton + empty + error states everywhere users can hit a non-happy path. Add tooltips to icon-only buttons (sidebar collapsed, table actions). Wire the mobile drawer.

## Subtask 8a — Tooltip primitive

Add to `frontend/src/styles/components/_tooltip.scss` (or extend existing if present):

```scss
[data-tooltip] {
  position: relative;
  &::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--text-primary);
    color: var(--bg);
    font: var(--text-xs);
    font-weight: 500;
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--transition-fast);
    z-index: 30;
  }
  &:hover::after, &:focus-visible::after { opacity: 1; }
}

[data-tooltip-side="right"]::after {
  bottom: auto;
  top: 50%;
  left: calc(100% + 6px);
  transform: translateY(-50%);
}
```

Register in `components.scss`: `@use 'components/tooltip';`.

Apply to:
- Sidebar items when collapsed (`.sidebar.is-collapsed .sidebar__item[data-tooltip]`) — add `[attr.data-tooltip]="item.label"` and `data-tooltip-side="right"` in `app.html`.
- Table action buttons (Editar, Remover) — add `[attr.data-tooltip]="'Editar'"` etc.
- Theme switch buttons in `theme-switch.ts` (when collapsed, hide labels and rely on tooltips).

## Subtask 8b — Skeleton sweeps

For each page, add a loading-state skeleton that matches the final shape:

### Dashboard (already partially in task 004)
6–8 strategy-card skeletons with title, subtitle, metrics block, sparkline area.

### Strategies/Indicators list (already partially in task 006)
5 table rows of `<tr><td colspan="X"><div class="skeleton skeleton--block" style="height:36px"></div></td></tr>` — or simpler: a single `.skeleton skeleton--block` height 240 inside `.table-wrap`.

### Strategy detail
Hero skeleton (title 240×24, badge 80×26, subtitle 60% width × 14, indicators row with 3 chip-shaped skeletons), KPI grid with 4 skeleton tiles (180×72), 2 chart-card skeletons (full height), history table skeleton.

Update the existing `loading()` branches in each component to use these patterns. Keep the existing layout shell visible during loading.

## Subtask 8c — Empty states with CTAs

Verify every list/page has an explicit empty state:

| Page | Empty case | Headline | CTA |
|---|---|---|---|
| Dashboard | 0 strategies | "Nenhuma estratégia ainda" | "Nova estratégia" → `/strategies?new=true` |
| Strategies list | 0 strategies (server) | Same as Dashboard | Same |
| Strategies list | 0 results (filtered) | "Nenhuma estratégia bate com os filtros" | "Limpar filtros" (clears search) |
| Indicators list | 0 indicators | "Sem indicadores ainda" | "Novo indicador" → opens modal |
| Indicators list | 0 results (filtered) | Same | Same as filtered above |
| Strategy detail | strategy not found (404) | "Estratégia não encontrada" | "Voltar ao Dashboard" |
| Strategy detail | backtest insufficient data | use `.callout--warn` inline (already in task 005) | n/a |
| Signal history | 0 transitions | "Sem histórico ainda" | none (passive) |

Adjust each component's template to add these branches if missing.

## Subtask 8d — Error states

For top-level fetch failures (strategies list 500, indicator list 500, etc.), render the `.error-state` block:

```html
@else if (error()) {
  <div class="error-state">
    <svg class="error-state__ico" width="48" height="48"><use href="#alert-circle"/></svg>
    <h3 class="error-state__title">{{ errorTitle() }}</h3>
    <p class="error-state__msg">{{ error() }}</p>
    <button class="btn btn--primary btn--md" (click)="load()">
      <svg class="ico" width="16" height="16"><use href="#refresh"/></svg>
      Tentar novamente
    </button>
  </div>
}
```

Backend may already return `error` signals where applicable; otherwise add a simple try/catch in the load method.

## Subtask 8e — Sidebar mobile drawer

Add to `app.ts`:

```ts
isMobileOpen = signal(false);
toggleMobileSidebar() { this.isMobileOpen.set(!this.isMobileOpen()); }
```

Add to `app.html` — at the top of `.app-shell__main`, render a hamburger button that's only visible at mobile breakpoint:

```html
<button class="topbar__hamburger" (click)="toggleMobileSidebar()" aria-label="Open menu">
  <svg class="ico" width="20" height="20"><use href="#dashboard"/></svg>
</button>
```

(use a proper hamburger icon — add a `menu` symbol to the sprite if missing: `<symbol id="menu"><path d="M3 6h18M3 12h18M3 18h18"/></symbol>`).

Toggle classes:
- `<aside class="sidebar" [class.is-open]="isMobileOpen()" [class.is-collapsed]="collapsed()">`
- `<div class="scrim" [class.is-open]="isMobileOpen()" (click)="toggleMobileSidebar()"></div>`

Mobile CSS comes from `10-shell-sidebar.md` "Mobile (≤ 768px)" — verify it's already in `_app-shell.scss` / `_sidebar.scss`. If missing, add now.

The hamburger is hidden on desktop:
```scss
.topbar__hamburger {
  display: none;
  background: transparent; border: 0; padding: 6px;
  color: var(--text-secondary); cursor: pointer; border-radius: var(--radius-sm);
  &:hover { background: var(--surface-muted); }
}
@media (max-width: 768px) {
  .topbar__hamburger { display: inline-flex; align-items: center; }
}
```

## What NOT to change

- API contracts.
- Routes.
- Form behavior.

## Verification

```bash
cd /var/www/pessoal/ai-swing/frontend
npx ng build --configuration=development
```

Manual:
- Trigger empty states (e.g., delete all strategies, then visit Dashboard).
- Trigger error state (e.g., stop backend, reload list).
- Resize viewport to <768px → hamburger shows, sidebar hides, drawer opens with scrim.
- Hover icon buttons → tooltip appears.

## Definition of done

1. Tooltip primitive added and applied to icon buttons.
2. Skeleton placeholders consistent across pages.
3. Every empty state has a sensible CTA.
4. Top-level errors render `.error-state` with retry.
5. Mobile drawer functional.
6. Build passes.
7. Print `TASK DONE: task-008-states-polish.md` at end.
