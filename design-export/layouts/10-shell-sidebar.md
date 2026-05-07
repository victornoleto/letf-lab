# Layout: Shell + Sidebar

> Componente raiz da app. Sidebar 232px sticky à esquerda, main flex à direita,
> max-width 1280px no main, padding generoso.

---

## Estrutura

```
┌─────────────┬─────────────────────────────────────────────────┐
│ AI-Swing    │ [banner opcional]                               │
│             │                                                 │
│ WORKSPACE   │ Page header (h1 + sub + actions)                │
│ ▸ Dashboard │ ─────────────────────────────────────────────── │
│   Estratég. │                                                 │
│   Indicad.  │   Page content (cards / tables / form)          │
│             │                                                 │
│             │                                                 │
│ TRANSIÇÕES  │                                                 │
│ recentes    │                                                 │
│ MU → MUU    │                                                 │
│ SPY → UPRO  │                                                 │
│             │                                                 │
│ ─────────── │                                                 │
│ ● 14:32 ET  │                                                 │
│ [Refresh]   │                                                 │
│ [☀]̄[🖥][🌙]   │                                                 │
└─────────────┴─────────────────────────────────────────────────┘
```

---

## HTML (Angular standalone, conceitual)

```html
<!-- app-shell.component.html -->
<div class="shell">
  <aside class="sidebar">
    <div class="brand">
      <div class="brand__mark"><app-icon name="bolt" [size]="12"/></div>
      <div class="brand__name">AI-Swing</div>
    </div>

    <div class="nav-section">Workspace</div>
    <nav class="nav">
      <a class="nav-item" routerLink="/dashboard"   routerLinkActive="nav-item--active">
        <app-icon name="dashboard" [size]="14"/><span>Dashboard</span>
        <span class="kbd">G 1</span>
      </a>
      <a class="nav-item" routerLink="/strategies"  routerLinkActive="nav-item--active">
        <app-icon name="layers" [size]="14"/><span>Estratégias</span>
        <span class="kbd">G 2</span>
      </a>
      <a class="nav-item" routerLink="/indicators"  routerLinkActive="nav-item--active">
        <app-icon name="activity" [size]="14"/><span>Indicadores</span>
        <span class="kbd">G 3</span>
      </a>
    </nav>

    @if (recentTransitions().length) {
      <div class="nav-section">Transições recentes</div>
      <div class="transitions">
        @for (t of recentTransitions(); track t.id) {
          <a class="transition" [routerLink]="['/strategies', t.strategyId]">
            <span class="transition__tickers mono">{{t.from}} → {{t.to}}</span>
            <span class="transition__meta">{{t.label}} · {{t.date}}</span>
          </a>
        }
      </div>
    }

    <div class="status-bar">
      <div class="status-bar__row">
        <span class="status-bar__dot"></span>
        <span>Atualizado <span class="mono">{{lastUpdate()}}</span></span>
      </div>
      <button class="btn btn--sm" style="width: 100%; margin-top: 8px;"
              (click)="refresh()">
        <app-icon name="refresh" [size]="11"/> Refresh
      </button>
      <app-theme-toggle></app-theme-toggle>
    </div>
  </aside>

  <main class="main">
    <router-outlet/>
  </main>
</div>
```

---

## SCSS

```scss
.shell {
  display: flex;
  min-height: 100vh;
  background: var(--bg);
}

.main {
  flex: 1;
  min-width: 0;
  padding: var(--space-7) var(--space-8) var(--space-10);   // 24px 32px 64px
  max-width: 1280px;
}

// .sidebar / .brand / .nav-item / .kbd → ver 04-components.md §9 e §15
```

### Transições recentes (lista na sidebar)

```scss
.transitions { display: flex; flex-direction: column; gap: 2px; }
.transition {
  display: flex; flex-direction: column; gap: 2px;
  padding: 6px 8px;
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--text-secondary);

  &:hover { background: rgba(0,0,0,0.04); color: var(--text-primary); }
}
.transition__tickers { font-size: 11.5px; font-weight: var(--fw-medium); }
.transition__meta    { font-size: 10.5px; color: var(--text-muted); font-family: var(--font-mono); }

[data-theme="dark"] .transition:hover { background: rgba(255,255,255,0.05); }
```

---

## Responsivo (mobile / tablet)

A `<aside>` esconde no mobile, vira drawer accionável por hamburger no topbar.

```scss
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    transform: translateX(-100%);
    transition: transform var(--duration-base) var(--ease-out);
    z-index: var(--z-modal);
    box-shadow: var(--shadow-lg);
  }
  .sidebar--open { transform: translateX(0); }

  .main { padding: var(--space-5) var(--space-5) var(--space-9); }

  // Topbar mobile só aparece em mobile
  .topbar-mobile {
    display: flex;
    height: var(--h-topbar);
    align-items: center;
    padding: 0 var(--space-5);
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    position: sticky;
    top: 0;
    z-index: var(--z-sticky);
  }
}
@media (min-width: 769px) {
  .topbar-mobile { display: none; }
}
```

---

## Atalhos de teclado (Linear-style `G + n`)

Implementar no `AppShell` (ver detalhes em `04-components.md §9`):

| Atalho     | Ação                                       |
|------------|--------------------------------------------|
| `G 1`      | Go to Dashboard                            |
| `G 2`      | Go to Estratégias                          |
| `G 3`      | Go to Indicadores                          |
| `Cmd/Ctrl+K` | Abrir command palette (futuro — placeholder por ora) |
| `Esc`      | Fechar modal aberto                        |
| `?`        | Abrir help modal mostrando todos atalhos   |

Atalhos **não disparam** quando foco está em `INPUT`, `TEXTAREA`, `[contenteditable]`.
