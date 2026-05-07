# Task 003 — Shell + sidebar (replaces topbar)

**Goal:** Refactor the app shell from "topbar across the top" to "sidebar on the left + main content area". Wire the `ThemeSwitchComponent` in the sidebar footer. The transitions banner moves to the top of the content area (above page title), styled as `.banner`. Refresh button moves into the topbar inside the main area (small secondary button) and keeps its existing logic.

After this task, every existing page (dashboard, lists, detail) renders inside the new shell without losing functionality. Their internals are not yet redesigned — that comes in tasks 004+.

## Pre-conditions

- Tasks 001 and 002 done.
- `.sidebar`, `.app-shell`, `.topbar`, `.banner` SCSS classes exist (created in task 001).

## Sources

1. `design-export/layouts/10-shell-sidebar.md` — full HTML + SCSS for shell, sidebar, topbar, banner
2. `design-export/04-components.md` (`Sidebar` section) — class structure
3. `design-export/00-OVERVIEW.md` — "Theme toggle vai pro rodapé da sidebar..."

## Files to modify

| File | What changes |
|---|---|
| `frontend/src/app/app.ts` | Add sidebar state (collapsed, persisted in `localStorage` as `aiswing.sidebar.collapsed`). Keep refresh logic. Inject ThemeService just to make sure it constructs early. |
| `frontend/src/app/app.html` | Replace topbar shell with `.app-shell` + `<aside class="sidebar">` + `<div class="app-shell__main">` containing `.topbar` + `.banner` (existing transitions data) + `<main class="app-shell__content">` with `<router-outlet/>` |
| `frontend/src/app/app.scss` | Strip the old topbar styles. Most styling now comes from `.app-shell`, `.sidebar`, `.topbar` in components.scss. Keep only host-level rules and any layout glue not covered by the partials. |

## Detailed app.ts changes

The component already has:
- `recentTransitions = signal<SignalTransition[]>([])`
- `refreshing = signal(false)`
- `refreshError = signal<string | null>(null)`
- `triggerRefresh()`
- `loadTransitions()`

Add:
- `import { ThemeSwitchComponent } from './shared/theme/theme-switch';`
- `import { ThemeService } from './shared/theme/theme.service';` (just to ensure DI/early instantiation; call `inject(ThemeService)` even if unused — keeps the FOUC consistent)
- `collapsed = signal<boolean>(this.readCollapsed())` with `readCollapsed()` reading `localStorage.getItem('aiswing.sidebar.collapsed') === '1'`
- `toggleCollapsed()` that flips and writes back
- `dismissBanner()` that clears `recentTransitions()` (or sets a `dismissed` signal — choose dismissed signal so reload still shows them, dismissal is per-session)
- `dismissed = signal(false)` — banner shows when `recentTransitions().length > 0 && !dismissed()`

Imports list update:
```ts
imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, ThemeSwitchComponent]
```

## Detailed app.html

Use this skeleton (Angular 21 control flow `@if`/`@for`, no `*ngIf`):

