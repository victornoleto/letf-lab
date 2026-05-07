# Task 009 (v2) — Strategy detail: meta-bar + .section panel + 3-col metrics-grid + 2-chart grid + signal-history

**Goal:** Refactor `strategy-detail.ts` and `backtest-panel.ts` to match the Linear-DNA spec: breadcrumb, meta-bar with KPI labels (Benchmark / Risk-on / Risk-off / Status / Score), `.section` container around the Backtest block which contains a 3-column `.metrics-grid` (Estratégia | B&H Bench | B&H LETF) with diff cells per row + a 2-column `.charts-grid` below (equity + ratio), plus a Signal History `.section` with a table.

The KPI tile pattern from v1 is gone. Charts use the new ECharts option helpers from task 004.

## Pre-conditions

- Tasks 001-008 done.
- `_meta-bar.scss`, `_section.scss`, `_metric-card.scss`, `_charts-grid.scss`, `_breadcrumb.scss`, `_pill.scss` partials in place.
- `equity-options.ts`, `ratio-options.ts`, `chart-tokens.ts` (new shape with `readChartTokens`) exist.

## Sources

1. `design-export/layouts/12-strategy-detail.md` — full HTML + SCSS structure
2. `design-export/05-charts-echarts.md` §3 + §4 — equity + ratio option builders
3. `design-export/06-theme-toggle.md` §5 — `themechange` event listener pattern for charts

## Files to modify

### `frontend/src/app/pages/strategy-detail/backtest-panel.ts`

Replace markup and chart-init logic. New structure:

