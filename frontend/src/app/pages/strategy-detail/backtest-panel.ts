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
  sharpe: number;
  n_trades: number | null;
  hit_rate_vs_benchmark: number | null;
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
  sharpe: number;
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
            @if (loading()) { Rodando… } @else { Rerun }
          </button>
        </div>
      </header>

      @if (error()) {
        <div class="section__body">
          <div class="error-state">
            <svg class="error-state__icon" width="20" height="20"><use href="#alert-circle"/></svg>
            <div class="error-state__title">Erro ao rodar backtest</div>
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
                  <th>Comparativo</th>
                  <th class="th--num">CAGR</th>
                  <th class="th--num">Max. DD</th>
                  <th class="th--num">Sharpe</th>
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
                    <td class="td--num mono">{{ num(row.sharpe) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="charts-grid">
            <div class="chart-cell">
              <div class="chart-cap">Equity curve · Estratégia vs Buy &amp; Hold benchmark</div>
              <div #equityHost style="height: 280px;"></div>
            </div>
            <div class="chart-cell">
              <div class="chart-cap">Razão Estratégia / Benchmark · paridade em 1.0×</div>
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
          <span class="perf-footnote perf-footnote--hint">
            scroll = zoom · arraste o slider abaixo dos charts para ajustar a janela · cursor sincronizado entre charts
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
    return [
      {
        label: 'Estratégia',
        cls: 'perf-table__label--strategy',
        cagr: r.metrics_strategy.cagr,
        max_dd: r.metrics_strategy.max_dd,
        sharpe: r.metrics_strategy.sharpe,
      },
      {
        label: 'Benchmark',
        cls: 'perf-table__label--benchmark',
        cagr: r.metrics_benchmark.cagr,
        max_dd: r.metrics_benchmark.max_dd,
        sharpe: r.metrics_benchmark.sharpe,
      },
      {
        label: 'LETF',
        cls: 'perf-table__label--letf',
        cagr: r.metrics_riskon.cagr,
        max_dd: r.metrics_riskon.max_dd,
        sharpe: r.metrics_riskon.sharpe,
      },
    ];
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
