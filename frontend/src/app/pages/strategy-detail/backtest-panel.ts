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
import { readChartTokens, tok } from '../../shared/charts/chart-tokens';
import { axisTooltipFormatter } from '../../shared/charts/tooltip-formatter';

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
  equity_benchmark_buyhold: EquityPoint[];
  metrics_benchmark: BacktestMetrics;
  transitions: BacktestTransition[];
  variants: BacktestVariant[];
}

export interface BacktestVariant {
  risk_on_ticker: string;
  equity_strategy: EquityPoint[];
  equity_strategy_net: EquityPoint[];
  equity_riskon_buyhold: EquityPoint[];
  equity_ratio_vs_benchmark: EquityPoint[];
  metrics_strategy: BacktestMetrics;
  metrics_riskon: BacktestMetrics;
}

const RANGE_OPTIONS = [3, 5, 10, 20];
const CHART_GROUP = 'backtest-charts';

interface PerfRow {
  order: number;
  label: string;
  cls: string;
  color: string;
  cagr: number;
  max_dd: number;
  sortino: number;
}

type PerfSortKey = 'order' | 'label' | 'cagr' | 'max_dd' | 'sortino';
type SortDir = 'asc' | 'desc';

const RISK_ON_COLORS = [
  '#60a5fa', // soft blue
  '#f87171', // soft red
  '#fb923c', // orange
  '#f472b6', // pink
  '#a78bfa', // violet
  '#34d399', // emerald
];

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
                  <th class="th--num">
                    <button type="button" class="sort-head sort-head--num" (click)="setPerfSort('order')">
                      # <span>{{ sortMark('order') }}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" class="sort-head" (click)="setPerfSort('label')">
                      Comparison <span>{{ sortMark('label') }}</span>
                    </button>
                  </th>
                  <th class="th--num">
                    <button type="button" class="sort-head sort-head--num" (click)="setPerfSort('cagr')">
                      CAGR <span>{{ sortMark('cagr') }}</span>
                    </button>
                  </th>
                  <th class="th--num">
                    <button type="button" class="sort-head sort-head--num" (click)="setPerfSort('max_dd')">
                      Max. DD <span>{{ sortMark('max_dd') }}</span>
                    </button>
                  </th>
                  <th class="th--num">
                    <button type="button" class="sort-head sort-head--num" (click)="setPerfSort('sortino')">
                      Sortino <span>{{ sortMark('sortino') }}</span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (row of perfRows(); track row.label; let i = $index) {
                  <tr [class.perf-table__row--strategy]="i === 0">
                    <td class="td--num mono">{{ row.order }}</td>
                    <td>
                      <span class="perf-table__label" [ngClass]="row.cls" [style.color]="row.color">
                        {{ row.label }}
                      </span>
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
          @if (primaryVariant()?.metrics_strategy?.n_trades != null) {
            <span class="perf-footnote">
              <span class="perf-footnote__k">Trades</span>
              <span class="mono">{{ primaryVariant()!.metrics_strategy.n_trades }}</span>
            </span>
          }
          @if (primaryVariant()?.metrics_strategy?.hit_rate_vs_benchmark != null) {
            <span class="perf-footnote">
              <span class="perf-footnote__k">Hit vs B&amp;H</span>
              <span class="mono">{{ pct(primaryVariant()!.metrics_strategy.hit_rate_vs_benchmark!) }}</span>
            </span>
          }
          @if (showNet() && primaryVariant()?.metrics_strategy?.tax_drag_pp != null) {
            <span class="perf-footnote">
              <span class="perf-footnote__k">Tax drag</span>
              <span class="mono num--neg">−{{ num(primaryVariant()!.metrics_strategy.tax_drag_pp!) }} Sortino</span>
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
    .perf-table .th--num, .perf-table .td--num { text-align: left; }
    .perf-table__row--strategy td { background: var(--surface-muted); }
    .perf-table__label { font-weight: var(--fw-medium); }
    .perf-table__label--strategy { color: var(--text-primary); }
    .perf-table__label--benchmark { color: var(--text-secondary); }
    .perf-table__label--letf { color: var(--text-secondary); }
    .sort-head {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      width: 100%;
      padding: 0;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
      text-align: left;
    }
    .sort-head--num { justify-content: flex-start; text-align: left; }
    .sort-head span {
      min-width: 8px;
      color: var(--text-muted);
      font-size: 10px;
    }

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
  perfSort = signal<{ key: PerfSortKey; dir: SortDir }>({ key: 'cagr', dir: 'desc' });

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
    const rows: PerfRow[] = [];
    let order = 1;
    for (const [i, v] of r.variants.entries()) {
      const color = this.riskOnColor(i);
      rows.push({
        order: order++,
        label: `Strategy · ${v.risk_on_ticker}`,
        cls: 'perf-table__label--strategy',
        color,
        cagr: v.metrics_strategy.cagr,
        max_dd: v.metrics_strategy.max_dd,
        sortino: v.metrics_strategy.sortino,
      });
      if (this.showNet()
          && v.metrics_strategy.cagr_net != null
          && v.metrics_strategy.sortino_net != null) {
        rows.push({
          order: order++,
          label: `Strategy · ${v.risk_on_ticker} · Net`,
          cls: 'perf-table__label--strategy-net',
          color,
          cagr: v.metrics_strategy.cagr_net,
          max_dd: v.metrics_strategy.max_dd,
          sortino: v.metrics_strategy.sortino_net,
        });
      }
      rows.push({
        order: order++,
        label: `B&H · ${v.risk_on_ticker}`,
        cls: 'perf-table__label--letf',
        color,
        cagr: v.metrics_riskon.cagr,
        max_dd: v.metrics_riskon.max_dd,
        sortino: v.metrics_riskon.sortino,
      });
    }
    rows.push({
      order: order++,
      label: 'Benchmark',
      cls: 'perf-table__label--benchmark',
      color: 'var(--text-secondary)',
      cagr: r.metrics_benchmark.cagr,
      max_dd: r.metrics_benchmark.max_dd,
      sortino: r.metrics_benchmark.sortino,
    });
    return this.sortedPerfRows(rows);
  }

  setPerfSort(key: PerfSortKey): void {
    this.perfSort.update((current) => ({
      key,
      dir: current.key === key && current.dir === 'desc' ? 'asc' : 'desc',
    }));
  }

  sortMark(key: PerfSortKey): string {
    const sort = this.perfSort();
    if (sort.key !== key) return '';
    return sort.dir === 'desc' ? '↓' : '↑';
  }

  private sortedPerfRows(rows: PerfRow[]): PerfRow[] {
    const { key, dir } = this.perfSort();
    const factor = dir === 'desc' ? -1 : 1;
    return [...rows].sort((a, b) => {
      const result = key === 'label'
        ? a.label.localeCompare(b.label)
        : a[key] - b[key];
      return result === 0 ? a.order - b.order : result * factor;
    });
  }

  primaryVariant(): BacktestVariant | null {
    return this.result()?.variants[0] ?? null;
  }

  private riskOnColor(index: number): string {
    return RISK_ON_COLORS[index % RISK_ON_COLORS.length];
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

    const baseChart = {
      grid: { left: 4, right: 8, top: 28, bottom: 48, containLabel: true },
      animation: false,
      textStyle: { fontFamily: t.fontMono, fontSize: 11, color: t.textMuted },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: t.border } },
        axisTick: { show: false },
        axisLabel: { color: t.textMuted, fontSize: 10, hideOverlap: true },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        position: 'right',
        scale: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: t.textMuted, fontSize: 10, formatter: (v: number) => `${v}%` },
        splitLine: { lineStyle: { color: t.grid, type: [3, 3] } },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: tok('--surface-elevated'),
        borderColor: t.border,
        borderWidth: 1,
        padding: [10, 12],
        textStyle: { color: t.textPrimary, fontSize: 12, fontFamily: t.fontMono },
        axisPointer: { lineStyle: { color: t.border, width: 1, type: 'solid' } },
        formatter: axisTooltipFormatter(),
      },
      legend: {
        top: 0, left: 0,
        itemWidth: 14, itemHeight: 2, itemGap: 16,
        textStyle: { color: t.textMuted, fontSize: 11, fontFamily: tok('--font-sans') },
      },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0, zoomOnMouseWheel: true, moveOnMouseMove: true, moveOnMouseWheel: false },
        {
          type: 'slider', xAxisIndex: 0, height: 18, bottom: 4, borderColor: 'transparent',
          backgroundColor: 'transparent', fillerColor: tok('--surface-muted'), handleSize: '70%',
          handleStyle: { color: t.equity, borderColor: t.equity }, moveHandleStyle: { color: t.border },
          textStyle: { color: t.textMuted, fontSize: 10 },
          labelFormatter: (_v: number, str: string) => (str ? str.slice(0, 7) : ''),
        },
      ],
    };

    const equitySeries: any[] = [{
      name: 'Benchmark', type: 'line', showSymbol: false, smooth: false,
      lineStyle: { color: t.textMuted, width: 1, type: [4, 3] },
      data: r.equity_benchmark_buyhold.map((p) => [p.date, p.value]),
    }];
    for (const [i, v] of r.variants.entries()) {
      const color = this.riskOnColor(i);
      equitySeries.push({
        name: `Strategy ${v.risk_on_ticker}`, type: 'line', showSymbol: false, smooth: false,
        lineStyle: { color, width: 1.5 },
        data: (this.showNet() ? v.equity_strategy_net : v.equity_strategy).map((p) => [p.date, p.value]),
      });
      equitySeries.push({
        name: `B&H ${v.risk_on_ticker}`, type: 'line', showSymbol: false, smooth: false,
        lineStyle: { color, width: 1, type: [2, 3] },
        data: v.equity_riskon_buyhold.map((p) => [p.date, p.value]),
      });
    }

    const ratioSeries = r.variants.map((v, i) => ({
      name: `Strategy ${v.risk_on_ticker}/benchmark`, type: 'line', showSymbol: false, smooth: false,
      lineStyle: { color: this.riskOnColor(i), width: 1.4 },
      data: v.equity_ratio_vs_benchmark.map((p) => [p.date, p.value]),
      markLine: { silent: true, symbol: 'none', data: [{ yAxis: 1 }], lineStyle: { color: t.border, type: [4, 4] } },
    }));

    this.equityChart.setOption({ ...baseChart, series: equitySeries }, true);
    this.ratioChart.setOption({ ...baseChart, series: ratioSeries }, true);
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
