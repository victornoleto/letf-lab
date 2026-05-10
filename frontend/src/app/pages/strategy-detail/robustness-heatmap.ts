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
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as echarts from 'echarts/core';
import { HeatmapChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { ApiService } from '../../core/api.service';
import { RollingStress } from '../../core/models';
import { readChartTokens } from '../../shared/charts/chart-tokens';

echarts.use([HeatmapChart, GridComponent, TooltipComponent, VisualMapComponent, CanvasRenderer]);

@Component({
  selector: 'app-robustness-heatmap',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section">
      <header class="section__head">
        <div>
          <h2 class="section__title">Benchmark Edge Windows</h2>
          <p class="section__sub">
            Two readings per rolling window: time above benchmark and final
            equity/benchmark edge over 3/5/10/15/20 years.
          </p>
        </div>
        @if (data(); as d) {
          <span class="edge-summary" [ngClass]="summaryCls(d)">
            {{ countPassed(d) }}/{{ countValid(d) }} above 1x
          </span>
        }
      </header>

      <div class="section__body">
        @if (loading()) {
          <div class="skeleton" style="height: 220px;"></div>
        } @else if (error()) {
          <div class="empty"><div class="empty__title">{{ error() }}</div></div>
        } @else if (data(); as d) {
          <div class="heatmap-grid">
            <article class="heatmap-panel">
              <div class="heatmap-panel__title">% above benchmark</div>
              <div #pctChart class="heatmap"></div>
            </article>
            <article class="heatmap-panel">
              <div class="heatmap-panel__title">Equity / benchmark final</div>
              <div #ratioChart class="heatmap"></div>
            </article>
          </div>
          <p class="heatmap__caption">
            History since {{ d.history_start }} · {{ d.entry_dates.length }} sampled monthly dates
          </p>
        }
      </div>
    </section>
  `,
  styles: [`
    .heatmap-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }
    @media (max-width: 900px) {
      .heatmap-grid { grid-template-columns: 1fr; }
    }
    .heatmap-panel {
      min-width: 0;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--surface);
      padding: 10px 10px 8px;
    }
    .heatmap-panel__title {
      font-size: 12px;
      font-weight: var(--fw-medium);
      color: var(--text-secondary);
      margin-bottom: 6px;
    }
    .heatmap { width: 100%; height: 220px; }
    .edge-summary {
      font-family: var(--font-mono);
      font-size: 11.5px;
      padding: 4px 10px;
      border-radius: 999px;
      background: var(--surface-muted);
      white-space: nowrap;
    }
    .edge-summary--good { color: var(--success); background: rgba(34,197,94,0.10); }
    .edge-summary--warn { color: var(--warn); background: rgba(245,158,11,0.10); }
    .edge-summary--bad { color: var(--danger); background: rgba(239,68,68,0.10); }
    .heatmap__caption {
      font-size: 11px;
      color: var(--text-muted);
      margin: 8px 0 0;
    }
  `],
})
export class RobustnessHeatmapComponent implements OnInit, OnDestroy {
  strategyId = input.required<number>();

  private api = inject(ApiService);
  private injector = inject(Injector);
  private pctChartEl = viewChild<ElementRef<HTMLDivElement>>('pctChart');
  private ratioChartEl = viewChild<ElementRef<HTMLDivElement>>('ratioChart');
  private pctChart: echarts.ECharts | null = null;
  private ratioChart: echarts.ECharts | null = null;

  data = signal<RollingStress | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.rollingStress(this.strategyId()).subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.detail ?? 'Failed to compute rolling-window stress');
        this.loading.set(false);
      },
    });

    effect(() => {
      const d = this.data();
      const pctEl = this.pctChartEl();
      const ratioEl = this.ratioChartEl();
      if (!d || !pctEl || !ratioEl) return;
      queueMicrotask(() => this.render(d, pctEl.nativeElement, ratioEl.nativeElement));
    }, { injector: this.injector });

    window.addEventListener('themechange', this.onThemeChange);
  }

  ngOnDestroy(): void {
    window.removeEventListener('themechange', this.onThemeChange);
    this.pctChart?.dispose();
    this.ratioChart?.dispose();
    this.pctChart = null;
    this.ratioChart = null;
  }

  private onThemeChange = () => {
    const d = this.data();
    const pctEl = this.pctChartEl()?.nativeElement;
    const ratioEl = this.ratioChartEl()?.nativeElement;
    if (d && pctEl && ratioEl) this.render(d, pctEl, ratioEl);
  };

  private render(d: RollingStress, pctEl: HTMLDivElement, ratioEl: HTMLDivElement): void {
    this.pctChart?.dispose();
    this.ratioChart?.dispose();
    this.pctChart = echarts.init(pctEl, undefined, { renderer: 'canvas' });
    this.ratioChart = echarts.init(ratioEl, undefined, { renderer: 'canvas' });
    const tokens = readChartTokens();

    const pctSeries: [number, number, number][] = [];
    const ratioSeries: [number, number, number][] = [];
    const ratios: number[] = [];
    d.rows.forEach((row, rIdx) => {
      row.cells.forEach((c, cIdx) => {
        if (c.pct_above_spy !== null && Number.isFinite(c.pct_above_spy)) {
          pctSeries.push([cIdx, rIdx, +c.pct_above_spy.toFixed(3)]);
        }
        if (c.final_equity_ratio !== null && Number.isFinite(c.final_equity_ratio)) {
          const ratio = +c.final_equity_ratio.toFixed(3);
          ratioSeries.push([cIdx, rIdx, ratio]);
          ratios.push(ratio);
        }
      });
    });

    const yLabels = d.rows.map((r) => `${r.window_years}y`);
    const base = this.baseChartOptions(d, yLabels, tokens);

    this.pctChart.setOption({
      ...base,
      tooltip: this.tooltipOptions(d, tokens),
      visualMap: {
        calculable: true,
        type: 'piecewise',
        orient: 'vertical',
        right: 4,
        top: 8,
        bottom: 8,
        textStyle: { color: tokens.textMuted, fontSize: 10 },
        pieces: [
          { lt: 0.30, label: '<30%', color: '#dc2626' },
          { gte: 0.30, lt: 0.70, label: '30-70%', color: '#facc15' },
          { gte: 0.70, label: '>70%', color: '#2563eb' },
        ],
      },
      series: [
        {
          name: '% above bench',
          type: 'heatmap',
          data: pctSeries,
          itemStyle: { borderRadius: 1, borderWidth: 0 },
          emphasis: { itemStyle: { borderColor: tokens.textPrimary, borderWidth: 1 } },
        },
      ],
    });

    this.ratioChart.setOption({
      ...base,
      tooltip: this.tooltipOptions(d, tokens),
      visualMap: {
        calculable: true,
        type: 'piecewise',
        orient: 'vertical',
        right: 4,
        top: 8,
        bottom: 8,
        textStyle: { color: tokens.textMuted, fontSize: 10 },
        pieces: this.ratioPieces(ratios),
      },
      series: [
        {
          name: 'Equity/benchmark',
          type: 'heatmap',
          data: ratioSeries,
          itemStyle: { borderRadius: 1, borderWidth: 0 },
          emphasis: { itemStyle: { borderColor: tokens.textPrimary, borderWidth: 1 } },
        },
      ],
    });
  }

  private baseChartOptions(d: RollingStress, yLabels: string[], tokens: ReturnType<typeof readChartTokens>) {
    return {
      grid: { left: 42, right: 86, top: 8, bottom: 34 },
      xAxis: {
        type: 'category',
        data: d.entry_dates,
        axisLine: { lineStyle: { color: tokens.axis } },
        axisLabel: {
          color: tokens.textMuted,
          fontSize: 9,
          fontFamily: tokens.fontMono,
          formatter: (v: string) => v.slice(0, 7),
          interval: Math.max(1, Math.floor(d.entry_dates.length / 8) - 1),
        },
        splitArea: { show: false },
      },
      yAxis: {
        type: 'category',
        data: yLabels,
        axisLine: { show: false },
        axisLabel: { color: tokens.textMuted, fontSize: 11, fontFamily: tokens.fontMono },
        splitArea: { show: false },
      },
    };
  }

  private tooltipOptions(d: RollingStress, tokens: ReturnType<typeof readChartTokens>) {
    return {
      position: 'top',
      backgroundColor: tokens.tooltipBg,
      borderColor: tokens.tooltipBorder,
      textStyle: { color: tokens.tooltipFg, fontFamily: tokens.fontMono, fontSize: 11 },
      formatter: (p: any) => {
        const [colIdx, rowIdx] = p.data;
        const entry = d.entry_dates[colIdx];
        const window = d.rows[rowIdx].window_years;
        const cell = d.rows[rowIdx].cells[colIdx];
        const pct = cell.pct_above_spy !== null ? `${(cell.pct_above_spy * 100).toFixed(0)}%` : '—';
        const ratio = cell.final_equity_ratio !== null ? `${cell.final_equity_ratio.toFixed(2)}x` : '—';
        return [
          `<div style="font-weight:500;">${entry} → +${window}y</div>`,
          `<div>% above bench: ${pct}</div>`,
          `<div>Equity/benchmark final: ${ratio}</div>`,
        ].join('');
      },
    };
  }

  private ratioPieces(ratios: number[]) {
    const finite = ratios.filter((v) => Number.isFinite(v));
    const min = Math.min(...finite, 1);
    const max = Math.max(...finite, 1);
    const weakRed = min + (1 - min) * 0.65;
    const midPositive = 1 + (max - 1) * 0.50;
    return [
      { min, lt: weakRed, label: `<${weakRed.toFixed(2)}x`, color: '#991b1b' },
      { gte: weakRed, lt: 1, label: `${weakRed.toFixed(2)}-1.00x`, color: '#ef4444' },
      { gte: 1, lt: midPositive, label: `1.00-${midPositive.toFixed(2)}x`, color: '#facc15' },
      { gte: midPositive, lte: max, label: `${midPositive.toFixed(2)}-${max.toFixed(2)}x`, color: '#2563eb' },
    ];
  }

  countValid(d: RollingStress): number {
    return d.rows.reduce(
      (acc, row) => acc + row.cells.filter((c) => c.final_equity_ratio !== null).length,
      0,
    );
  }

  countPassed(d: RollingStress): number {
    return d.rows.reduce(
      (acc, row) => acc + row.cells.filter((c) => c.final_equity_ratio !== null && c.passed).length,
      0,
    );
  }

  summaryCls(d: RollingStress): string {
    const total = this.countValid(d);
    if (total === 0) return '';
    const ratio = this.countPassed(d) / total;
    if (ratio >= 0.75) return 'edge-summary--good';
    if (ratio >= 0.50) return 'edge-summary--warn';
    return 'edge-summary--bad';
  }
}
