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
          <h2 class="section__title">Robustness Heatmap</h2>
          <p class="section__sub">
            Sortino da estratégia para janelas rolantes (3y/5y/10y/20y) por data de entrada.
            Identifica os piores entry points históricos.
          </p>
        </div>
      </header>

      <div class="section__body">
        @if (loading()) {
          <div class="skeleton" style="height: 220px;"></div>
        } @else if (error()) {
          <div class="empty"><div class="empty__title">{{ error() }}</div></div>
        } @else if (data(); as d) {
          <div #chart class="heatmap"></div>
          <p class="heatmap__caption">
            Histórico desde {{ d.history_start }} · {{ d.entry_dates.length }} datas amostradas (passo trimestral)
          </p>
        }
      </div>
    </section>
  `,
  styles: [`
    .heatmap { width: 100%; height: 220px; }
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
  private chartEl = viewChild<ElementRef<HTMLDivElement>>('chart');
  private chart: echarts.ECharts | null = null;

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
        this.error.set(err?.error?.detail ?? 'Falha ao calcular rolling-window stress');
        this.loading.set(false);
      },
    });

    effect(() => {
      const d = this.data();
      const el = this.chartEl();
      if (!d || !el) return;
      queueMicrotask(() => this.render(d, el.nativeElement));
    }, { injector: this.injector });

    window.addEventListener('themechange', this.onThemeChange);
  }

  ngOnDestroy(): void {
    window.removeEventListener('themechange', this.onThemeChange);
    this.chart?.dispose();
    this.chart = null;
  }

  private onThemeChange = () => {
    const d = this.data();
    const el = this.chartEl()?.nativeElement;
    if (d && el) this.render(d, el);
  };

  private render(d: RollingStress, el: HTMLDivElement): void {
    this.chart?.dispose();
    this.chart = echarts.init(el, undefined, { renderer: 'canvas' });
    const tokens = readChartTokens();

    // ECharts heatmap data: [colIdx, rowIdx, value]
    const series: [number, number, number][] = [];
    d.rows.forEach((row, rIdx) => {
      row.cells.forEach((c, cIdx) => {
        if (c.sortino !== null && Number.isFinite(c.sortino)) {
          series.push([cIdx, rIdx, +c.sortino.toFixed(3)]);
        }
      });
    });

    const yLabels = d.rows.map((r) => `${r.window_years}y`);

    this.chart.setOption({
      grid: { left: 56, right: 80, top: 12, bottom: 36 },
      tooltip: {
        position: 'top',
        backgroundColor: tokens.tooltipBg,
        borderColor: tokens.tooltipBorder,
        textStyle: { color: tokens.tooltipFg, fontFamily: tokens.fontMono, fontSize: 11 },
        formatter: (p: any) => {
          const [colIdx, rowIdx, value] = p.data;
          const entry = d.entry_dates[colIdx];
          const window = d.rows[rowIdx].window_years;
          const cell = d.rows[rowIdx].cells[colIdx];
          const pct =
            cell.pct_above_spy !== null
              ? `${(cell.pct_above_spy * 100).toFixed(0)}%`
              : '—';
          return [
            `<div style="font-weight:500;">${entry} → +${window}y</div>`,
            `<div>Sortino: ${value.toFixed(2)}</div>`,
            `<div>% acima bench: ${pct}</div>`,
          ].join('');
        },
      },
      xAxis: {
        type: 'category',
        data: d.entry_dates,
        axisLine: { lineStyle: { color: tokens.axis } },
        axisLabel: {
          color: tokens.textMuted,
          fontSize: 9,
          fontFamily: tokens.fontMono,
          formatter: (v: string) => v.slice(0, 7), // YYYY-MM
          interval: Math.max(1, Math.floor(d.entry_dates.length / 12) - 1),
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
      visualMap: {
        min: -0.5,
        max: 1.5,
        calculable: true,
        orient: 'vertical',
        right: 4,
        top: 8,
        bottom: 8,
        textStyle: { color: tokens.textMuted, fontSize: 10 },
        inRange: {
          color: ['#dc2626', '#f97316', '#facc15', '#84cc16', '#16a34a'],
        },
      },
      series: [
        {
          name: 'Sortino',
          type: 'heatmap',
          data: series,
          itemStyle: { borderRadius: 1, borderWidth: 0 },
          emphasis: { itemStyle: { borderColor: tokens.textPrimary, borderWidth: 1 } },
        },
      ],
    });
  }
}
