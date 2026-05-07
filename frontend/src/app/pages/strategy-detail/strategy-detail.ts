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
import { SignalHistoryTableComponent } from './signal-history-table';
import { IndicatorsTabComponent } from './indicators-tab';
import { stateLabel, stateOf } from '../../shared/strategy-state';

type DetailTab = 'main' | 'indicators';

const BACKEND_URL = 'http://localhost:8000/api';

@Component({
  selector: 'app-strategy-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    BacktestPanelComponent,
    SignalHistoryTableComponent,
    IndicatorsTabComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page page--detail">
      <nav class="breadcrumb">
        <a routerLink="/dashboard" class="breadcrumb__back">← Dashboard</a>
        <svg class="ico" width="12" height="12"><use href="#chevron-right"/></svg>
        <a routerLink="/strategies" class="breadcrumb__back">Estratégias</a>
      </nav>

      @if (loading()) {
        <div class="skeleton skeleton--title"></div>
        <div class="skeleton skeleton--card" style="height: 80px; margin-top: 12px;"></div>
        <div class="skeleton skeleton--card" style="height: 320px; margin-top: 12px;"></div>
      } @else if (!strategy()) {
        <div class="empty">
          <svg class="empty__icon" width="24" height="24"><use href="#alert-circle"/></svg>
          <div class="empty__title">Estratégia não encontrada</div>
          <a routerLink="/dashboard" class="btn btn--primary">Voltar ao Dashboard</a>
        </div>
      } @else {
        <header style="display:flex; align-items:flex-end; justify-content:space-between; padding-bottom:8px; border-bottom: 1px solid var(--border);">
          <h1 class="page-h1">{{ strategy()!.name }}</h1>
          <a [routerLink]="['/strategies', strategy()!.id, 'edit']" class="btn btn--sm">
            <svg class="ico" width="12" height="12"><use href="#pencil"/></svg>
            Editar
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

        <div class="tabs" role="tablist">
          <button class="tab" role="tab"
                  [class.tab--active]="tab() === 'main'"
                  (click)="setTab('main')">Principal</button>
          <button class="tab" role="tab"
                  [class.tab--active]="tab() === 'indicators'"
                  (click)="setTab('indicators')">Indicadores</button>
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

  setTab(t: DetailTab): void {
    this.tab.set(t);
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
          this.backtestError.set(err?.error?.detail ?? 'Falha ao calcular backtest');
          return of(null);
        }),
      )
      .subscribe((r) => {
        if (r) this.backtest.set(r);
        this.backtestLoading.set(false);
      });
  }
}
