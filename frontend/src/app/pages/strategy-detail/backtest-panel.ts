import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  DataZoomComponent,
  AxisPointerComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { readChartTokens } from '../../shared/charts/chart-tokens';
import { equityOptions } from '../../shared/charts/equity-options';
import { ratioOptions } from '../../shared/charts/ratio-options';

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  DataZoomComponent,
  AxisPointerComponent,
  CanvasRenderer,
]);

export interface EquityPoint {
  date: string;
  value: number;
}

export interface BacktestMetrics {
  cagr: number;
  max_dd: number;
  sortino: number;
  n_trades: number | null;
  hit_rate_vs_benchmark: number | null;
  cagr_net: number | null;
  sortino_net: number | null;
  tax_drag_pp: number | null;
}

export interface BacktestTransition {
  date: string;
  from_state: boolean;
  to_state: boolean;
}

export interface BacktestResult {
  range_start: string;
  range_end: string;
  range_years: number;
  asof_date: string;
  cached: boolean;
  equity_strategy: EquityPoint[];
  equity_strategy_net: EquityPoint[];
  equity_benchmark_buyhold: EquityPoint[];
  equity_riskon_buyhold: EquityPoint[];
  equity_ratio_vs_benchmark: EquityPoint[];
  metrics_strategy: BacktestMetrics;
  metrics_benchmark: BacktestMetrics;
  metrics_riskon: BacktestMetrics;
  transitions: BacktestTransition[];
}

const RANGE_OPTIONS = [3, 5, 10, 20];
const CHART_GROUP = 'backtest-charts';

