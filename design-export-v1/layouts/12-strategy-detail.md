# 12 — Strategy Detail

> Página mais densa do app: hero com 4 KPIs, equity chart com legendas, ratio chart abaixo, tabela de signal history. Tabs opcionais para Backtest / Settings.

## Estrutura

```
breadcrumb
hero header (title + state badge + tickers + indicators)
4 KPI tiles
─── tabs: Overview | Backtest | Signals | Settings ───
equity chart (large)
ratio chart (small, below)
signal history table
```

## HTML

```html
<section class="page page--detail">
  <nav class="breadcrumb">
    <a routerLink="/dashboard">Dashboard</a>
    <svg class="ico" width="12" height="12"><use href="#chevron-right"/></svg>
    <a routerLink="/strategies">Strategies</a>
    <svg class="ico" width="12" height="12"><use href="#chevron-right"/></svg>
    <span>{{ strategy.name }}</span>
  </nav>

  <header class="hero">
    <div class="hero__main">
      <div class="hero__row">
        <h1 class="hero__title">{{ strategy.name }}</h1>
        <span class="badge badge--lg" [ngClass]="badgeClass">{{ stateLabel }}</span>
        <span class="badge badge--neutral badge--mono">{{ strategy.current_signal?.score }} / {{ strategy.current_signal?.total }}</span>
      </div>
      <p class="hero__tickers mono">
        Benchmark <strong>{{ strategy.benchmark_ticker }}</strong>
        · Risk on <strong>{{ strategy.risk_on_ticker }}</strong>
        · Risk off <strong>{{ strategy.risk_off_ticker }}</strong>
        · k = <strong>{{ strategy.k_threshold }}</strong>
      </p>
      <div class="hero__indicators">
        <span class="chip" *ngFor="let i of strategy.indicators">{{ i.name }}</span>
      </div>
    </div>

    <div class="hero__actions">
      <button class="btn btn--secondary btn--sm">
        <svg class="ico" width="14" height="14"><use href="#refresh"/></svg>
        Recompute
      </button>
      <button class="btn btn--secondary btn--sm">
        <svg class="ico" width="14" height="14"><use href="#pencil"/></svg>
        Edit
      </button>
    </div>
  </header>

  <div class="kpi-grid">
    <div class="kpi-tile">
      <div class="kpi-tile__label">CAGR</div>
      <div class="kpi-tile__value mono">{{ kpis.cagr | number:'1.2-2' }}<span class="kpi-tile__unit">%</span></div>
      <div class="kpi-tile__diff mono kpi-tile__diff--pos">+{{ kpis.cagrDelta | number:'1.2-2' }}pp vs B&amp;H</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-tile__label">Max drawdown</div>
      <div class="kpi-tile__value mono">{{ kpis.maxDD | number:'1.2-2' }}<span class="kpi-tile__unit">%</span></div>
      <div class="kpi-tile__diff mono kpi-tile__diff--pos">+{{ kpis.maxDDDelta | number:'1.2-2' }}pp vs B&amp;H</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-tile__label">Sharpe</div>
      <div class="kpi-tile__value mono">{{ kpis.sharpe | number:'1.2-2' }}</div>
      <div class="kpi-tile__diff mono">since 2010</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-tile__label">Win rate</div>
      <div class="kpi-tile__value mono">{{ kpis.winRate | number:'1.0-0' }}<span class="kpi-tile__unit">%</span></div>
      <div class="kpi-tile__diff mono">{{ kpis.totalTrades }} trades</div>
    </div>
  </div>

  <div class="tabs">
    <button class="tabs__tab is-active">Overview</button>
    <button class="tabs__tab">Backtest</button>
    <button class="tabs__tab">Signals</button>
    <button class="tabs__tab">Settings</button>
  </div>

  <section class="chart-card">
    <header class="chart-card__head">
      <div>
        <h3 class="chart-card__title">Equity curves</h3>
        <p class="chart-card__sub">Normalizado em base 1.0 desde 2010-01-01</p>
      </div>
      <div class="chart-card__legend">
        <span class="legend-item"><i class="legend-dot" style="background:var(--chart-strategy)"></i> Strategy</span>
        <span class="legend-item"><i class="legend-dot legend-dot--dashed" style="background:var(--chart-benchmark)"></i> Benchmark</span>
        <span class="legend-item"><i class="legend-dot" style="background:var(--chart-leveraged)"></i> Leveraged 2x</span>
      </div>
    </header>
    <div class="chart-card__chart" style="height: 360px;"
         echarts [options]="equityOptions" [merge]="equityMerge"></div>
  </section>

  <section class="chart-card">
    <header class="chart-card__head">
      <div>
        <h3 class="chart-card__title">Outperformance vs benchmark</h3>
        <p class="chart-card__sub">Diferença em pontos percentuais (rolling)</p>
      </div>
    </header>
    <div class="chart-card__chart" style="height: 180px;"
         echarts [options]="ratioOptions"></div>
  </section>

  <section class="chart-card">
    <header class="chart-card__head">
      <div>
        <h3 class="chart-card__title">Signal history</h3>
        <p class="chart-card__sub">Transitions registered for this strategy</p>
      </div>
      <button class="btn btn--ghost btn--sm">
        <svg class="ico" width="14" height="14"><use href="#download"/></svg>
        Export CSV
      </button>
    </header>
    <app-signal-history-table [strategyId]="strategy.id"></app-signal-history-table>
  </section>
</section>
```

## SCSS

```scss
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font: var(--text-xs);
  color: var(--text-muted);

  a {
    color: var(--text-muted);
    text-decoration: none;
    &:hover { color: var(--text-primary); }
  }
  span:last-child { color: var(--text-primary); font-weight: 500; }
  .ico { color: var(--text-disabled); }
}

.hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-5);
  padding: var(--space-5) 0 var(--space-4);
  border-bottom: 1px solid var(--border-subtle);

  &__row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-wrap: wrap;
  }
  &__title {
    margin: 0;
    font: var(--text-display);
    font-weight: 600;
    letter-spacing: -0.022em;
    color: var(--text-primary);
  }
  &__tickers {
    margin: var(--space-2) 0 var(--space-3);
    font-size: 13px;
    color: var(--text-muted);
    strong { color: var(--text-primary); font-weight: 500; }
  }
  &__indicators {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  &__actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }
}

.chart-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);

  &__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3);
  }
  &__title { margin: 0; font: var(--text-h3); font-weight: 600; letter-spacing: -0.008em; }
  &__sub { margin: 2px 0 0; font: var(--text-xs); color: var(--text-muted); }

  &__legend {
    display: flex;
    gap: var(--space-3);
    flex-wrap: wrap;
  }

  &__chart { width: 100%; }
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font: var(--text-xs);
  color: var(--text-secondary);
}

.legend-dot {
  display: inline-block;
  width: 10px;
  height: 4px;
  border-radius: 2px;

  &--dashed {
    background: transparent !important;
    border-top: 2px dashed var(--chart-benchmark);
    height: 0;
  }
}
```

## Estados

- **Loading**: skeleton no hero (title 240×24, badge 80×26), 4 kpi tiles em skeleton block 180×72, charts em skeleton 100% height.
- **Empty signal history**: empty state inline com `Run backtest` CTA.
- **Recompute em andamento**: hero `__actions` mostra spinner inline; hero não pisca, charts não desmontam — só re-render.

## Density

- Hero ~140px de altura.
- KPI grid: 4 colunas em ≥1100px, 2 em 700–1100px, 1 abaixo.
- Equity chart: 360px. Ratio: 180px. Tabela: até 480px com scroll vertical.
