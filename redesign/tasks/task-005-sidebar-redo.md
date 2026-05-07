# Task 005 (v2) — Sidebar rebuild (transitions inside, status-bar at bottom, no desktop topbar)

**Goal:** Refactor `app.html` / `app.ts` / `app.scss` so the app shell matches the canonical render (`capture-shell.jsx`):

- **Sidebar** (left): custom brand SVG mark + "AI · Swing" wordmark, "Workspace" eyebrow, 3 nav items (Dashboard / Estratégias / Indicadores) each with kbd hint (`G 1`, `G 2`, `G 3`), and **status-bar at bottom** with: success dot + "Atualizado HH:mm ET" + Refresh button. **Theme switch lives in `/settings`, NOT here.**
- **Banner** at top of `<main>` content area (NOT inside sidebar): `warn-soft` background, format `⚠ <message> · <action link> [×]`. Shows when there are recent transitions in the last 7 days.
- **Collapsed mode** (52px): only icons + brand mark; nav labels, kbd hints, eyebrow, and status-bar all hidden. Tooltip-on-hover for nav items. State persists in `localStorage('ai-swing.sidebar.collapsed')`.
- **No topbar on desktop.** Mobile (<768px) gets a hamburger-only `.topbar-mobile` and a drawer-style sidebar.

The current code has a topbar at the top of the main content area with a refresh button + transitions banner. The refresh button moves into the sidebar status-bar. The banner stays at the top of content but gets the new `--warn-soft` styling per `04-components.md` §10.

## Pre-conditions

- Tasks 001-004 done.
- `_sidebar.scss`, `_app-shell.scss`, `_topbar.scss` (mobile-only), `_theme-switch.scss` partials match Linear specs.
- `ThemeService.resolved()` and `'themechange'` event in place.

## Sources

