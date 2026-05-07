# 10 — App shell + Sidebar

> Layout fixed-sidebar + main content. Sidebar 232px / 56px collapsed. Topbar opcional dentro do main (search, user menu).

## Estrutura

```
┌─────────┬───────────────────────────────────────┐
│         │  topbar (sticky, optional)            │
│ sidebar ├───────────────────────────────────────┤
│ 232px   │  banner: recent transitions (dismiss) │
│ fixed   ├───────────────────────────────────────┤
│         │  page content                         │
│         │  max-width 1600px                     │
│         │  padding 28px 32px                    │
└─────────┴───────────────────────────────────────┘
```

## HTML

```html
<div class="app-shell">
  <app-sidebar></app-sidebar>

  <div class="app-shell__main">
    <header class="topbar">
      <div class="topbar__search">
        <svg class="ico" width="14" height="14"><use href="#search"/></svg>
        <input class="topbar__search-input" placeholder="Search strategies, indicators…" />
        <kbd class="topbar__kbd">⌘K</kbd>
      </div>
      <div class="topbar__actions">
        <button class="btn btn--secondary btn--sm">
          <svg class="ico ico--spin" width="14" height="14" *ngIf="refreshing()"><use href="#loader"/></svg>
          <svg class="ico" width="14" height="14" *ngIf="!refreshing()"><use href="#refresh"/></svg>
          Refresh
        </button>
        <button class="btn btn--ghost btn--icon btn--sm" aria-label="Notifications">
          <svg class="ico" width="16" height="16"><use href="#bell"/></svg>
        </button>
      </div>
    </header>

    <!-- Banner de transições (dismissible) -->
    <div class="banner banner--info" *ngIf="recentTransitions().length">
      <span class="eyebrow">Recent transitions · 7d</span>
      <div class="banner__chips">
        <span class="badge badge--success" *ngFor="let t of onTransitions">
          {{ t.date }} · #{{ t.strategy_id }} OFF → ON
        </span>
        <span class="badge badge--danger" *ngFor="let t of offTransitions">
          {{ t.date }} · #{{ t.strategy_id }} ON → OFF
        </span>
      </div>
      <button class="banner__close" (click)="dismissBanner()" aria-label="Dismiss">
        <svg class="ico" width="14" height="14"><use href="#x"/></svg>
      </button>
    </div>

    <main class="app-shell__content">
      <router-outlet />
    </main>
  </div>
</div>
```

## SCSS

```scss
.app-shell {
  display: flex;
  min-height: 100vh;
  background: var(--bg);

  &__main {
    flex: 1;
    margin-left: var(--sidebar-width);
    min-width: 0;
    transition: margin-left var(--transition-base);
    display: flex;
    flex-direction: column;

    .sidebar.is-collapsed ~ & { margin-left: var(--sidebar-width-collapsed); }
  }

  &__content {
    flex: 1;
    padding: var(--content-pad-y) var(--content-pad-x);
    max-width: var(--content-max-width);
    width: 100%;
    margin: 0 auto;
  }
}

.topbar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: 52px;
  padding: 0 var(--content-pad-x);
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;

  &__search {
    flex: 1;
    max-width: 420px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    height: 32px;
    background: var(--surface-muted);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text-muted);
    transition: var(--transition-fast);

    &:focus-within {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--focus-ring);
    }
  }
  &__search-input {
    flex: 1;
    background: transparent;
    border: 0;
    outline: 0;
    color: var(--text-primary);
    font: var(--text-sm);
    &::placeholder { color: var(--text-muted); }
  }
  &__kbd {
    font: var(--text-xs);
    font-family: var(--font-mono);
    color: var(--text-muted);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 1px 6px;
  }

  &__actions { display: flex; align-items: center; gap: 6px; margin-left: auto; }
}

.banner {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 10px var(--content-pad-x);
  border-bottom: 1px solid var(--border);
  background: var(--surface);

  &__chips { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; min-width: 0; }
  &__close {
    background: transparent; border: 0; padding: 4px;
    color: var(--text-muted); cursor: pointer; border-radius: var(--radius-sm);
    &:hover { background: var(--surface-muted); color: var(--text-primary); }
  }

  &--info { background: var(--info-bg); border-color: var(--info-border); }
  &--success { background: var(--success-bg); border-color: var(--success-border); }
  &--danger { background: var(--danger-bg); border-color: var(--danger-border); }
}

.eyebrow {
  font: var(--text-micro);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  white-space: nowrap;
}
```

## Mobile (≤ 768px)

- Sidebar vira drawer com `transform: translateX(-100%)` por padrão; `.is-open` traz pra tela com overlay scrim.
- Topbar ganha hamburger (`<button>` que toggle `.is-open`).
- `app-shell__main { margin-left: 0; }` em breakpoint mobile.

```scss
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    box-shadow: var(--shadow-lg);
    &.is-open { transform: translateX(0); }
  }
  .app-shell__main { margin-left: 0; }
  .sidebar.is-collapsed ~ .app-shell__main { margin-left: 0; }

  .scrim {
    position: fixed; inset: 0;
    background: var(--scrim);
    z-index: 15;
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--transition-base);
    &.is-open { opacity: 1; pointer-events: auto; }
  }
}
```

## Estados a documentar

- **Loading inicial**: skeleton no `.banner__chips` (1 chip de 120×20).
- **Refresh em andamento**: spinner no botão Refresh (`btn` permanece interativo, só ícone gira).
- **Refresh erro**: toast vermelho top-right (não banner — banner é só para transitions).
- **Sidebar collapsed**: tooltips aparecem ao hover dos itens (`title=` ou `<app-tooltip>`).

## Ordem de bootstrap

1. Inline FOUC script (`index.html` head)
2. Angular bootstrap → `MainLayoutComponent`
3. `ThemeService` constructor aplica `data-theme`
4. Sidebar lê `aiswing.sidebar.collapsed` do localStorage
5. Banner consulta `RecentTransitionsService` (já existe)