```ts
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy,
         computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, MarkLineComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { readChartTokens } from '../../shared/charts/chart-tokens';
import { equityOptions } from '../../shared/charts/equity-options';
import { ratioOptions } from '../../shared/charts/ratio-options';

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, CanvasRenderer]);

export interface EquityPoint { date: string; value: number; }
export interface BacktestMetrics {
  cagr: number; max_dd: number; sharpe: number;
  n_trades: number | null; hit_rate_vs_benchmark: number | null;
}
export interface BacktestResult {
  range_start: string; range_end: string; range_years: number; asof_date: string; cached: boolean;
  equity_strategy: EquityPoint[];
  equity_benchmark_buyhold: EquityPoint[];
  equity_riskon_buyhold: EquityPoint[];
  equity_ratio_vs_benchmark: EquityPoint[];
  metrics_strategy: BacktestMetrics;
  metrics_benchmark: BacktestMetrics;
  metrics_riskon: BacktestMetrics;
}

const RANGE_OPTIONS = [3, 5, 10, 20];

@Component({
  selector: 'app-backtest-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section">
      <header class="section__head">
        <div>
          <h3 class="section__title">Backtest</h3>
          @if (result()) {
            <p class="section__sub">
              {{ result()!.range_start }} → {{ result()!.range_end }}
              ({{ result()!.range_years }}y) · asof {{ result()!.asof_date }}
              @if (result()!.cached) { · cache hit } @else { · fresh }
            </p>
          }
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <div class="pills">
            @for (y of rangeOptions; track y) {
              <span class="pill" [class.pill--active]="range() === y" (click)="rangeChange.emit(y)">{{ y }}y</span>
            }
          </div>
          <button class="btn btn--sm" (click)="forceRerun.emit()" [disabled]="loading()">
            <svg class="ico" width="11" height="11" [class.spin]="loading()"><use href="#refresh"/></svg>
            @if (loading()) { Rodando… } @else { Rerun }
          </button>
        </div>
      </header>

      @if (error()) {
        <div class="error-state">
          <svg class="error-state__icon" width="20" height="20"><use href="#alert-circle"/></svg>
          <div class="error-state__title">Erro ao rodar backtest</div>
          <div class="error-state__copy mono">{{ error() }}</div>
        </div>
      } @else if (result()) {
        <div class="metrics-grid">
          <div class="metric-card metric-card--highlight">
            <div class="metric-card__title">Estratégia</div>
            <div class="metric-card__rows">
              <div class="metric-row"><span class="metric-row__k">CAGR</span>
                <span class="metric-row__v">{{ pct(result()!.metrics_strategy.cagr) }}</span>
                <span class="metric-row__diff" [ngClass]="diffCls(result()!.metrics_strategy.cagr - result()!.metrics_benchmark.cagr)">
                  {{ pp(result()!.metrics_strategy.cagr - result()!.metrics_benchmark.cagr) }}
                </span>
              </div>
              <div class="metric-row"><span class="metric-row__k">MaxDD</span>
                <span class="metric-row__v">{{ pct(result()!.metrics_strategy.max_dd) }}</span>
                <span class="metric-row__diff" [ngClass]="diffCls(result()!.metrics_strategy.max_dd - result()!.metrics_benchmark.max_dd)">
                  {{ pp(result()!.metrics_strategy.max_dd - result()!.metrics_benchmark.max_dd) }}
                </span>
              </div>
              <div class="metric-row"><span class="metric-row__k">Sharpe</span>
                <span class="metric-row__v">{{ num(result()!.metrics_strategy.sharpe) }}</span>
                <span class="metric-row__diff" [ngClass]="diffCls(result()!.metrics_strategy.sharpe - result()!.metrics_benchmark.sharpe)">
                  {{ ptNum(result()!.metrics_strategy.sharpe - result()!.metrics_benchmark.sharpe) }}
                </span>
              </div>
              @if (result()!.metrics_strategy.n_trades != null) {
                <div class="metric-row"><span class="metric-row__k">Trades</span>
                  <span class="metric-row__v">{{ result()!.metrics_strategy.n_trades }}</span><span></span></div>
              }
              @if (result()!.metrics_strategy.hit_rate_vs_benchmark != null) {
                <div class="metric-row"><span class="metric-row__k">Hit vs B&H</span>
                  <span class="metric-row__v">{{ pct(result()!.metrics_strategy.hit_rate_vs_benchmark!) }}</span><span></span></div>
              }
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-card__title">Buy & Hold benchmark</div>
            <div class="metric-card__rows">
              <div class="metric-row"><span class="metric-row__k">CAGR</span><span class="metric-row__v">{{ pct(result()!.metrics_benchmark.cagr) }}</span><span></span></div>
              <div class="metric-row"><span class="metric-row__k">MaxDD</span><span class="metric-row__v">{{ pct(result()!.metrics_benchmark.max_dd) }}</span><span></span></div>
              <div class="metric-row"><span class="metric-row__k">Sharpe</span><span class="metric-row__v">{{ num(result()!.metrics_benchmark.sharpe) }}</span><span></span></div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-card__title">Buy & Hold LETF</div>
            <div class="metric-card__rows">
              <div class="metric-row"><span class="metric-row__k">CAGR</span><span class="metric-row__v">{{ pct(result()!.metrics_riskon.cagr) }}</span><span></span></div>
              <div class="metric-row"><span class="metric-row__k">MaxDD</span><span class="metric-row__v">{{ pct(result()!.metrics_riskon.max_dd) }}</span><span></span></div>
              <div class="metric-row"><span class="metric-row__k">Sharpe</span><span class="metric-row__v">{{ num(result()!.metrics_riskon.sharpe) }}</span><span></span></div>
            </div>
          </div>
        </div>

        <div class="charts-grid">
          <div class="chart-cell">
            <div class="chart-cap">Equity curve · Estratégia vs Buy & Hold benchmark</div>
            <div #equityHost style="height: 240px;"></div>
          </div>
          <div class="chart-cell">
            <div class="chart-cap">Razão Estratégia / Benchmark · paridade em 1.0×</div>
            <div #ratioHost style="height: 240px;"></div>
          </div>
        </div>
      }
    </section>
  `,
})
export class BacktestPanelComponent implements AfterViewInit, OnDestroy {
  result  = input<BacktestResult | null>(null);
  range   = input<number>(10);
  loading = input<boolean>(false);
  error   = input<string | null>(null);

  rangeChange = output<number>();
  forceRerun  = output<void>();

  rangeOptions = RANGE_OPTIONS;

  private equityHost = viewChild.required<ElementRef<HTMLDivElement>>('equityHost');
  private ratioHost  = viewChild.required<ElementRef<HTMLDivElement>>('ratioHost');
  private equityChart?: echarts.ECharts;
  private ratioChart?: echarts.ECharts;
  private ro?: ResizeObserver;
  private themeListener = () => this.redraw();