```html
<div class="app-shell">
  <aside class="sidebar" [class.is-collapsed]="collapsed()">
    <a class="sidebar__brand" routerLink="/dashboard">
      <span class="sidebar__logo">⏱</span>
      <span class="sidebar__name">AI-Swing</span>
    </a>

    <nav class="sidebar__nav">
      <a class="sidebar__item" routerLink="/dashboard" routerLinkActive="is-active">
        <svg class="ico" width="18" height="18"><use href="#dashboard"/></svg>
        <span>Dashboard</span>
      </a>
      <a class="sidebar__item" routerLink="/strategies" routerLinkActive="is-active">
        <svg class="ico" width="18" height="18"><use href="#strategies"/></svg>
        <span>Estratégias</span>
      </a>
      <a class="sidebar__item" routerLink="/indicators" routerLinkActive="is-active">
        <svg class="ico" width="18" height="18"><use href="#indicators"/></svg>
        <span>Indicadores</span>
      </a>
    </nav>

    <div class="sidebar__foot">
      <app-theme-switch />
      <button class="sidebar__collapse" (click)="toggleCollapsed()" [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'">
        <svg class="ico" width="14" height="14"><use href="#chevron-right"/></svg>
      </button>
    </div>
  </aside>

  <div class="app-shell__main">
    <header class="topbar">
      <div class="topbar__actions" style="margin-left: auto;">
        <button class="btn btn--secondary btn--sm" (click)="triggerRefresh()" [disabled]="refreshing()">
          @if (refreshing()) {
            <svg class="ico ico--spin" width="14" height="14"><use href="#loader"/></svg>
            <span>Atualizando…</span>
          } @else {
            <svg class="ico" width="14" height="14"><use href="#refresh"/></svg>
            <span>Refresh</span>
          }
        </button>
      </div>
    </header>

    @if (recentTransitions().length > 0 && !dismissed()) {
      <div class="banner banner--info">
        <span class="eyebrow">Transições · 7d</span>
        <div class="banner__chips">
          @for (t of recentTransitions(); track t.id) {
            <span class="badge" [class.badge--success]="t.to_state" [class.badge--danger]="!t.to_state">
              {{ t.date }} · #{{ t.strategy_id }} {{ t.from_state ? 'ON' : 'OFF' }} → {{ t.to_state ? 'ON' : 'OFF' }}
            </span>
          }
        </div>
        <button class="banner__close" (click)="dismissBanner()" aria-label="Dismiss">
          <svg class="ico" width="14" height="14"><use href="#x"/></svg>
        </button>
      </div>
    }

    @if (refreshError()) {
      <div class="banner banner--danger">
        <svg class="ico" width="14" height="14"><use href="#alert-circle"/></svg>
        <div class="banner__chips">{{ refreshError() }}</div>
      </div>
    }

    <main class="app-shell__content">
      <router-outlet />
    </main>
  </div>
</div>
```

## Detailed app.scss

The class-level rules now live in `frontend/src/styles/components/_app-shell.scss`, `_sidebar.scss`, `_topbar.scss`, `_banner.scss`. So `app.scss` should be small:

```scss
:host { display: block; min-height: 100vh; }

/* Project-specific glue, if any. Keep slim — most styles come from
   components.scss. If shell styles need to survive without partials
   for any reason, copy them here from layouts/10-shell-sidebar.md. */
```

If you find that the components.scss partials don't cover something used in app.html (e.g. nothing styles `.sidebar__logo`), add the missing rule into the relevant partial under `frontend/src/styles/components/` rather than into `app.scss`. Keep `app.scss` minimal.

## Search bar

The original design (`10-shell-sidebar.md`) shows a search bar in the topbar. **Skip it for this task** — there's no search backend in the API yet. Topbar contains only the refresh button on the right (`margin-left: auto`).

If layout looks empty: add a small `<div class="topbar__breadcrumb"></div>` placeholder on the left that subsequent tasks may populate. Or leave the topbar with just the refresh on the right — both are acceptable.

## What NOT to change

- Routes (`app.routes.ts`) — leave as is.
- `core/`, `pages/`, `shared/modal/`, `shared/charts/`, `shared/theme/` — untouched in this task.
- The transitions API call — keep using `recentTransitions(7)`.

## Verification

```bash
cd /var/www/pessoal/ai-swing/frontend
npx ng build --configuration=development
```

Build must succeed. Optionally:

```bash
# Start backend + frontend, navigate to /dashboard, confirm:
# - Sidebar visible on the left with Dashboard / Estratégias / Indicadores links
# - Active route gets is-active styling (left bar 2px + bg muted)
# - Theme switch in sidebar footer cycles light/dark/system
# - Refresh button still works
# - localStorage persists "aiswing.sidebar.collapsed" and "aiswing.theme"
```

## Definition of done

1. `app.ts` / `app.html` / `app.scss` updated as specified.
2. `ThemeSwitchComponent` is imported and rendered inside `.sidebar__foot`.
3. `<router-outlet/>` is inside `.app-shell__content`.
4. Build succeeds.
5. No regression in routes — every existing page still navigates and renders (visually unchanged content, but inside the new shell).
6. Print `TASK DONE: task-003-shell-sidebar.md` at the end.
