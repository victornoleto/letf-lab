import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { Strategy } from '../../core/models';
import { BacktestPanelComponent, BacktestResult } from './backtest-panel';
import { CohortEntriesComponent } from './cohort-entries';
import { DeployScoreCardComponent } from './deploy-score-card';
import { RobustnessHeatmapComponent } from './robustness-heatmap';
import { SignalHistoryTableComponent } from './signal-history-table';
import { IndicatorsTabComponent } from './indicators-tab';
import { stateLabel, stateOf } from '../../shared/strategy-state';

type DetailTab = 'main' | 'indicators';

const BACKEND_URL = '/api';

@Component({
  selector: 'app-strategy-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    BacktestPanelComponent,
    CohortEntriesComponent,
    DeployScoreCardComponent,
    RobustnessHeatmapComponent,
    SignalHistoryTableComponent,
    IndicatorsTabComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page page--detail">
      <nav class="breadcrumb">
        <a routerLink="/dashboard" class="breadcrumb__back">← Dashboard</a>
        <svg class="ico" width="12" height="12"><use href="#chevron-right"/></svg>
        <a routerLink="/strategies" class="breadcrumb__back">Strategies</a>
      </nav>

      @if (loading()) {
        <div class="skeleton skeleton--title"></div>
        <div class="skeleton skeleton--card" style="height: 80px; margin-top: 12px;"></div>
        <div class="skeleton skeleton--card" style="height: 320px; margin-top: 12px;"></div>
      } @else if (!strategy()) {
        <div class="empty">
          <svg class="empty__icon" width="24" height="24"><use href="#alert-circle"/></svg>
          <div class="empty__title">Strategy not found</div>
          <a routerLink="/dashboard" class="btn btn--primary">Back to Dashboard</a>
        </div>
      } @else {
        <header style="display:flex; align-items:flex-end; justify-content:space-between; padding-bottom:8px; border-bottom: 1px solid var(--border);">
          <h1 class="page-h1">{{ strategy()!.name }}</h1>
          <a [routerLink]="['/strategies', strategy()!.id, 'edit']" class="btn btn--sm">
            <svg class="ico" width="12" height="12"><use href="#pencil"/></svg>
            Edit
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
            <div class="val">
              {{ strategy()!.current_signal?.score ?? '—' }}/{{ strategy()!.current_signal?.total ?? '—' }}
              <span style="font-size: 11px; color: var(--text-muted); margin-left: 4px;">k≥{{ strategy()!.k_threshold }}</span>
            </div>
          </div>
        </div>

        @if (strategy()!.report; as rep) {
          <section class="report-card" [ngClass]="reportCls(rep.proximity_state)">
            <div class="report-card__head">
              <span class="report-card__tag">{{ proximityLabel(rep.proximity_state) }}</span>
              <span class="report-card__date">
                {{ rep.date }} · {{ rep.model }}
              </span>
              <button class="btn btn--ghost btn--sm report-card__regen"
                      (click)="regenerateReport()" [disabled]="reportRegenerating()">
                <svg class="ico" width="11" height="11" [class.spin]="reportRegenerating()">
                  <use href="#refresh"/>
                </svg>
                @if (reportRegenerating()) { Generating... } @else { Regenerate }
              </button>
            </div>
            <h3 class="report-card__headline">{{ rep.headline }}</h3>
            <p class="report-card__body">{{ rep.body }}</p>
          </section>
        }

        <div class="tabs" role="tablist">
          <button class="tab" role="tab"
                  [class.tab--active]="tab() === 'main'"
                  (click)="setTab('main')">Main</button>
          <button class="tab" role="tab"
                  [class.tab--active]="tab() === 'indicators'"
                  (click)="setTab('indicators')">Indicators</button>
        </div>

        @if (tab() === 'main') {
          <app-backtest-panel
            [result]="backtest()"
            [range]="range()"
            [loading]="backtestLoading()"
            [error]="backtestError()"
            (rangeChange)="onRangeChange($event)"
            (forceRerun)="loadBacktest(true)"
          />
          <app-signal-history-table [strategyId]="strategy()!.id" />
          <app-robustness-heatmap [strategyId]="strategy()!.id" />
          <app-deploy-score-card [strategyId]="strategy()!.id" />
          <app-cohort-entries [strategyId]="strategy()!.id" />
        } @else {
          <app-indicators-tab [strategyId]="strategy()!.id" />
        }
      }
    </div>
  `,
  styles: [`
    .tabs {
      display: flex;
      gap: 4px;
      margin-top: 12px;
      border-bottom: 1px solid var(--border);
    }
    .tab {
      appearance: none;
      background: transparent;
      border: none;
      padding: 8px 14px;
      font: inherit;
      font-size: 12.5px;
      color: var(--text-muted);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: color var(--duration-fast) var(--ease-out),
                  border-color var(--duration-fast) var(--ease-out);
    }
    .tab:hover { color: var(--text-primary); }
    .tab--active {
      color: var(--text-primary);
      border-bottom-color: var(--accent);
      font-weight: var(--fw-medium);
    }

    .report-card {
      margin-top: 12px;
      padding: 14px 16px;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--surface);
    }
    .report-card--near_off { border-color: var(--warn); background: rgba(245, 158, 11, 0.06); }
    .report-card--near_on  { border-color: var(--success); background: rgba(34, 197, 94, 0.06); }
    .report-card__head {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 11px;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    .report-card__tag {
      font-family: var(--font-mono);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: var(--fw-medium);
    }
    .report-card__date { font-family: var(--font-mono); }
    .report-card__regen { margin-left: auto; }
    .report-card__headline {
      margin: 0 0 4px;
      font-size: 14px;
      font-weight: var(--fw-semibold);
      letter-spacing: var(--tracking-tight);
    }
    .report-card__body {
      margin: 0;
      font-size: 12.5px;
      line-height: 1.5;
      color: var(--text-secondary);
    }
  `],
})
export class StrategyDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  strategy = signal<Strategy | null>(null);
  loading = signal(true);

  range = signal(10);
  backtest = signal<BacktestResult | null>(null);
  backtestLoading = signal(false);
  backtestError = signal<string | null>(null);
  tab = signal<DetailTab>('main');
  reportRegenerating = signal(false);

  setTab(t: DetailTab): void {
    this.tab.set(t);
  }

  reportCls(state: string | null | undefined): string {
    if (!state) return '';
    return `report-card--${state}`;
  }

  proximityLabel(state: string | null | undefined): string {
    return ({
      on: 'risk on',
      off: 'risk off',
      near_on: 'near flipping on',
      near_off: 'near flipping off',
      unknown: 'no data',
    } as Record<string, string>)[state ?? ''] ?? '·';
  }

  regenerateReport(): void {
    const s = this.strategy();
    if (!s || this.reportRegenerating()) return;
    this.reportRegenerating.set(true);
    this.api.regenerateReport(s.id).subscribe({
      next: (rep) => {
        this.reportRegenerating.set(false);
        this.strategy.set({ ...s, report: rep });
      },
      error: () => this.reportRegenerating.set(false),
    });
  }

  statusLabel = computed(() => {
    const s = this.strategy();
    return s ? stateLabel(s) : '';
  });

  statusClass = computed(() => {
    const s = this.strategy();
    if (!s) return '';
    const state = stateOf(s);
    if (state === 'on') return 'val--success';
    if (state === 'borderline') return 'val--warn';
    return 'val--danger';
  });

  ngOnInit(): void {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.api.getStrategy(id).subscribe({
      next: (s) => {
        this.strategy.set(s);
        this.loading.set(false);
        if (s.current_signal) {
          this.loadBacktest(false);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  onRangeChange(years: number): void {
    this.range.set(years);
    this.loadBacktest(false);
  }

  loadBacktest(force: boolean): void {
    const s = this.strategy();
    if (!s) return;
    this.backtestLoading.set(true);
    this.backtestError.set(null);
    const url = `${BACKEND_URL}/backtest/${s.id}?range_years=${this.range()}&force=${force}`;
    this.http
      .post<BacktestResult>(url, {})
      .pipe(
        catchError((err) => {
          this.backtestError.set(err?.error?.detail ?? 'Failed to compute backtest');
          return of(null);
        }),
      )
      .subscribe((r) => {
        if (r) this.backtest.set(r);
        this.backtestLoading.set(false);
      });
  }
}
