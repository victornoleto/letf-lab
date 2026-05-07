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
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
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
import type { EChartsOption } from 'echarts';
import { tok, readChartTokens, type ChartTokens } from '../../shared/charts/chart-tokens';

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

const BACKEND_URL = 'http://localhost:8000/api';

type IndicatorKind = 'SMA_GATE' | 'EMA_GATE' | 'VOL_GATE' | 'AR1_GATE';

interface BandPoint { date: string; price: number | null; ref: number | null; distance_pct: number | null; }
interface ValuePoint { date: string; value: number | null; }

interface IndicatorSeries {
  indicator_id: number;
  indicator_name: string;
  indicator_type: IndicatorKind;
  value_label: string;
  value_units: 'price' | 'ratio' | 'coef';
  threshold: number;
  trigger: string;
  points: BandPoint[] | ValuePoint[];
}

const RANGES = ['3m', '6m', '1y', '3y', '5y', 'max'] as const;
type Range = typeof RANGES[number];
const SYNC_GROUP = 'indicator-charts';

@Component({
  selector: 'app-indicators-tab',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section">
      <header class="section__head">
        <div>
          <h3 class="section__title">Indicadores</h3>
          <p class="section__sub">
            Cada chart mostra a referência do gate · cursor sincronizado · scroll p/ zoom
          </p>
        </div>
        <div class="pills">
          @for (r of ranges; track r) {
            <span class="pill" [class.pill--active]="range() === r" (click)="setRange(r)">{{ r }}</span>
          }
        </div>
      </header>

      @if (loading()) {
        <div class="skeleton skeleton--card" style="height: 240px;"></div>
      } @else if (series().length === 0) {
        <div class="empty" style="padding: 32px 16px;">
          <div class="empty__title">Sem dados</div>
          <div class="empty__copy">A estratégia não tem indicadores ou os preços ainda não foram baixados.</div>
        </div>
      } @else {
        <div class="indicators-grid">
          @for (s of series(); track s.indicator_id) {
            <div class="indicator-card">
              <header class="indicator-card__head">
                <div>
                  <h4 class="indicator-card__title">{{ s.indicator_name }}</h4>
                  <p class="indicator-card__trigger mono">trigger: {{ s.trigger }}</p>
                </div>
                <span class="badge" [ngClass]="latestPassed(s) ? 'badge--on' : 'badge--off'">
                  {{ latestPassed(s) ? 'on' : 'off' }}
                </span>
              </header>
              <div class="indicator-card__chart" #host [attr.data-id]="s.indicator_id"></div>
            </div>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .indicators-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 14px;
      margin-top: 12px;
    }
    @media (min-width: 1100px) {
      .indicators-grid { grid-template-columns: 1fr 1fr; }
    }
    .indicator-card {
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--surface);
      padding: 12px 14px;
    }
    .indicator-card__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 6px;
    }
    .indicator-card__title {
      margin: 0;
      font-size: 12.5px;
      font-weight: var(--fw-semibold);
    }
    .indicator-card__trigger {
      margin: 2px 0 0;
      font-size: 11px;
      color: var(--text-muted);
    }
    .indicator-card__chart {
      height: 220px;
    }
  `],
})
export class IndicatorsTabComponent implements OnInit, OnDestroy {
  strategyId = input.required<number>();
  private http = inject(HttpClient);
  private injector = inject(Injector);
  private hostRef = inject<ElementRef<HTMLElement>>(ElementRef);

  ranges = RANGES;
  range = signal<Range>('1y');
  series = signal<IndicatorSeries[]>([]);
  loading = signal(false);

  private charts = new Map<number, echarts.ECharts>();
  private ro?: ResizeObserver;
  private themeListener = () => this.rerenderAll();

  ngOnInit(): void {
    effect(
      () => {
        const id = this.strategyId();
        const r = this.range();
        if (id) this.load(id, r);
      },
      { injector: this.injector },
    );
    document.addEventListener('themechange', this.themeListener);
  }

  ngOnDestroy(): void {
    document.removeEventListener('themechange', this.themeListener);
    this.ro?.disconnect();
    for (const c of this.charts.values()) c.dispose();
    this.charts.clear();
  }

  setRange(r: Range): void {
    this.range.set(r);
  }

  latestPassed(s: IndicatorSeries): boolean {
    if (s.value_units === 'price') {
      const pts = s.points as BandPoint[];
      const last = [...pts].reverse().find((p) => p.price != null && p.ref != null);
      if (!last) return false;
      const upper = last.ref! * (1 + s.threshold);
      return last.price! > (s.threshold > 0 ? upper : last.ref!);
    }
    const pts = s.points as ValuePoint[];
    const last = [...pts].reverse().find((p) => p.value != null);
    if (!last) return false;
    if (s.indicator_type === 'VOL_GATE') return last.value! < s.threshold;
    return last.value! > s.threshold;
  }

  private load(id: number, range: Range): void {
    this.loading.set(true);
    this.http
      .get<IndicatorSeries[]>(`${BACKEND_URL}/strategies/${id}/indicator-series?range=${range}`)
      .subscribe({
        next: (rows) => {
          this.series.set(rows);
          this.loading.set(false);
          // Charts mount/rerender on next tick once @for has rendered the hosts.
          queueMicrotask(() => this.rerenderAll());
        },
        error: () => {
          this.series.set([]);
          this.loading.set(false);
        },
      });
  }

  private rerenderAll(): void {
    const hosts = this.hostRef.nativeElement.querySelectorAll<HTMLDivElement>(
      '.indicator-card__chart',
    );
    if (hosts.length === 0) return;
    const tokens = readChartTokens();
    const seenIds = new Set<number>();

    hosts.forEach((host) => {
      const idAttr = host.getAttribute('data-id');
      if (!idAttr) return;
      const id = +idAttr;
      seenIds.add(id);
      const series = this.series().find((s) => s.indicator_id === id);
      if (!series) return;

      let chart = this.charts.get(id);
      if (!chart) {
        chart = echarts.init(host);
        chart.group = SYNC_GROUP;
        this.charts.set(id, chart);
      }
      chart.setOption(this.buildOption(series, tokens), true);
      chart.resize();
    });

    // Drop charts whose host is gone (range change with fewer indicators).
    for (const [id, chart] of this.charts) {
      if (!seenIds.has(id)) {
        chart.dispose();
        this.charts.delete(id);
      }
    }

    echarts.connect(SYNC_GROUP);

    if (!this.ro) {
      this.ro = new ResizeObserver(() => {
        for (const c of this.charts.values()) c.resize();
      });
    }
    hosts.forEach((h) => this.ro!.observe(h));
  }

  private buildOption(s: IndicatorSeries, t: ChartTokens): EChartsOption {
    if (s.value_units === 'price') {
      return this.priceBandOption(s, t);
    }
    return this.singleValueOption(s, t);
  }

  private priceBandOption(s: IndicatorSeries, t: ChartTokens): EChartsOption {
    const pts = s.points as BandPoint[];
    const priceData = pts.map((p) => [p.date, p.price]);
    const refData = pts.map((p) => [p.date, p.ref]);
    const upperData = s.threshold > 0
      ? pts.map((p) => [p.date, p.ref != null ? p.ref * (1 + s.threshold) : null])
      : null;
    const lowerData = s.threshold > 0
      ? pts.map((p) => [p.date, p.ref != null ? p.ref * (1 - s.threshold) : null])
      : null;

    const series: EChartsOption['series'] = [
      {
        name: 'Price',
        type: 'line',
        showSymbol: false,
        smooth: false,
        lineStyle: { color: t.equity, width: 1.5 },
        data: priceData,
      },
      {
        name: s.value_label,
        type: 'line',
        showSymbol: false,
        smooth: false,
        lineStyle: { color: t.textMuted, width: 1, type: [4, 3] },
        data: refData,
      },
    ];
    if (upperData && lowerData) {
      const successColor = tok('--success');
      const dangerColor = tok('--danger');
      series.push({
        name: 'Upper band',
        type: 'line',
        showSymbol: false,
        lineStyle: { color: successColor, width: 1, opacity: 0.4, type: [2, 3] },
        data: upperData,
      });
      series.push({
        name: 'Lower band',
        type: 'line',
        showSymbol: false,
        lineStyle: { color: dangerColor, width: 1, opacity: 0.4, type: [2, 3] },
        data: lowerData,
      });
    }

    return this.commonOption(series, t);
  }

  private singleValueOption(s: IndicatorSeries, t: ChartTokens): EChartsOption {
    const pts = s.points as ValuePoint[];
    const data = pts.map((p) => [p.date, p.value]);
    // Threshold marker: red for vol (gate fails when >= threshold), green
    // for AR(1) (gate passes when > threshold). Either way it's the line we
    // want the user to track relative to.
    const passColor = s.indicator_type === 'VOL_GATE' ? tok('--danger') : tok('--success');
    return this.commonOption(
      [
        {
          name: s.value_label,
          type: 'line',
          showSymbol: false,
          smooth: false,
          lineStyle: { color: t.equity, width: 1.5 },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: passColor, type: [3, 3], width: 1, opacity: 0.7 },
            data: [{ yAxis: s.threshold, label: { show: false } }],
          },
          data,
        },
      ],
      t,
    );
  }

  private commonOption(series: EChartsOption['series'], t: ChartTokens): EChartsOption {
    return {
      grid: { left: 8, right: 56, top: 8, bottom: 38, containLabel: true },
      animation: false,
      textStyle: { fontFamily: t.fontMono, fontSize: 11, color: t.textMuted },
      axisPointer: {
        link: [{ xAxisIndex: 'all' }],
        lineStyle: { color: t.border, width: 1 },
      },
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
        axisLabel: { color: t.textMuted, fontSize: 10 },
        splitLine: { lineStyle: { color: t.grid, type: [3, 3] } },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: tok('--surface-elevated'),
        borderColor: t.border,
        borderWidth: 1,
        padding: [6, 10],
        textStyle: { color: t.textPrimary, fontSize: 12, fontFamily: t.fontMono },
      },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0, zoomOnMouseWheel: true, moveOnMouseMove: true },
        {
          type: 'slider',
          xAxisIndex: 0,
          height: 14,
          bottom: 4,
          borderColor: 'transparent',
          backgroundColor: 'transparent',
          fillerColor: tok('--surface-muted'),
          handleSize: '70%',
          textStyle: { color: t.textMuted, fontSize: 10 },
          labelFormatter: (_v, str) => (str ? str.slice(0, 7) : ''),
        },
      ],
      series,
    };
  }
}
