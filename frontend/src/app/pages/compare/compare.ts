import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  AxisPointerComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { ApiService } from '../../core/api.service';
import {
  CompareCrisisRow,
  CompareReport,
  CrisisVerdict,
} from '../../core/models';
import { readChartTokens } from '../../shared/charts/chart-tokens';

echarts.use([
  LineChart, GridComponent, TooltipComponent, LegendComponent,
  AxisPointerComponent, CanvasRenderer,
]);

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page page--compare">
      <nav class="breadcrumb">
        <a routerLink="/dashboard" class="breadcrumb__back">← Dashboard</a>
        <svg class="ico" width="12" height="12"><use href="#chevron-right"/></svg>
        <a routerLink="/strategies" class="breadcrumb__back">Estratégias</a>
        <svg class="ico" width="12" height="12"><use href="#chevron-right"/></svg>
        <span>Comparar</span>
      </nav>

      @if (loading()) {
        <div class="skeleton skeleton--card" style="height: 90px;"></div>
        <div class="skeleton skeleton--card" style="height: 360px; margin-top: 12px;"></div>
      } @else if (error()) {
        <div class="empty">
          <div class="empty__title">{{ error() }}</div>
          <a routerLink="/strategies" class="btn btn--primary">Voltar</a>
        </div>
      } @else if (data(); as d) {
        <header class="compare-head">
          <div class="compare-head__col">
            <div class="compare-head__label">Estratégia A</div>
            <a [routerLink]="['/strategies', d.strategy_a.id]" class="compare-head__name">
              {{ d.strategy_a.name }}
            </a>
            <div class="compare-head__meta mono">
              {{ d.strategy_a.benchmark_ticker }} → {{ d.strategy_a.risk_on_ticker }}
              · k≥{{ d.strategy_a.k_threshold }}
            </div>
          </div>
          <div class="compare-head__vs">vs</div>
          <div class="compare-head__col compare-head__col--b">
            <div class="compare-head__label">Estratégia B</div>
            <a [routerLink]="['/strategies', d.strategy_b.id]" class="compare-head__name">
              {{ d.strategy_b.name }}
            </a>
            <div class="compare-head__meta mono">
              {{ d.strategy_b.benchmark_ticker }} → {{ d.strategy_b.risk_on_ticker }}
              · k≥{{ d.strategy_b.k_threshold }}
            </div>
          </div>
        </header>

        <section class="section">
          <header class="section__head">
            <h2 class="section__title">Equity overlay · {{ d.range_years }}y</h2>
          </header>
          <div class="section__body">
            <div #chart style="height: 360px;"></div>
          </div>
        </section>

        <section class="section">
          <header class="section__head">
            <h2 class="section__title">Métricas</h2>
          </header>
          <div class="section__body">
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>Métrica</th>
                    <th class="th--num">A</th>
                    <th class="th--num">B</th>
                    <th class="th--num">Δ (B − A)</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of metricRows(); track row.key) {
                    <tr>
                      <td>{{ row.label }}</td>
                      <td class="td--num mono">{{ row.fmt(row.a) }}</td>
                      <td class="td--num mono">{{ row.fmt(row.b) }}</td>
                      <td class="td--num mono" [ngClass]="deltaCls(row)">
                        {{ row.fmtDelta(row.b - row.a) }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section class="section">
          <header class="section__head">
            <h2 class="section__title">Deploy Score</h2>
          </header>
          <div class="section__body deploy-grid">
            <div class="deploy-side">
              <div class="deploy-side__num">{{ d.deploy_a.total | number:'1.0-0' }}</div>
              <div class="deploy-side__tier" [ngClass]="tierBadgeCls(d.deploy_a.tier_label)">
                {{ d.deploy_a.tier_label }}
              </div>
              <div class="deploy-side__caption">A · {{ d.strategy_a.name }}</div>
            </div>
            <div class="deploy-side deploy-side--b">
              <div class="deploy-side__num">{{ d.deploy_b.total | number:'1.0-0' }}</div>
              <div class="deploy-side__tier" [ngClass]="tierBadgeCls(d.deploy_b.tier_label)">
                {{ d.deploy_b.tier_label }}
              </div>
              <div class="deploy-side__caption">B · {{ d.strategy_b.name }}</div>
            </div>
          </div>
        </section>

        <section class="section">
          <header class="section__head">
            <h2 class="section__title">Crisis attribution vs SPY</h2>
            <p class="section__sub">
              A: {{ d.n_beats_a }}/{{ d.n_eligible_a }} · B: {{ d.n_beats_b }}/{{ d.n_eligible_b }}
            </p>
          </header>
          <div class="section__body">
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>Crise</th>
                    <th>A</th>
                    <th class="th--num">% A</th>
                    <th>B</th>
                    <th class="th--num">% B</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of d.crisis_rows; track r.name) {
                    <tr>
                      <td>{{ r.label }}</td>
                      <td>
                        <span class="crisis-badge" [ngClass]="vCls(r.a_verdict)">
                          {{ verdictLabel(r.a_verdict) }}
                        </span>
                      </td>
                      <td class="td--num mono">{{ formatPct(r.a_pct_above_spy) }}</td>
                      <td>
                        <span class="crisis-badge" [ngClass]="vCls(r.b_verdict)">
                          {{ verdictLabel(r.b_verdict) }}
                        </span>
                      </td>
                      <td class="td--num mono">{{ formatPct(r.b_pct_above_spy) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .compare-head {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 16px;
      align-items: center;
      padding: 16px 18px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      margin-bottom: 12px;
    }
    .compare-head__col { display: flex; flex-direction: column; gap: 2px; }
    .compare-head__col--b { text-align: right; align-items: flex-end; }
    .compare-head__label {
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .compare-head__name {
      font-size: 16px;
      font-weight: var(--fw-semibold);
      color: var(--text-primary);
      text-decoration: none;
    }
    .compare-head__name:hover { color: var(--accent); }
    .compare-head__meta { font-size: 11.5px; color: var(--text-secondary); }
    .compare-head__vs {
      font-family: var(--font-mono);
      color: var(--text-muted);
      font-size: 11px;
      text-transform: uppercase;
    }

    .deploy-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .deploy-side {
      padding: 14px 18px;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--surface-muted);
      text-align: center;
    }
    .deploy-side--b { background: rgba(94, 106, 210, 0.04); }
    .deploy-side__num {
      font-family: var(--font-mono);
      font-size: 28px;
      font-weight: var(--fw-semibold);
    }
    .deploy-side__tier {
      display: inline-block;
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 0.06em;
      padding: 2px 8px;
      border-radius: 4px;
      margin-top: 4px;
    }
    .deploy-side__tier--ok   { color: var(--success); background: rgba(34,197,94,0.10); }
    .deploy-side__tier--warn { color: var(--warn); background: rgba(245,158,11,0.10); }
    .deploy-side__tier--bad  { color: var(--danger); background: rgba(239,68,68,0.10); }
    .deploy-side__caption {
      margin-top: 6px;
      font-size: 11px;
      color: var(--text-muted);
    }

    .crisis-badge {
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 0.04em;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .crisis-badge--beats { color: var(--success); background: rgba(34,197,94,0.10); }
    .crisis-badge--loses { color: var(--danger); background: rgba(239,68,68,0.10); }
    .crisis-badge--insufficient_data { color: var(--text-muted); background: var(--surface-muted); }

    .delta-pos { color: var(--success); }
    .delta-neg { color: var(--danger); }
  `],
})
export class CompareComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private injector = inject(Injector);

  data = signal<CompareReport | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  private chartEl = viewChild<ElementRef<HTMLDivElement>>('chart');
  private chart: echarts.ECharts | null = null;

  metricRows = computed(() => {
    const d = this.data();
    if (!d) return [] as MetricRow[];
    const ma = d.backtest_a.metrics_strategy;
    const mb = d.backtest_b.metrics_strategy;
    return [
      mkRow('cagr', 'CAGR', ma.cagr, mb.cagr, fmtPct, fmtPctDelta, true),
      mkRow('sharpe', 'Sharpe (gross)', ma.sharpe, mb.sharpe, fmtNum, fmtNumDelta, true),
      mkRow(
        'sharpe_net',
        'Sharpe (net Lei 14.754)',
        ma.sharpe_net ?? 0,
        mb.sharpe_net ?? 0,
        fmtNum, fmtNumDelta, true,
      ),
      mkRow('max_dd', 'Max DD', ma.max_dd, mb.max_dd, fmtPct, fmtPctDelta, false),
      mkRow(
        'tax_drag',
        'Tax drag (pp Sharpe)',
        ma.tax_drag_pp ?? 0,
        mb.tax_drag_pp ?? 0,
        fmtNum, fmtNumDelta, false,
      ),
      mkRow(
        'deploy',
        'Deploy Score',
        d.deploy_a.total, d.deploy_b.total,
        (v) => v.toFixed(0),
        (v) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}`,
        true,
      ),
    ];
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const a = Number(params.get('a'));
      const b = Number(params.get('b'));
      if (!a || !b || a === b) {
        this.error.set('Faltou query params válidos: ?a={id}&b={id}');
        this.loading.set(false);
        return;
      }
      this.loading.set(true);
      this.error.set(null);
      this.api.compareStrategies(a, b).subscribe({
        next: (d) => { this.data.set(d); this.loading.set(false); },
        error: (err) => {
          this.error.set(err?.error?.detail ?? 'Falha ao comparar estratégias');
          this.loading.set(false);
        },
      });
    });

    effect(() => {
      const d = this.data();
      const el = this.chartEl();
      if (!d || !el) return;
      queueMicrotask(() => this.renderChart(d, el.nativeElement));
    }, { injector: this.injector });

    window.addEventListener('themechange', this.onThemeChange);
  }

  ngOnDestroy(): void {
    window.removeEventListener('themechange', this.onThemeChange);
    this.chart?.dispose();
  }

  private onThemeChange = () => {
    const d = this.data();
    const el = this.chartEl()?.nativeElement;
    if (d && el) this.renderChart(d, el);
  };

  private renderChart(d: CompareReport, el: HTMLDivElement): void {
    this.chart?.dispose();
    this.chart = echarts.init(el);
    const t = readChartTokens();

    const dates = d.backtest_a.equity_strategy.map((p) => p.date);
    const a = d.backtest_a.equity_strategy.map((p) => +p.value.toFixed(4));
    const b = d.backtest_b.equity_strategy.map((p, i) => {
      // Series might have slightly different lengths; align by index for the
      // overlay (both backtests use the same range so they end on the same
      // day). Fall back to NaN where the b-series is shorter.
      return d.backtest_b.equity_strategy[i]
        ? +d.backtest_b.equity_strategy[i].value.toFixed(4)
        : NaN;
    });
    const bench = d.backtest_a.equity_benchmark_buyhold.map((p) => +p.value.toFixed(4));

    this.chart.setOption({
      grid: { left: 56, right: 16, top: 32, bottom: 30 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: t.tooltipBg,
        borderColor: t.tooltipBorder,
        textStyle: { color: t.tooltipFg, fontFamily: t.fontMono, fontSize: 11 },
      },
      legend: {
        data: [d.strategy_a.name, d.strategy_b.name, 'Benchmark'],
        textStyle: { color: t.textPrimary, fontSize: 11 },
        right: 16,
        top: 4,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: t.axis } },
        axisLabel: { color: t.textMuted, fontSize: 10, fontFamily: t.fontMono },
      },
      yAxis: {
        type: 'log',
        axisLine: { show: false },
        axisLabel: { color: t.textMuted, fontSize: 10, fontFamily: t.fontMono },
        splitLine: { lineStyle: { color: t.grid } },
      },
      series: [
        {
          name: d.strategy_a.name,
          type: 'line',
          data: a,
          showSymbol: false,
          lineStyle: { width: 1.8, color: t.equity },
        },
        {
          name: d.strategy_b.name,
          type: 'line',
          data: b,
          showSymbol: false,
          lineStyle: { width: 1.8, color: '#5e6ad2' },
        },
        {
          name: 'Benchmark',
          type: 'line',
          data: bench,
          showSymbol: false,
          lineStyle: { width: 1.2, color: t.axis, type: 'dashed' },
        },
      ],
    });
  }

  tierBadgeCls(tier: string): string {
    if (tier === 'WINNER' || tier === 'STRONG') return 'deploy-side__tier--ok';
    if (tier === 'PROMISING') return 'deploy-side__tier--warn';
    return 'deploy-side__tier--bad';
  }

  deltaCls(row: MetricRow): string {
    const delta = row.b - row.a;
    if (Math.abs(delta) < 1e-6) return '';
    const positiveIsGood = row.positiveIsGood;
    const isPos = delta > 0;
    if ((isPos && positiveIsGood) || (!isPos && !positiveIsGood)) return 'delta-pos';
    return 'delta-neg';
  }

  vCls(v: CrisisVerdict): string { return `crisis-badge--${v}`; }
  verdictLabel(v: CrisisVerdict): string {
    return ({ beats: 'BATE', loses: 'PERDE', insufficient_data: 'SEM DADOS' } as Record<CrisisVerdict, string>)[v];
  }
  formatPct(v: number | null): string {
    return v === null ? '—' : `${(v * 100).toFixed(0)}%`;
  }
}

interface MetricRow {
  key: string;
  label: string;
  a: number;
  b: number;
  fmt: (v: number) => string;
  fmtDelta: (v: number) => string;
  positiveIsGood: boolean;
}

function mkRow(
  key: string, label: string, a: number, b: number,
  fmt: (v: number) => string, fmtDelta: (v: number) => string,
  positiveIsGood: boolean,
): MetricRow {
  return { key, label, a, b, fmt, fmtDelta, positiveIsGood };
}

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(2)}%`;
}

function fmtPctDelta(v: number): string {
  const sign = v >= 0 ? '+' : '';
  return `${sign}${(v * 100).toFixed(2)}pp`;
}

function fmtNum(v: number): string {
  return v.toFixed(2);
}

function fmtNumDelta(v: number): string {
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}`;
}
