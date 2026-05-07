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
  viewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  AxisPointerComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { ApiService } from '../../core/api.service';
import { CrisisAttribution, CrisisResult, CrisisVerdict } from '../../core/models';
import { readChartTokens } from '../../shared/charts/chart-tokens';

echarts.use([LineChart, GridComponent, TooltipComponent, AxisPointerComponent, CanvasRenderer]);

@Component({
  selector: 'app-crisis-lab',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section crisis-lab">
      <header class="section__head">
        <div>
          <h2 class="section__title">Crisis Lab</h2>
          <p class="section__sub">
            Como a estratégia se comportou em 4 crises canônicas vs SPY (renormalizado).
          </p>
        </div>
        @if (data(); as d) {
          <span class="crisis-lab__score" [ngClass]="scoreCls(d.n_beats, d.n_eligible)">
            {{ d.n_beats }} de {{ d.n_eligible }} crises batem o SPY
          </span>
        }
      </header>

      <div class="section__body crisis-grid">
        @if (loading()) {
          <div class="skeleton" style="height: 220px; grid-column: 1 / -1;"></div>
        } @else if (error()) {
          <div class="empty"><div class="empty__title">{{ error() }}</div></div>
        } @else if (data(); as d) {
          @for (r of d.results; track r.name) {
            <div class="crisis-card" [ngClass]="cardCls(r.verdict)">
              <header class="crisis-card__head">
                <div class="crisis-card__title">{{ r.label }}</div>
                <span class="crisis-card__badge" [ngClass]="badgeCls(r.verdict)">
                  {{ verdictLabel(r.verdict) }}
                </span>
              </header>
              @if (r.verdict === 'insufficient_data') {
                <div class="crisis-card__empty">
                  Sem dados suficientes — risk-on ou benchmark ainda não existia.
                </div>
              } @else {
                <div #chart class="crisis-card__chart" [attr.data-name]="r.name"></div>
                <footer class="crisis-card__foot">
                  <span class="mono">% acima SPY: {{ formatPct(r.pct_above_spy) }}</span>
                  <span class="mono">final: {{ formatRatio(r.end_ratio) }}×</span>
                </footer>
              }
            </div>
          }
        }
      </div>
    </section>
  `,
  styles: [`
    .crisis-lab__score {
      font-family: var(--font-mono);
      font-size: 11.5px;
      padding: 4px 10px;
      border-radius: 999px;
      background: var(--surface-muted);
    }
    .crisis-lab__score--good { color: var(--success); background: rgba(34,197,94,0.10); }
    .crisis-lab__score--warn { color: var(--warn); background: rgba(245,158,11,0.10); }
    .crisis-lab__score--bad  { color: var(--danger); background: rgba(239,68,68,0.10); }

    .crisis-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    @media (max-width: 720px) {
      .crisis-grid { grid-template-columns: 1fr; }
    }

    .crisis-card {
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 12px;
      background: var(--surface);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .crisis-card--beats { border-color: color-mix(in oklab, var(--success) 30%, var(--border)); }
    .crisis-card--loses { border-color: color-mix(in oklab, var(--danger) 25%, var(--border)); }

    .crisis-card__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .crisis-card__title {
      font-size: 12.5px;
      font-weight: var(--fw-medium);
    }
    .crisis-card__badge {
      font-size: 10px;
      font-family: var(--font-mono);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--surface-muted);
      color: var(--text-muted);
    }
    .crisis-card__badge--beats { color: var(--success); background: rgba(34,197,94,0.10); }
    .crisis-card__badge--loses { color: var(--danger); background: rgba(239,68,68,0.10); }

    .crisis-card__chart { width: 100%; height: 140px; }
    .crisis-card__foot {
      display: flex;
      justify-content: space-between;
      font-size: 10.5px;
      color: var(--text-muted);
    }
    .crisis-card__empty {
      font-size: 11.5px;
      color: var(--text-muted);
      padding: 28px 0;
      text-align: center;
    }
  `],
})
export class CrisisLabComponent implements OnInit, OnDestroy {
  strategyId = input.required<number>();

  private api = inject(ApiService);
  private injector = inject(Injector);

  data = signal<CrisisAttribution | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  private chartRefs = viewChildren<ElementRef<HTMLDivElement>>('chart');
  private charts: echarts.ECharts[] = [];

  ngOnInit(): void {
    this.api.crisisAttribution(this.strategyId()).subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.detail ?? 'Falha ao carregar crisis attribution');
        this.loading.set(false);
      },
    });

    effect(() => {
      const d = this.data();
      const refs = this.chartRefs();
      if (!d || refs.length === 0) return;
      // Render charts after the @for has placed the divs in the DOM.
      queueMicrotask(() => this.renderCharts(d.results, refs));
    }, { injector: this.injector });

    // Re-render charts on theme change so colours stay coherent.
    window.addEventListener('themechange', this.onThemeChange);
  }

  ngOnDestroy(): void {
    window.removeEventListener('themechange', this.onThemeChange);
    for (const c of this.charts) c.dispose();
    this.charts = [];
  }

  private onThemeChange = () => {
    const d = this.data();
    const refs = this.chartRefs();
    if (d) this.renderCharts(d.results, refs);
  };

  private renderCharts(results: CrisisResult[], refs: readonly ElementRef<HTMLDivElement>[]): void {
    for (const c of this.charts) c.dispose();
    this.charts = [];
    const tokens = readChartTokens();

    for (const ref of refs) {
      const el = ref.nativeElement;
      const name = el.getAttribute('data-name');
      const r = results.find((x) => x.name === name);
      if (!r || r.verdict === 'insufficient_data' || r.points.length === 0) continue;

      const chart = echarts.init(el, undefined, { renderer: 'canvas' });
      const dates = r.points.map((p) => p.date);
      const strat = r.points.map((p) => p.strategy);
      const spy = r.points.map((p) => p.spy);
      const stratColor = r.verdict === 'beats' ? tokens.equity : 'var(--danger)';
      chart.setOption({
        grid: { left: 36, right: 8, top: 8, bottom: 22 },
        tooltip: {
          trigger: 'axis',
          backgroundColor: tokens.tooltipBg,
          borderColor: tokens.tooltipBorder,
          textStyle: { color: tokens.tooltipFg, fontFamily: tokens.fontMono, fontSize: 11 },
          formatter: (params: any[]) => {
            if (!Array.isArray(params)) return '';
            const date = params[0]?.axisValueLabel ?? '';
            const lines = params.map(
              (p) => `${p.marker} ${p.seriesName}: ${(p.data as number).toFixed(1)}`
            );
            return [date, ...lines].join('<br/>');
          },
        },
        xAxis: {
          type: 'category',
          data: dates,
          axisLine: { lineStyle: { color: tokens.axis } },
          axisLabel: { color: tokens.textMuted, fontSize: 9, fontFamily: tokens.fontMono },
        },
        yAxis: {
          type: 'value',
          axisLine: { show: false },
          axisLabel: { color: tokens.textMuted, fontSize: 9, fontFamily: tokens.fontMono },
          splitLine: { lineStyle: { color: tokens.grid } },
          scale: true,
        },
        series: [
          {
            name: 'Estratégia',
            type: 'line',
            data: strat,
            showSymbol: false,
            smooth: false,
            lineStyle: { width: 1.6, color: stratColor },
          },
          {
            name: 'SPY',
            type: 'line',
            data: spy,
            showSymbol: false,
            smooth: false,
            lineStyle: { width: 1.2, color: tokens.axis, type: 'dashed' },
          },
        ],
      });
      this.charts.push(chart);
    }
  }

  cardCls(v: CrisisVerdict): string {
    return `crisis-card--${v}`;
  }

  badgeCls(v: CrisisVerdict): string {
    return `crisis-card__badge--${v}`;
  }

  verdictLabel(v: CrisisVerdict): string {
    return ({
      beats: 'BATE SPY',
      loses: 'PERDE',
      insufficient_data: 'SEM DADOS',
    } as Record<CrisisVerdict, string>)[v];
  }

  scoreCls(beats: number, eligible: number): string {
    if (eligible === 0) return '';
    const ratio = beats / eligible;
    if (ratio >= 0.75) return 'crisis-lab__score--good';
    if (ratio >= 0.50) return 'crisis-lab__score--warn';
    return 'crisis-lab__score--bad';
  }

  formatPct(v: number | null): string {
    return v === null ? '—' : `${(v * 100).toFixed(0)}%`;
  }

  formatRatio(v: number | null): string {
    return v === null ? '—' : v.toFixed(2);
  }
}
