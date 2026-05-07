# Task 005 — Strategy detail (hero + KPI tiles + chart-card + breadcrumb + tabs)

**Goal:** Transform `/strategies/:id` from the current dense layout into the design's structured hierarchy: breadcrumb → hero → KPI tiles → tabs (visual only, single tab active) → equity chart card → ratio chart card → signal history table card.

## Pre-conditions

- Tasks 001-004 done.
- `.kpi-grid`, `.kpi-tile`, `.chart-card`, `.breadcrumb`, `.tabs`, `.legend-item`, `.legend-dot`, `.callout`, `.empty`, `.skeleton` exist.
- `chart-tokens.ts` and `ThemeService` exist.
- `shared/strategy-state.ts` from task 004 exists (reuse `stateLabel`, `badgeClass`).

## Sources

1. `design-export/layouts/12-strategy-detail.md` — full HTML + SCSS
2. `design-export/05-charts-echarts.md` — `equityOption(t, data)`, `ratioOption(t, data)`, `baseOption(t)`
3. `design-export/04-components.md` — KPI tile structure, callout (for empty backtest case)

## Files to modify

| File | Changes |
|---|---|
| `frontend/src/app/pages/strategy-detail/strategy-detail.ts` | New layout (breadcrumb, hero, KPIs, tabs, chart cards, history) |
| `frontend/src/app/pages/strategy-detail/backtest-panel.ts` | Refactor charts to use `chart-tokens.ts` + reactive theme. Split into 2 `<section class="chart-card">` blocks: equity curves and ratio. |
| `frontend/src/app/pages/strategy-detail/signal-history-table.ts` | Wrap output in `.chart-card` (the visual treatment is the same) and adopt `.table-wrap` + `.table` markup |

## strategy-detail.ts

Top-level layout (use signals + computed for `kpis`):

```ts
import { Component, computed, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { SignalTransition, Strategy } from '../../core/models';
import { BacktestPanelComponent } from './backtest-panel';
import { SignalHistoryTableComponent } from './signal-history-table';
import { stateLabel, badgeClass, stateOf } from '../../shared/strategy-state';
```

Hero markup follows `12-strategy-detail.md` exactly (`<header class="hero">` with `__main` and `__actions`). Remove the old vertical "indicators today" inline list — that information is shown inside the chart cards / history table now. Indicators displayed as chips inside `.hero__indicators`.

KPI grid: 4 tiles (CAGR, Max DD, Sharpe, Win rate). The current backend returns `metrics_strategy.cagr`, `.max_dd`, `.sharpe`, `.hit_rate_vs_benchmark` (use as Win rate substitute), and `.n_trades`. The "diff vs B&H" requires comparing to `metrics_benchmark`:

```ts
kpis = computed(() => {
  const r = this.backtest();
  if (!r) return null;
  const s = r.metrics_strategy, b = r.metrics_benchmark;
  return {
    cagr: s.cagr * 100,
    cagrDelta: (s.cagr - b.cagr) * 100,
    maxDD: s.max_dd * 100,
    maxDDDelta: (s.max_dd - b.max_dd) * 100,
    sharpe: s.sharpe,
    winRate: (s.hit_rate_vs_benchmark ?? 0) * 100,
    totalTrades: s.n_trades ?? 0,
  };
});
```

The detail component already loads strategy data; for KPIs it needs the latest backtest result. Two options:

(a) **Hoist** the backtest fetch up from `BacktestPanelComponent` into the parent — fetch once, pass to the panel, and read for KPIs. Cleanest.

(b) Have `BacktestPanelComponent` emit `backtestLoaded` events and the parent listens. Simpler diff, more coupled.

**Choose (a)**: move the backtest fetch into a service method (or directly in the parent), pass `[result]` as input to `BacktestPanelComponent`. Update `BacktestPanelComponent` to be a "dumb" presentational component receiving `result` and `range` as inputs and emitting `rangeChange` and `forceRerun` events.

API for backtest already exists: `POST /api/backtest/{strategyId}?range_years=N&force=...` returning `BacktestResult`. Add a simple HttpClient call in the parent component.

Tabs: render 4 buttons (Overview / Backtest / Signals / Settings) but only "Overview" is active and clickable. Other tabs can be visually inactive and disabled (or render a soft "in progress" state). Single source of truth: `selectedTab = signal<'overview'|'backtest'|'signals'|'settings'>('overview')`. For now, only "overview" content renders — others can show a small empty state inside the same `.tabs-panel`.