  ngAfterViewInit(): void {
    this.equityChart = echarts.init(this.equityHost().nativeElement);
    this.ratioChart  = echarts.init(this.ratioHost().nativeElement);
    this.ro = new ResizeObserver(() => { this.equityChart?.resize(); this.ratioChart?.resize(); });
    this.ro.observe(this.equityHost().nativeElement);
    this.ro.observe(this.ratioHost().nativeElement);
    document.addEventListener('themechange', this.themeListener);
    effect(() => { this.result(); this.redraw(); }, { allowSignalWrites: true } as any);
  }

  ngOnDestroy(): void {
    this.ro?.disconnect();
    this.equityChart?.dispose();
    this.ratioChart?.dispose();
    document.removeEventListener('themechange', this.themeListener);
  }

  private redraw(): void {
    const r = this.result();
    if (!r || !this.equityChart || !this.ratioChart) return;
    const t = readChartTokens();

    const equityData = r.equity_strategy.map((p, i) => ({
      date: p.date,
      equity: p.value,
      bench: r.equity_benchmark_buyhold[i]?.value ?? p.value,
    }));
    const ratioData = r.equity_ratio_vs_benchmark.map(p => ({ date: p.date, ratio: p.value }));

    this.equityChart.setOption(equityOptions(equityData, t), true);
    this.ratioChart.setOption(ratioOptions(ratioData, t), true);
  }

  pct(v: number): string { return (v * 100).toFixed(2) + '%'; }
  pp(v: number): string  { return (v >= 0 ? '+' : '') + (v * 100).toFixed(2) + 'pp'; }
  num(v: number): string { return v.toFixed(2); }
  ptNum(v: number): string { return (v >= 0 ? '+' : '') + v.toFixed(2); }

  diffCls(v: number): string {
    if (v > 0)  return 'metric-row__diff--pos';
    if (v < 0)  return 'metric-row__diff--neg';
    return '';
  }
}
```

Notes:
- Two ECharts instances re-init on `themechange`.
- The ratio chart input format expects `{date, ratio}` — adapt the API field `equity_ratio_vs_benchmark` to that shape.
- For MaxDD diff: more negative is worse. The current diff sign logic (strategy - benchmark) gives a positive number when strategy DD is shallower than benchmark DD (i.e., better). That matches the spec.
- Signs of CAGR and Sharpe diffs are direct.

### `frontend/src/app/pages/strategy-detail/strategy-detail.ts`

Refactor markup. Hero replaced by breadcrumb + page-h1 + meta-bar.

```html
<div class="page page--detail">
  <nav class="breadcrumb">
    <a routerLink="/dashboard" class="breadcrumb__back">← Dashboard</a>
    <svg class="ico" width="12" height="12"><use href="#chevron-right"/></svg>
    <a routerLink="/strategies" class="breadcrumb__back">Estratégias</a>
  </nav>

  @if (loading()) {
    <div class="skeleton skeleton--title"></div>
    <div class="skeleton skeleton--card" style="height: 80px; margin-top: 12px;"></div>
    <div class="skeleton skeleton--card" style="height: 320px; margin-top: 12px;"></div>
  } @else if (!strategy()) {
    <div class="empty">
      <svg class="empty__icon" width="24" height="24"><use href="#alert-circle"/></svg>
      <div class="empty__title">Estratégia não encontrada</div>
      <a routerLink="/dashboard" class="btn btn--primary">Voltar ao Dashboard</a>
    </div>
  } @else {
    <header style="display:flex; align-items:flex-end; justify-content:space-between; padding-bottom:8px; border-bottom: 1px solid var(--border);">
      <h1 class="page-h1">{{ strategy()!.name }}</h1>
      <a [routerLink]="['/strategies', strategy()!.id, 'edit']" class="btn btn--sm">
        <svg class="ico" width="12" height="12"><use href="#pencil"/></svg>
        Editar
      </a>
    </header>

    <div class="meta-bar">
      <div>
        <div class="label">Benchmark</div>
        <div class="val">{{ strategy()!.benchmark_ticker }}</div>
      </div>
      <div>
        <div class="label">Risk-on</div>
        <div class="val val--success">{{ strategy()!.risk_on_ticker }}</div>
      </div>
      <div>
        <div class="label">Risk-off</div>
        <div class="val val--danger">{{ strategy()!.risk_off_ticker }}</div>
      </div>
      <div>
        <div class="label">Status</div>
        <div class="val" [ngClass]="statusClass()">{{ statusLabel() }}</div>
      </div>
      <div>
        <div class="label">Score</div>
        <div class="val">{{ strategy()!.current_signal?.score ?? '—' }}/{{ strategy()!.current_signal?.total ?? '—' }}
          <span style="font-size: 11px; color: var(--text-muted); margin-left: 4px;">k≥{{ strategy()!.k_threshold }}</span>
        </div>
      </div>
    </div>

    <app-backtest-panel
      [result]="backtest()"
      [range]="range()"
      [loading]="backtestLoading()"
      [error]="backtestError()"
      (rangeChange)="onRangeChange($event)"
      (forceRerun)="loadBacktest(true)"
    />

    <app-signal-history-table [strategyId]="strategy()!.id" />
  }