interface PerfRow {
  label: string;
  cls: string;
  cagr: number;
  max_dd: number;
  sortino: number;
}

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
          <button class="btn btn--sm btn--ghost"
                  [class.btn--active]="showNet()"
                  (click)="toggleNet()"
                  title="Applies annual DARF under Law 14.754 (15% on realized gains)">
            Net
          </button>
          <div class="pills">
            @for (y of rangeOptions; track y) {
              <span
                class="pill"
                [class.pill--active]="range() === y"
                (click)="rangeChange.emit(y)"
              >{{ y }}y</span>
            }
          </div>
          <button class="btn btn--sm" (click)="forceRerun.emit()" [disabled]="loading()">
            <svg class="ico" width="11" height="11" [class.spin]="loading()"><use href="#refresh"/></svg>
             @if (loading()) { Running... } @else { Rerun }
          </button>
        </div>
      </header>

      @if (error()) {
        <div class="section__body">
          <div class="error-state">
            <svg class="error-state__icon" width="20" height="20"><use href="#alert-circle"/></svg>
             <div class="error-state__title">Failed to run backtest</div>
            <div class="error-state__copy mono">{{ error() }}</div>
          </div>
        </div>
      } @else if (result()) {
        <div class="section__body">
          <div class="table-wrap perf-table-wrap">
            <table class="table perf-table">
              <thead>
                <tr>
                  <th class="th--num">#</th>
                  <th>Comparison</th>
                  <th class="th--num">CAGR</th>
                  <th class="th--num">Max. DD</th>
                  <th class="th--num">Sortino</th>
                </tr>
              </thead>
              <tbody>
                @for (row of perfRows(); track row.label; let i = $index) {
                  <tr [class.perf-table__row--strategy]="i === 0">
                    <td class="td--num mono">{{ i + 1 }}</td>
                    <td>
                      <span class="perf-table__label" [ngClass]="row.cls">{{ row.label }}</span>
                    </td>
                    <td class="td--num mono" [ngClass]="numCls(row.cagr)">{{ pct(row.cagr) }}</td>
                    <td class="td--num mono" [ngClass]="numCls(row.max_dd)">{{ pct(row.max_dd) }}</td>
                    <td class="td--num mono">{{ num(row.sortino) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="charts-grid">
            <div class="chart-cell">
              <div class="chart-cap">Equity curve · Strategy vs Buy &amp; Hold benchmark</div>
              <div #equityHost style="height: 280px;"></div>
            </div>
            <div class="chart-cell">
              <div class="chart-cap">Strategy / benchmark ratio · parity at 1.0×</div>
              <div #ratioHost style="height: 280px;"></div>
            </div>
          </div>
        </div>

        <div class="section__foot">
          @if (result()!.metrics_strategy.n_trades != null) {
            <span class="perf-footnote">
              <span class="perf-footnote__k">Trades</span>
              <span class="mono">{{ result()!.metrics_strategy.n_trades }}</span>
            </span>
          }
          @if (result()!.metrics_strategy.hit_rate_vs_benchmark != null) {
            <span class="perf-footnote">
              <span class="perf-footnote__k">Hit vs B&amp;H</span>
              <span class="mono">{{ pct(result()!.metrics_strategy.hit_rate_vs_benchmark!) }}</span>
            </span>
          }
          @if (showNet() && result()!.metrics_strategy.tax_drag_pp != null) {
            <span class="perf-footnote">
              <span class="perf-footnote__k">Tax drag</span>
              <span class="mono num--neg">−{{ num(result()!.metrics_strategy.tax_drag_pp!) }} Sortino</span>
            </span>
          }
          <span class="perf-footnote perf-footnote--hint">
            scroll = zoom · drag the slider below the charts to adjust the window · cursor synchronized across charts
          </span>
        </div>
      }
    </section>
  `,
  styles: [`
    .perf-table th, .perf-table td { white-space: nowrap; }
    .perf-table .th--num, .perf-table .td--num { text-align: right; }
    .perf-table__row--strategy td { background: var(--surface-muted); }
    .perf-table__label { font-weight: var(--fw-medium); }
    .perf-table__label--strategy { color: var(--text-primary); }
    .perf-table__label--benchmark { color: var(--text-secondary); }
    .perf-table__label--letf { color: var(--text-secondary); }

    .perf-footnote { display: inline-flex; align-items: center; gap: 6px; }
    .perf-footnote__k {
      color: var(--text-muted);
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .perf-footnote--hint {
      margin-left: auto;
      color: var(--text-muted);
      font-style: italic;
    }
    .num--pos { color: var(--success); }
    .num--neg { color: var(--danger); }
  `],
})
export class BacktestPanelComponent implements OnInit, OnDestroy {
  result = input<BacktestResult | null>(null);
  range = input<number>(10);
  loading = input<boolean>(false);
  error = input<string | null>(null);

  rangeChange = output<number>();
  forceRerun = output<void>();

  rangeOptions = RANGE_OPTIONS;
  showNet = signal(false);

  toggleNet(): void {
    this.showNet.update((v) => !v);
    this.redraw();
  }

  private injector = inject(Injector);
  private equityHost = viewChild<ElementRef<HTMLDivElement>>('equityHost');
  private ratioHost = viewChild<ElementRef<HTMLDivElement>>('ratioHost');
  private equityChart?: echarts.ECharts;
  private ratioChart?: echarts.ECharts;
  private ro?: ResizeObserver;
  private themeListener = () => this.redraw();

  ngOnInit(): void {
    effect(
      () => {
        const eHost = this.equityHost()?.nativeElement;
        const rHost = this.ratioHost()?.nativeElement;
        const r = this.result();

        if (!eHost || !rHost) {
          this.disposeCharts();
          return;
        }
        if (!this.equityChart) {
          this.equityChart = echarts.init(eHost);
          this.ratioChart = echarts.init(rHost);
          this.equityChart.group = CHART_GROUP;
          this.ratioChart.group = CHART_GROUP;
          echarts.connect(CHART_GROUP);
          this.ro = new ResizeObserver(() => {
            this.equityChart?.resize();
            this.ratioChart?.resize();
          });
          this.ro.observe(eHost);
          this.ro.observe(rHost);
        }
        if (r) this.redraw();
      },
      { injector: this.injector },
    );

    document.addEventListener('themechange', this.themeListener);
  }

  ngOnDestroy(): void {
    document.removeEventListener('themechange', this.themeListener);
    this.disposeCharts();
  }

  perfRows(): PerfRow[] {
    const r = this.result();
    if (!r) return [];
    const rows: PerfRow[] = [
      {
        label: 'Strategy',
        cls: 'perf-table__label--strategy',
        cagr: r.metrics_strategy.cagr,
        max_dd: r.metrics_strategy.max_dd,
        sortino: r.metrics_strategy.sortino,
      },
    ];
    if (this.showNet()
        && r.metrics_strategy.cagr_net != null
        && r.metrics_strategy.sortino_net != null) {
      rows.push({
        label: 'Strategy · Net',
        cls: 'perf-table__label--strategy-net',
        cagr: r.metrics_strategy.cagr_net,
        max_dd: r.metrics_strategy.max_dd,  // MaxDD is structural, ~unchanged
        sortino: r.metrics_strategy.sortino_net,
      });
    }
    rows.push(
      {
        label: 'Benchmark',
        cls: 'perf-table__label--benchmark',
        cagr: r.metrics_benchmark.cagr,
        max_dd: r.metrics_benchmark.max_dd,
        sortino: r.metrics_benchmark.sortino,
      },
      {
        label: 'LETF',
        cls: 'perf-table__label--letf',
        cagr: r.metrics_riskon.cagr,
        max_dd: r.metrics_riskon.max_dd,
        sortino: r.metrics_riskon.sortino,
      },
    );
    return rows;
  }

  private disposeCharts(): void {
    this.ro?.disconnect();
    this.ro = undefined;
    this.equityChart?.dispose();
    this.equityChart = undefined;
    this.ratioChart?.dispose();
    this.ratioChart = undefined;
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
    const ratioData = r.equity_ratio_vs_benchmark.map((p) => ({
      date: p.date,
      ratio: p.value,
    }));

    this.equityChart.setOption(equityOptions(equityData, t), true);
    this.ratioChart.setOption(ratioOptions(ratioData, t), true);
  }

  pct(v: number): string {
    return (v * 100).toFixed(2) + '%';
  }
  num(v: number): string {
    return v.toFixed(2);
  }
  numCls(v: number): string {
    if (v > 0) return 'num--pos';
    if (v < 0) return 'num--neg';
    return '';
  }
}