To keep this task tractable: tabs become **visual decoration only**, all clicked items show the same content. Add a TODO comment for future per-tab routing.

## backtest-panel.ts

Refactor:
- Inputs: `result: BacktestResult | null`, `range: number`, `loading: boolean`, `error: string | null`.
- Outputs: `rangeChange = output<number>()`, `forceRerun = output<void>()`.
- No HTTP calls inside the component.

Markup: split current single-card layout into TWO `<section class="chart-card">` blocks.

Block 1 — Equity curves:
```html
<section class="chart-card">
  <header class="chart-card__head">
    <div>
      <h3 class="chart-card__title">Equity curves</h3>
      <p class="chart-card__sub">Normalizado em base 1.0 · range {{ range() }}y</p>
    </div>
    <div class="chart-card__legend">
      <span class="legend-item"><i class="legend-dot" [style.background]="seriesColors().strategy"></i> Strategy</span>
      <span class="legend-item"><i class="legend-dot legend-dot--dashed"></i> Benchmark</span>
      <span class="legend-item"><i class="legend-dot" [style.background]="seriesColors().leveraged"></i> LETF</span>
    </div>
  </header>
  <div class="chart-card__chart" style="height: 360px;" #equityHost></div>
</section>
```

Block 2 — Ratio (Strategy / Benchmark):
```html
<section class="chart-card">
  <header class="chart-card__head">
    <div>
      <h3 class="chart-card__title">Outperformance vs benchmark</h3>
      <p class="chart-card__sub">Razão equity_strategy / equity_benchmark</p>
    </div>
  </header>
  <div class="chart-card__chart" style="height: 220px;" #ratioHost></div>
</section>
```

Range selector + Rerun button move to a small `.chart-card__actions` strip ABOVE the equity card (or to the page header next to the breadcrumb actions). Choose: place it as part of `chart-card__head` of the equity card on the right side, next to legends. Implement using existing `<select>` styled by `.input` + small "Rerun" button.

Build options using `chart-tokens` resolver:

```ts
private theme = inject(ThemeService);
seriesColors = computed(() => getChartTokens(this.theme.effective()).series);

ngAfterViewInit() {
  this.equityChart = echarts.init(this.equityHost().nativeElement);
  this.ratioChart = echarts.init(this.ratioHost().nativeElement);
  // ResizeObserver
  effect(() => {
    const r = this.result();
    const t = getChartTokens(this.theme.effective());
    if (r) {
      this.equityChart.setOption(this.buildEquityOption(t, r), true);
      this.ratioChart.setOption(this.buildRatioOption(t, r), true);
    }
  });
}
```

`buildEquityOption(t, r)` adapts `equityOption()` from `05-charts-echarts.md`. Pass strategy/benchmark/leveraged points from `r.equity_strategy`, `r.equity_benchmark_buyhold`, `r.equity_riskon_buyhold`.

`buildRatioOption(t, r)` for the ratio chart — uses `r.equity_ratio_vs_benchmark`. Reuse the gradient-area approach from the current implementation but recolor with `t.series.ratioPos` (positive area) and `t.series.ratioNeg` (negative area). The dashed parity line at y=1 stays. **Important:** the current implementation uses log scale and 2 series for split-by-side. Keep that logic, just swap colors to come from `chart-tokens`.

Reuse `dataZoom` from the design's spec.

## signal-history-table.ts

Refactor to use the standard `.chart-card` wrapper (since it shares the same visual container) OR introduce a new `.section-card` partial — `.chart-card` already fits.

Inside, render the table using `.table-wrap` + `.table` from `13-list-pages.md` (history list pattern):

