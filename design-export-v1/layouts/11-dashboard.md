# 11 — Dashboard

> Grid de strategy cards. Cada card mostra estado atual (RISK ON/OFF/BORDERLINE), score, sparkline 90d e tickers. Filtros e Add no header.

## HTML

```html
<section class="page">
  <header class="page__head">
    <div>
      <h1 class="page__title">Dashboard</h1>
      <p class="page__subtitle">{{ strategies.length }} strategies · last refresh {{ lastRefresh | date:'short' }}</p>
    </div>
    <div class="page__actions">
      <div class="filter-bar">
        <button class="btn btn--secondary btn--sm" [class.is-active]="filter() === 'all'" (click)="setFilter('all')">All</button>
        <button class="btn btn--secondary btn--sm" [class.is-active]="filter() === 'on'" (click)="setFilter('on')">Risk on</button>
        <button class="btn btn--secondary btn--sm" [class.is-active]="filter() === 'off'" (click)="setFilter('off')">Risk off</button>
      </div>
      <button class="btn btn--primary btn--sm" routerLink="/strategies/new">
        <svg class="ico" width="14" height="14"><use href="#plus"/></svg>
        New strategy
      </button>
    </div>
  </header>

  <div class="strategy-grid">
    <article class="strategy-card card card--clickable card--accent-success"
             *ngFor="let s of filteredStrategies"
             [routerLink]="['/strategies', s.id]">
      <header class="strategy-card__head">
        <div>
          <h3 class="strategy-card__title">{{ s.name }}</h3>
          <p class="strategy-card__tickers mono">
            {{ s.benchmark_ticker }} · {{ s.risk_on_ticker }} ↔ {{ s.risk_off_ticker }}
          </p>
        </div>
        <span class="badge badge--lg" [ngClass]="badgeClass(s)">
          {{ stateLabel(s) }}
        </span>
      </header>

      <div class="strategy-card__metrics">
        <div class="metric">
          <div class="metric__label">Score</div>
          <div class="metric__value mono">
            <span [ngClass]="scoreClass(s)">{{ s.current_signal?.score }}</span>
            <span class="metric__sep">/</span>
            <span class="metric__total">{{ s.current_signal?.total }}</span>
          </div>
        </div>
        <div class="metric">
          <div class="metric__label">k threshold</div>
          <div class="metric__value mono">{{ s.k_threshold }}</div>
        </div>
        <div class="metric">
          <div class="metric__label">Last update</div>
          <div class="metric__value mono">{{ s.current_signal?.date }}</div>
        </div>
      </div>

      <div class="strategy-card__chart">
        <app-sparkline [data]="s.sparkline_90d" [state]="cardState(s)"></app-sparkline>
      </div>

      <footer class="strategy-card__foot">
        <span class="eyebrow">{{ s.indicators.length }} indicators</span>
        <span class="strategy-card__open">
          Open
          <svg class="ico" width="12" height="12"><use href="#chevron-right"/></svg>
        </span>
      </footer>
    </article>
  </div>

  <!-- Empty state -->
  <div class="empty" *ngIf="!strategies.length">
    <svg class="empty__ico" width="48" height="48"><use href="#strategies"/></svg>
    <h3 class="empty__title">Nenhuma estratégia ainda</h3>
    <p class="empty__msg">Crie sua primeira estratégia para começar a monitorar sinais.</p>
    <button class="btn btn--primary btn--md" routerLink="/strategies/new">
      <svg class="ico" width="16" height="16"><use href="#plus"/></svg>
      Nova estratégia
    </button>
  </div>
</section>
```

## SCSS

```scss
.page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);

  &__head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-4);
    flex-wrap: wrap;
  }
  &__title {
    margin: 0;
    font: var(--text-h1);
    font-weight: 600;
    letter-spacing: -0.020em;
    color: var(--text-primary);
  }
  &__subtitle {
    margin: 4px 0 0;
    font: var(--text-sm);
    color: var(--text-muted);
  }
  &__actions {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
}

.filter-bar {
  display: inline-flex;
  padding: 2px;
  background: var(--surface-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  gap: 2px;

  .btn {
    height: 26px;
    border: 0;
    background: transparent;
    box-shadow: none;
    color: var(--text-muted);
    &:hover:not(:disabled) { background: transparent; color: var(--text-primary); }
    &.is-active {
      background: var(--surface);
      color: var(--text-primary);
      box-shadow: var(--shadow-xs);
    }
  }
}

.strategy-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-4);
}

.strategy-card {
  cursor: pointer;
  padding: var(--space-4) var(--space-5);
  gap: var(--space-3);

  &__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3);
  }
  &__title {
    margin: 0;
    font: var(--text-h3);
    font-weight: 600;
    letter-spacing: -0.008em;
    color: var(--text-primary);
  }
  &__tickers {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--text-muted);
    letter-spacing: 0.02em;
  }

  &__metrics {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
    padding: 10px 0;
    border-top: 1px solid var(--border-subtle);
    border-bottom: 1px solid var(--border-subtle);
  }

  &__chart {
    margin: 4px -8px 0;
    height: 56px;
  }

  &__foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  &__open {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font: var(--text-xs);
    font-weight: 500;
    color: var(--text-secondary);
  }
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 2px;

  &__label {
    font: var(--text-micro);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    font-weight: 600;
  }
  &__value {
    font-family: var(--font-mono);
    font-feature-settings: 'tnum';
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
  }
  &__sep, &__total { color: var(--text-muted); font-weight: 400; }

  &__value .text-success { color: var(--success); }
  &__value .text-danger { color: var(--danger); }
  &__value .text-warn { color: var(--warn); }
}
```

## Lógica de cores (TS helper)

```ts
// State derivation — único ponto da verdade
function stateOf(s: Strategy): 'on' | 'off' | 'borderline' {
  const sig = s.current_signal;
  if (!sig) return 'off';
  if (sig.risk_on) return 'on';
  if (sig.score === s.k_threshold) return 'borderline';
  return 'off';
}

stateLabel(s) { return ({on: 'RISK ON', off: 'RISK OFF', borderline: 'BORDERLINE'})[stateOf(s)]; }
badgeClass(s) { return ({on: 'badge--success', off: 'badge--danger', borderline: 'badge--warn'})[stateOf(s)]; }
scoreClass(s) {
  const k = s.k_threshold;
  const score = s.current_signal?.score ?? 0;
  if (score > k) return 'text-success';
  if (score === k) return 'text-warn';
  return 'text-danger';
}
cardState(s) { return stateOf(s); }
```

E aplicar a classe `card--accent-{success|danger|warn}` no `<article>` baseado em `stateOf(s)`.

## Estados especiais

- **Card sem signal** (`current_signal == null`): mostrar `—` em todos os mono fields, chart vazio (linha cinza tênue), badge `badge--neutral` "NO DATA".
- **Loading**: skeleton dentro do card — title 60% width, 3 metric values, chart área toda. Mantém shape final.
- **Filtro com 0 resultados**: empty state inline (não substitui página). Sugere "Reset filters".

## Densidade

- Card height: ~210–230px típico.
- Grid mínimo 320px coluna; em viewport 1366px cabem 4 colunas, 1600px cabem 4–5.
- Mobile: `grid-template-columns: 1fr;` (1 card por linha).