</div>
```

The `strategy-detail.ts` class keeps the existing logic for fetching strategy + backtest. Update:
- Replace `kpis = computed(...)` with status helpers (`statusLabel`, `statusClass`) — KPIs now live in backtest-panel only.
- Keep `loadBacktest()`, `onRangeChange()`.
- Wire breadcrumbs to `routerLink`.

### `frontend/src/app/pages/strategy-detail/signal-history-table.ts`

Wrap the table in a `.section` with a header + range selector. Uses `.table-wrap` + `.table` markup.

```html
<section class="section" style="margin-top: 12px;">
  <header class="section__head">
    <div>
      <h3 class="section__title">Signal history</h3>
      <p class="section__sub">{{ snapshots().length }} snapshots · range {{ range() }}</p>
    </div>
    <div class="pills">
      @for (r of ranges; track r) {
        <span class="pill" [class.pill--active]="range() === r" (click)="setRange(r)">{{ r }}</span>
      }
    </div>
  </header>

  @if (snapshots().length === 0) {
    <div class="empty" style="padding: 32px 16px;">
      <div class="empty__title">Sem histórico ainda</div>
      <div class="empty__copy">Será populado pelo cron diário (22h ET) ou ao usar refresh manual.</div>
    </div>
  } @else {
    <div class="table-wrap" style="border: none; border-radius: 0;">
      <table class="table">
        <thead><tr><th>Data</th><th>Score</th><th>Estado</th>
          @for (col of indicatorColumns(); track col) { <th>{{ col }}</th> }
        </tr></thead>
        <tbody>
          @for (s of snapshotsDesc(); track s.date) {
            <tr>
              <td class="mono">{{ s.date }}</td>
              <td class="mono">{{ s.score }}/{{ s.total }}</td>
              <td><span class="status-cell" [ngClass]="s.risk_on ? 'status-cell--on' : 'status-cell--off'">
                {{ s.risk_on ? 'on' : 'off' }}
              </span></td>
              @for (col of indicatorColumns(); track col) {
                <td style="text-align: center;">
                  @let r = findResult(s, col);
                  @if (r) {
                    <svg class="ico" width="14" height="14" [style.color]="r.gate_passed ? 'var(--success)' : 'var(--danger)'">
                      <use [attr.href]="r.gate_passed ? '#check' : '#x'"/>
                    </svg>
                  } @else { <span style="color: var(--text-muted);">—</span> }
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

Range options change to `'1m' | '3m' | '6m' | '1y' | 'max'`.

## Verification

```bash
cd /var/www/pessoal/ai-swing/frontend
npx ng build --configuration=development
```

Manual smoke (with backend up):
- `/strategies/1` shows breadcrumb + page-h1 + meta-bar + Backtest section.
- Backtest section: 3 metric-cards lined up (Estratégia highlighted with green border-left), pills 3y/5y/10y/20y, two charts in a 2-column grid.
- Toggling theme re-renders both charts (`themechange` event).
- Signal history shows below.

## Definition of done

1. `backtest-panel.ts` uses the new `equityOptions`/`ratioOptions` + `readChartTokens()` + `themechange` listener.
2. `strategy-detail.ts` has breadcrumb + meta-bar (NOT KPI tiles).
3. `signal-history-table.ts` uses `.section` + `.table-wrap`.
4. Build passes.
5. Print `TASK DONE: task-009-strategy-detail-redo.md` at end.