```html
<section class="chart-card">
  <header class="chart-card__head">
    <div>
      <h3 class="chart-card__title">Signal history</h3>
      <p class="chart-card__sub">{{ snapshots().length }} snapshots · range {{ range() }}</p>
    </div>
    <div class="chart-card__actions">
      <select class="input input--inline" [ngModel]="range()" (ngModelChange)="setRange($event)">
        <option value="1m">1m</option>
        <option value="3m">3m</option>
        <option value="6m">6m</option>
        <option value="1y">1y</option>
        <option value="max">max</option>
      </select>
    </div>
  </header>

  @if (snapshots().length === 0) {
    <div class="empty">
      <h3 class="empty__title">Sem histórico ainda</h3>
      <p class="empty__msg">Será populado pelo cron diário (22h ET) ou ao usar refresh manual.</p>
    </div>
  } @else {
    <div class="table-wrap">
      <table class="table">
        <thead class="t-head"><!-- Date | Score | State | one col per indicator --></thead>
        <tbody class="t-body">
          @for (s of snapshotsDesc(); track s.date) {
            <tr>
              <td class="mono">{{ s.date }}</td>
              <td class="num mono">{{ s.score }}/{{ s.total }}</td>
              <td><span class="badge" [class.badge--success]="s.risk_on" [class.badge--danger]="!s.risk_on">
                {{ s.risk_on ? 'ON' : 'OFF' }}</span></td>
              @for (col of indicatorColumns(); track col) {
                <td class="check-cell">
                  @let res = findResult(s, col);
                  @if (res) {
                    @if (res.gate_passed) {
                      <svg class="ico" width="14" height="14" style="color: var(--success)"><use href="#check"/></svg>
                    } @else {
                      <svg class="ico" width="14" height="14" style="color: var(--danger); opacity: 0.7"><use href="#x"/></svg>
                    }
                  } @else {
                    <span class="t-muted">—</span>
                  }
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  }
</section>
```

Add `.check-cell { text-align: center; }` to `_table.scss` if not already present.

## Strategy detail page header

Replace the current `.page-header` with this structure:

```html
<nav class="breadcrumb">
  <a routerLink="/dashboard">Dashboard</a>
  <svg class="ico" width="12" height="12"><use href="#chevron-right"/></svg>
  <a routerLink="/strategies">Estratégias</a>
  <svg class="ico" width="12" height="12"><use href="#chevron-right"/></svg>
  <span>{{ strategy()?.name }}</span>
</nav>

<header class="hero">
  <div class="hero__main">
    <div class="hero__row">
      <h1 class="hero__title">{{ strategy()?.name }}</h1>
      @if (strategy()?.current_signal) {
        <span class="badge badge--lg" [class]="badgeCls()">{{ stateText() }}</span>
        <span class="badge badge--neutral badge--mono">
          {{ strategy()!.current_signal!.score }} / {{ strategy()!.current_signal!.total }}
        </span>
      }
    </div>
    <p class="hero__tickers mono">
      Benchmark <strong>{{ strategy()?.benchmark_ticker }}</strong>
      · Risk-on <strong>{{ strategy()?.risk_on_ticker }}</strong>
      · Risk-off <strong>{{ strategy()?.risk_off_ticker }}</strong>
      · k = <strong>{{ strategy()?.k_threshold }}</strong>
    </p>
    <div class="hero__indicators">
      @for (i of strategy()?.indicators ?? []; track i.id) {
        <span class="chip">{{ i.name }}</span>
      }
    </div>
  </div>

  <div class="hero__actions">
    <a routerLink="/strategies" [queryParams]="{ edit: strategy()?.id }" class="btn btn--secondary btn--sm">
      <svg class="ico" width="14" height="14"><use href="#pencil"/></svg>
      Edit
    </a>
  </div>
</header>
```

KPI grid below the hero (use the markup from `12-strategy-detail.md` — wire `kpis()` computed from earlier).

## Empty backtest state

When backtest fails (`error()` set, e.g. "Insufficient data"), render a callout above the equity chart:

```html
<div class="callout callout--warn">
  <svg class="ico" width="16" height="16"><use href="#alert-circle"/></svg>
  <p>{{ error() }}</p>
</div>
```

(or `callout--danger` if it's a real error rather than data limitation).

## What NOT to change

- API contracts.
- The route definition.
- `signal-service`, `strategy-service` backend.

## Verification

```bash
cd /var/www/pessoal/ai-swing/frontend
npx ng build --configuration=development
```

Must succeed. Manual smoke (if backend is up):
- `/strategies/1` shows the new hero with breadcrumb, badges, KPI tiles.
- Both charts render and recolor on theme toggle.
- Insufficient-data strategies show the callout instead of empty charts.

## Definition of done

1. `strategy-detail.ts`, `backtest-panel.ts`, `signal-history-table.ts` rewritten.
2. KPI tiles populated from backtest metrics.
3. Charts use `chart-tokens.ts` + theme reactivity.
4. Build succeeds.
5. Print `TASK DONE: task-005-strategy-detail.md` at end.