1. **`design-export/capture-shell.jsx`** — canonical Shell, Logo/LogoMark, buildCss. Source of truth for any conflict below.
2. `design-export/layouts/10-shell-sidebar.md` — written spec; the "Transições recentes inside sidebar" section is now superseded by JSX (it's a banner at top of content). Read for context.
3. `design-export/04-components.md` §9 — sidebar internals, nav items with `.kbd`, brand, status-bar
4. `design-export/04-components.md` §10 — banner styling (`.banner--warn` etc.)
5. (~~`design-export/06-theme-toggle.md` §4 sidebar placement~~ no longer applies — theme-switch lives in `/settings`, see task 010)

## Files to modify

### `frontend/src/app/app.html`

Replace with the structure below. Use Angular 21 control flow.

```html
<div class="shell">
  <aside class="sidebar"
         [class.is-collapsed]="collapsed()"
         [class.is-mobile-open]="mobileMenuOpen()">
    <a class="brand" routerLink="/dashboard">
      <span class="brand__mark">
        <!-- Canonical AI-Swing logo: 3 candlesticks + swing-arrow underline.
             Source: design-export/capture-shell.jsx LogoMark component. -->
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="5.5" y1="6.5" x2="5.5" y2="14.5" stroke="var(--bg)" stroke-width="1.2" stroke-linecap="round"/>
          <rect x="4" y="9" width="3" height="4" rx="0.4" fill="var(--danger)"/>
          <line x1="12" y1="3.5" x2="12" y2="13" stroke="var(--bg)" stroke-width="1.2" stroke-linecap="round"/>
          <rect x="10.5" y="5.5" width="3" height="6" rx="0.4" fill="var(--success)"/>
          <line x1="18.5" y1="2" x2="18.5" y2="11.5" stroke="var(--bg)" stroke-width="1.2" stroke-linecap="round"/>
          <rect x="17" y="3.5" width="3" height="7" rx="0.4" fill="var(--success)"/>
          <path d="M3 19.5 Q 8 17 12 18.5 T 21 16" stroke="var(--bg)" stroke-width="1.6" stroke-linecap="round" fill="none"/>
          <path d="M19 14.5 L 21.2 16 L 19.7 18.2" stroke="var(--bg)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      </span>
      <span class="brand__name">
        <span>AI</span><span class="brand__dot">·</span><span>Swing</span>
      </span>
    </a>

    <div class="nav-section">Workspace</div>
    <nav class="nav">
      <a class="nav-item" routerLink="/dashboard"  routerLinkActive="nav-item--active"
         [attr.aria-label]="collapsed() ? 'Dashboard' : null"
         [attr.title]="collapsed() ? 'Dashboard' : null">
        <svg class="ico" width="14" height="14"><use href="#dashboard"/></svg>
        <span class="nav-item__label">Dashboard</span>
        <span class="kbd nav-item__kbd">G 1</span>
      </a>
      <a class="nav-item" routerLink="/strategies" routerLinkActive="nav-item--active"
         [attr.title]="collapsed() ? 'Estratégias' : null">
        <svg class="ico" width="14" height="14"><use href="#strategies"/></svg>
        <span class="nav-item__label">Estratégias</span>
        <span class="kbd nav-item__kbd">G 2</span>
      </a>
      <a class="nav-item" routerLink="/indicators" routerLinkActive="nav-item--active"
         [attr.title]="collapsed() ? 'Indicadores' : null">
        <svg class="ico" width="14" height="14"><use href="#indicators"/></svg>
        <span class="nav-item__label">Indicadores</span>
        <span class="kbd nav-item__kbd">G 3</span>
      </a>
    </nav>

    <div class="status-bar">
      <div class="status-bar__row">
        <span class="status-bar__dot"></span>
        <span>Atualizado <span class="mono">{{ lastRefreshLabel() }}</span></span>
      </div>
      <button class="btn btn--sm" style="width: 100%; margin-top: 8px;"
              (click)="triggerRefresh()" [disabled]="refreshing()">
        <svg class="ico" width="11" height="11" [class.spin]="refreshing()"><use href="#refresh"/></svg>
        @if (refreshing()) { Atualizando… } @else { Refresh }
      </button>
    </div>
  </aside>

  <header class="topbar-mobile">
    <button class="icon-btn" (click)="toggleMobileMenu()" aria-label="Menu">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18M3 12h18M3 18h18"/>
      </svg>
    </button>
  </header>

  <main class="main">
    @if (recentTransitions().length > 0 && !bannerDismissed()) {
      <div class="banner banner--warn">
        <svg class="ico" width="14" height="14"><use href="#alert-circle"/></svg>
        <span>
          <strong>{{ recentTransitions().length }} transições nos últimos 7 dias</strong>
          @for (t of recentTransitions().slice(0, 2); track t.id) {
            · #{{ t.strategy_id }} {{ t.from_state ? 'ON' : 'OFF' }} → {{ t.to_state ? 'ON' : 'OFF' }}
          }
          <a routerLink="/strategies" style="margin-left: 8px;">Ver →</a>
        </span>
        <button class="banner__close" (click)="dismissBanner()" aria-label="Dismiss">
          <svg class="ico" width="12" height="12"><use href="#x"/></svg>
        </button>
      </div>
    }

    @if (refreshError()) {
      <div class="banner banner--danger">
        <svg class="ico" width="14" height="14"><use href="#alert-circle"/></svg>
        <span>{{ refreshError() }}</span>
        <button class="banner__close" (click)="dismissError()" aria-label="Fechar">
          <svg class="ico" width="12" height="12"><use href="#x"/></svg>
        </button>
      </div>
    }

    <router-outlet />
  </main>
</div>
```

Note: the brand SVG above uses literal `var(--bg)` for stroke and `var(--danger)` / `var(--success)` for fills — works because the `<svg>` is inside `.brand__mark` whose background is `--text-primary` (dark). The `var(--bg)` becomes the contrasting tone. In dark mode, `--bg` is dark and `--text-primary` is light, so it inverts correctly.

### `frontend/src/app/app.ts`

Required state:
- Already has `recentTransitions = signal<SignalTransition[]>([])`, `refreshing`, `refreshError`, `triggerRefresh()`, `loadTransitions()` — keep.
- Add `mobileMenuOpen = signal(false)` and `toggleMobileMenu()`.
- Add `collapsed = signal<boolean>(this.readCollapsed())` reading `localStorage.getItem('ai-swing.sidebar.collapsed') === '1'`. Add `toggleCollapsed()`.
- Add `bannerDismissed = signal(false)` and `dismissBanner()`. (Optional: persist in sessionStorage so dismissal survives within the same tab.)
- Add `lastRefreshLabel = computed<string>(...)` — derived from `RefreshStatus.last_finished_at` (call `api.refreshStatus()` on init and after each manual refresh). Format as `HH:mm ET`.
- Remove the old `triggerRefresh` reload-via-`window.location.reload()` — instead, after successful refresh, re-call `loadTransitions()` and update the timestamp via the refresh status fetch.

Imports update — **DO NOT** include `ThemeSwitchComponent`. The theme switch is consumed only by the Settings page (task 010).

```ts
imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule]
```

If `RouterLinkActive` triggers full-route matching, be aware: `routerLink="/dashboard"` should match exact, while `/strategies` should match prefix (so `/strategies/123` highlights "Estratégias"). Use `[routerLinkActiveOptions]="{exact: false}"` where needed, or rely on Angular's default substring match.

### `frontend/src/app/app.scss`

Slim. Most styling is in `_app-shell.scss` / `_sidebar.scss` partials. Keep only:

```scss
:host { display: block; min-height: 100vh; }
```

If `.spin` keyframe isn't yet in `_loading-bar.scss` or another global partial, add minimal:

```scss
.spin { animation: spin 600ms linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
```

(Or move it to `_button.scss` / a new `_animations.scss` partial.)

## Keyboard shortcuts (deferred)

The full `G 1/2/3` + `⌘K` keyboard handler is task 013's job. For this task, just ensure the kbd labels render in the sidebar items. Don't wire the global `keydown` listener yet.

## What to delete from current code

- The old topbar block in `app.html` (refresh button on the right) — gone.
- The old `<app-theme-switch />` rendered inside the sidebar footer — moved to Settings.
- The old "transitions banner" inside the sidebar — moved to top of `<main>`.
- Any leftover `.app-shell__main` wrapper that's no longer needed — the new `.shell` + `.main` is flatter.

## Files NOT to modify

- Page components (dashboard, strategies, indicators, strategy-detail).
- Modal component, form components.

## Verification

```bash
cd /var/www/pessoal/ai-swing/frontend
npx ng build --configuration=development
```

Manual smoke (with backend + frontend running):
- Sidebar shows custom candlestick brand mark + "AI · Swing" wordmark with mid-dot in muted gray.
- 3 nav items each with kbd hint (`G 1`, `G 2`, `G 3`).
- Active route gets `nav-item--active` styling (subtle bg + ink text + 500 weight).
- Status bar at bottom: success dot + "Atualizado HH:mm ET" + Refresh button. **No theme switch here.**
- Banner with `--warn-soft` background shows at top of `<main>` when there are recent transitions; dismissible with [×].
- Refresh button click triggers backend; banner persists or is freshly populated; timestamp updates.
- Resize viewport <768px: sidebar transforms off-screen; topbar-mobile shows hamburger; clicking it toggles `is-mobile-open`.
- (Collapsed mode toggle wiring is in this task; the actual UI to flip it can be deferred to task 013 — for now `collapsed = true` is testable by setting the localStorage key by hand.)

## Definition of done

1. `app.html` matches the structure above (brand SVG, no theme-switch, transitions banner in main).
2. `app.ts` has `mobileMenuOpen`, `collapsed`, `bannerDismissed`, `lastRefreshLabel`.
3. `app.scss` is minimal.
4. Old topbar/banner-in-sidebar code removed; theme-switch import removed from app.ts.
5. Build passes.
6. Print `TASK DONE: task-005-sidebar-redo.md` at end.
