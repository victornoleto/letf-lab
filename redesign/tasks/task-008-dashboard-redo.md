# Task 008 (v2) — Dashboard: cards with 2px stripe + score-bar 5 segments + 3-col ind-row + filter pills + SVG sparkline

**Goal:** Refactor the Dashboard, StrategyCard, and Sparkline to match Linear DNA exactly. Cards have a 2px vertical accent stripe, a score-bar with 5 segments, a 3-column indicator row (icon|name|detail), and a pure-SVG sparkline (replacing the ECharts-based one). The page header has a sub-line with counts; filter pills replace the previous filter bar.

## Pre-conditions

- Tasks 001-007 done.
- `_card.scss`, `_score-bar.scss`, `_ind-row.scss`, `_pill.scss` partials exist with Linear-DNA rules.
- `shared/strategy-state.ts` exists (re-used).

## Sources

1. `design-export/layouts/11-dashboard.md` — full HTML + SCSS for dashboard
2. `design-export/04-components.md` §2 — card, score-bar, ind-row
3. `design-export/05-charts-echarts.md` §5 — pure-SVG sparkline component

## Files to modify

### `frontend/src/app/pages/dashboard/sparkline.ts`

Replace the ECharts-based sparkline with a pure SVG component (much cheaper to render N×5 sparklines on the dashboard):

```ts
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-sparkline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.viewBox]="'0 0 ' + w() + ' ' + h()" [attr.width]="w()" [attr.height]="h()" preserveAspectRatio="none">
      @if (data().length > 1) {
        <path [attr.d]="fillPath()" [attr.fill]="fill()" stroke="none"/>
        <path [attr.d]="linePath()" [attr.stroke]="color()" stroke-width="1.2" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
      }
    </svg>
  `,
  styles: [`:host { display: block; } svg { display: block; width: 100%; height: 100%; }`],
})
export class SparklineComponent {
  data  = input<number[]>([]);
  state = input<'on' | 'off' | 'borderline'>('on');
  w     = input<number>(240);
  h     = input<number>(42);

  color = computed(() => {
    const s = this.state();
    return s === 'on' ? 'var(--success)' : s === 'borderline' ? 'var(--warn)' : 'var(--danger)';
  });
  fill = computed(() => {
    const s = this.state();
    return s === 'on' ? 'var(--success-soft)' : s === 'borderline' ? 'var(--warn-soft)' : 'var(--danger-soft)';
  });

