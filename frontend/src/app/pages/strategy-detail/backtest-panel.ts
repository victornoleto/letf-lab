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
              <div class="metric-row">
                <span class="metric-row__k">CAGR</span>
                <span class="metric-row__v">{{ pct(result()!.metrics_strategy.cagr) }}</span>
                <span
                  class="metric-row__diff"
                  [ngClass]="diffCls(result()!.metrics_strategy.cagr - result()!.metrics_benchmark.cagr)"
                >{{ pp(result()!.metrics_strategy.cagr - result()!.metrics_benchmark.cagr) }}</span>
              </div>
              <div class="metric-row">
                <span class="metric-row__k">MaxDD</span>
                <span class="metric-row__v">{{ pct(result()!.metrics_strategy.max_dd) }}</span>
                <span
                  class="metric-row__diff"
                  [ngClass]="diffCls(result()!.metrics_strategy.max_dd - result()!.metrics_benchmark.max_dd)"
                >{{ pp(result()!.metrics_strategy.max_dd - result()!.metrics_benchmark.max_dd) }}</span>
              </div>
              <div class="metric-row">
                <span class="metric-row__k">Sharpe</span>
                <span class="metric-row__v">{{ num(result()!.metrics_strategy.sharpe) }}</span>
                <span
                  class="metric-row__diff"
                  [ngClass]="diffCls(result()!.metrics_strategy.sharpe - result()!.metrics_benchmark.sharpe)"
                >{{ ptNum(result()!.metrics_strategy.sharpe - result()!.metrics_benchmark.sharpe) }}</span>
              </div>
              @if (result()!.metrics_strategy.n_trades != null) {
                <div class="metric-row">
                  <span class="metric-row__k">Trades</span>
                  <span class="metric-row__v">{{ result()!.metrics_strategy.n_trades }}</span>
                  <span></span>
                </div>
              }
              @if (result()!.metrics_strategy.hit_rate_vs_benchmark != null) {
                <div class="metric-row">
                  <span class="metric-row__k">Hit vs B&amp;H</span>
                  <span class="metric-row__v">{{ pct(result()!.metrics_strategy.hit_rate_vs_benchmark!) }}</span>
                  <span></span>
                </div>
              }
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-card__title">Buy &amp; Hold benchmark</div>
            <div class="metric-card__rows">
              <div class="metric-row">
                <span class="metric-row__k">CAGR</span>
                <span class="metric-row__v">{{ pct(result()!.metrics_benchmark.cagr) }}</span>
                <span></span>
              </div>
              <div class="metric-row">
                <span class="metric-row__k">MaxDD</span>
                <span class="metric-row__v">{{ pct(result()!.metrics_benchmark.max_dd) }}</span>
                <span></span>
              </div>
              <div class="metric-row">
                <span class="metric-row__k">Sharpe</span>
                <span class="metric-row__v">{{ num(result()!.metrics_benchmark.sharpe) }}</span>
                <span></span>
              </div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-card__title">Buy &amp; Hold LETF</div>
            <div class="metric-card__rows">
              <div class="metric-row">
                <span class="metric-row__k">CAGR</span>
                <span class="metric-row__v">{{ pct(result()!.metrics_riskon.cagr) }}</span>
                <span></span>
              </div>
              <div class="metric-row">
                <span class="metric-row__k">MaxDD</span>
                <span class="metric-row__v">{{ pct(result()!.metrics_riskon.max_dd) }}</span>
                <span></span>
              </div>
              <div class="metric-row">
                <span class="metric-row__k">Sharpe</span>
                <span class="metric-row__v">{{ num(result()!.metrics_riskon.sharpe) }}</span>
                <span></span>
              </div>
            </div>
          </div>
        </div>

        <div class="charts-grid">
          <div class="chart-cell">
            <div class="chart-cap">Equity curve · Estratégia vs Buy &amp; Hold benchmark</div>
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
  pp(v: number): string {
    return (v >= 0 ? '+' : '') + (v * 100).toFixed(2) + 'pp';
  }
  num(v: number): string {
    return v.toFixed(2);
  }
  ptNum(v: number): string {
    return (v >= 0 ? '+' : '') + v.toFixed(2);
  }

  diffCls(v: number): string {
    if (v > 0) return 'metric-row__diff--pos';
    if (v < 0) return 'metric-row__diff--neg';
    return '';
  }
}