  linePath = computed(() => {
    const d = this.data();
    if (d.length < 2) return '';
    const min = Math.min(...d), max = Math.max(...d);
    const span = max - min || 1;
    const W = this.w(), H = this.h();
    const step = W / (d.length - 1);
    return d.map((v, i) => {
      const x = i * step;
      const y = H - ((v - min) / span) * (H - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
  });

  fillPath = computed(() => `${this.linePath()} L${this.w()},${this.h()} L0,${this.h()} Z`);
}
```

No more ECharts import here. Smaller bundle, instant render.

### `frontend/src/app/pages/dashboard/strategy-card.ts`

Replace markup with the Linear card structure:

```ts
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Strategy } from '../../core/models';
import { SparklineComponent } from './sparkline';
import { stateOf, type CardState } from '../../shared/strategy-state';

@Component({
  selector: 'app-strategy-card',
  standalone: true,
  imports: [CommonModule, RouterLink, SparklineComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="card" [routerLink]="['/strategies', strategy().id]">
      <span class="card__accent" [ngClass]="'card__accent--' + cardState()"></span>

      <header class="card__head">
        <div class="ticker">
          <span>{{ strategy().benchmark_ticker }}</span>
          <span class="arrow">→</span>
          <span [ngClass]="cardState() === 'off' ? 'off' : 'on'">{{ strategy().risk_on_ticker }}</span>
        </div>
        <span class="badge" [ngClass]="badgeClass()">{{ stateLabel() }}</span>
      </header>

      <div class="card__meta">
        <span>Score <span class="mono" [ngClass]="scoreClass()">{{ strategy().current_signal?.score ?? '—' }}/{{ strategy().current_signal?.total ?? '—' }}</span> · k≥{{ strategy().k_threshold }}</span>
        <div class="score-bar">
          @for (i of segs(); track i) {
            <span class="score-bar__seg" [ngClass]="segClass(i)"></span>
          }
        </div>
      </div>

      <div class="card__spark">
        <app-sparkline [data]="strategy().sparkline_90d" [state]="cardState()" [w]="240" [h]="42"/>
      </div>

      <div class="card__rows">
        @for (r of strategy().current_signal?.results ?? []; track r.indicator_id) {
          <div class="ind-row">
            <span [class.ind-row__icon-pass]="r.gate_passed" [class.ind-row__icon-fail]="!r.gate_passed">
              <svg width="14" height="14"><use [attr.href]="r.gate_passed ? '#check' : '#x'"/></svg>
            </span>
            <span class="ind-row__name">{{ r.indicator_name }}</span>
            <span class="ind-row__detail">{{ r.raw_summary }}</span>
          </div>
        }
      </div>
    </a>
  `,
  styles: [`
    .card { display: block; text-decoration: none; color: inherit; }
    .arrow { color: var(--text-muted); margin: 0 4px; }
    .on { color: var(--success); }
    .off { color: var(--danger); }
  `],
})
export class StrategyCardComponent {
  strategy = input.required<Strategy>();

  cardState = computed<CardState>(() => stateOf(this.strategy()));

  stateLabel = computed(() => ({
    on: 'Risk on', off: 'Risk off', borderline: 'No fio',
  } as Record<CardState, string>)[this.cardState()]);

  badgeClass = computed(() => ({
    on: 'badge--on', off: 'badge--off', borderline: 'badge--borderline',
  } as Record<CardState, string>)[this.cardState()]);

  scoreClass = computed(() => {
    const s = this.strategy();
    const score = s.current_signal?.score ?? 0;
    const k = s.k_threshold;
    if (score > k) return 'on';
    if (score === k) return 'off'; // borderline; you can switch this color via inline class above
    return 'off';
  });

  segs = computed(() => Array.from({ length: 5 }, (_, i) => i));

  segClass(i: number): string {
    const s = this.strategy();
    const total = s.current_signal?.total ?? 0;
    const score = s.current_signal?.score ?? 0;
    const filled = i < score;
    if (!filled) return 'score-bar__seg';
    const stMap = ({ on: 'score-bar__seg--filled-on', off: 'score-bar__seg--filled-off',
                    borderline: 'score-bar__seg--filled-borderline' } as const);
    return 'score-bar__seg ' + stMap[this.cardState()];
  }
}
```

Notes:
- Score-bar always renders **5 segments** even if total != 5 — Linear spec uses fixed grid for visual consistency. Filled count = score.
- `card__accent` is a `<span>` positioned absolute inside the `.card` (rules in `_card.scss`).
- `ticker` styling lives in `02-typography.md` `.ticker` rule — confirm `_typography.scss` or a shared partial provides it. If not, add it inline as a style in this component.

### `frontend/src/app/pages/dashboard/dashboard.ts`

```ts
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Strategy } from '../../core/models';
import { StrategyCardComponent } from './strategy-card';
import { stateOf } from '../../shared/strategy-state';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, StrategyCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1 class="page-head__h1">Dashboard</h1>
          <p class="page-head__sub">
            {{ counts().on }}/{{ counts().total }} risk-on
            @if (counts().borderline > 0) { · {{ counts().borderline }} no fio }
            @if (asof()) { · asof <span class="mono">{{ asof() }}</span> }
          </p>
        </div>
        <div class="page-head__actions">
          <div class="pills">
            <span class="pill" [class.pill--active]="filter() === 'all'" (click)="setFilter('all')">Todas</span>
            <span class="pill" [class.pill--active]="filter() === 'on'"  (click)="setFilter('on')">Risk-on</span>
            <span class="pill" [class.pill--active]="filter() === 'off'" (click)="setFilter('off')">Risk-off</span>
          </div>
          <a routerLink="/strategies/new" class="btn btn--primary">
            <svg class="ico" width="12" height="12"><use href="#plus"/></svg>
            Nova estratégia
          </a>
        </div>
      </header>

      @if (loading()) {
        <div class="grid">
          @for (_ of [1,2,3,4,5,6]; track _) {
            <div class="card">
              <div class="card__head" style="padding: 12px 14px 10px;">
                <div class="skeleton skeleton--text" style="width: 110px"></div>
                <div class="skeleton" style="width: 56px; height: 16px; border-radius: 4px;"></div>
              </div>
              <div class="card__spark"><div class="skeleton" style="height: 42px"></div></div>
              <div class="card__rows">
                @for (_ of [1,2,3,4]; track _) {
                  <div class="skeleton skeleton--text" style="width: 80%"></div>
                }
              </div>
            </div>
          }
        </div>
      } @else if (strategies().length === 0) {
        <div class="empty">
          <svg class="empty__icon" width="24" height="24"><use href="#strategies"/></svg>
          <div class="empty__title">Nenhuma estratégia ainda</div>
          <div class="empty__copy">Crie sua primeira para acompanhar transições risk-on/risk-off.</div>
          <a routerLink="/strategies/new" class="btn btn--primary">
            <svg class="ico" width="12" height="12"><use href="#plus"/></svg>
            Nova estratégia
          </a>
        </div>
      } @else if (filteredStrategies().length === 0) {
        <div class="empty">
          <svg class="empty__icon" width="24" height="24"><use href="#filter"/></svg>
          <div class="empty__title">Nenhum resultado</div>
          <button class="btn" (click)="setFilter('all')">Limpar filtros</button>
        </div>
      } @else {
        <div class="grid">
          @for (s of filteredStrategies(); track s.id) {
            <app-strategy-card [strategy]="s"/>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      gap: var(--space-4);
    }
  `],
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  strategies = signal<Strategy[]>([]);
  loading = signal(true);
  filter = signal<'all' | 'on' | 'off'>('all');

  asof = computed(() => this.strategies()[0]?.current_signal?.date ?? null);

  counts = computed(() => {
    const all = this.strategies();
    let on = 0, borderline = 0, off = 0;
    for (const s of all) {
      const st = stateOf(s);
      if (st === 'on') on++; else if (st === 'borderline') borderline++; else off++;
    }
    return { total: all.length, on, borderline, off };
  });

  filteredStrategies = computed(() => {
    const all = this.strategies();
    const f = this.filter();
    if (f === 'all') return all;
    return all.filter(s => {
      const st = stateOf(s);
      if (f === 'on') return st === 'on' || st === 'borderline';
      return st === 'off';
    });
  });

  ngOnInit(): void {
    const f = this.route.snapshot.queryParamMap.get('filter') as any;
    if (f === 'on' || f === 'off' || f === 'all') this.filter.set(f);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.listStrategies().subscribe({
      next: (data) => { this.strategies.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  setFilter(f: 'all' | 'on' | 'off'): void {
    this.filter.set(f);
    this.router.navigate([], { queryParams: { filter: f === 'all' ? null : f }, queryParamsHandling: 'merge' });
  }
}
```

## What NOT to modify

- API service.
- Strategy detail (task 009).
- Routes.

## Verification

```bash
cd /var/www/pessoal/ai-swing/frontend
npx ng build --configuration=development
```

Manual smoke:
- Dashboard shows cards with hairline border and 2px vertical stripe (green/red/amber).
- Score-bar always 5 segments. Filled count = score.
- Sparkline is now SVG (no ECharts logs in console for this component).
- Filter pills work and persist via `?filter=on/off/all` query param.
- Empty states show for the 0-strategies and the filtered-empty cases.

## Definition of done

1. Sparkline is a pure SVG component (no echarts import).
2. Card uses 2px stripe + score-bar 5 segs + ind-row 3-col grid.
3. Dashboard uses `.pills` segmented filter + `.page-head` with sub.
4. Build passes.
5. Print `TASK DONE: task-008-dashboard-redo.md` at end.
