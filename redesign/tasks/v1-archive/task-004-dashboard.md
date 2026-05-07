# Task 004 — Dashboard redesign (cards + sparkline + filter bar + BORDERLINE state)

**Goal:** Refactor the Dashboard page and its strategy-card / sparkline components to match the design. Each card uses the new `.strategy-card` markup, KPI metrics, sparkline with state-aware coloring, accent border. Add a filter bar (All / Risk on / Risk off) and the new BORDERLINE state (score == k).

## Pre-conditions

- Tasks 001, 002, 003 done.
- `.strategy-card`, `.metric`, `.filter-bar`, `.eyebrow`, `.badge`, `.empty`, `.skeleton` available globally.
- `chart-tokens.ts` exists and is import-able.

## Sources

1. `design-export/layouts/11-dashboard.md` — full HTML, SCSS, color/state TS helpers
2. `design-export/05-charts-echarts.md` — `sparklineOption(t, data, state)` (~line 160)
3. `design-export/04-components.md` — `Card` accent variants, `Badge` sizes
4. `design-export/00-OVERVIEW.md` — "Score badge vira pill mono…", "Cards do dashboard ganham borda lateral fina…"

## Files to modify

| File | Changes |
|---|---|
| `frontend/src/app/pages/dashboard/dashboard.ts` | Header, filter bar, grid, empty state |
| `frontend/src/app/pages/dashboard/strategy-card.ts` | New markup using `.strategy-card`, `.metric`, accent variant via `card--accent-{success/danger/warn}`, score pill with semantic color |
| `frontend/src/app/pages/dashboard/sparkline.ts` | Use `sparklineOption()` from `chart-tokens` (or equivalent local helper) + reactive theme via `effect()` + `ThemeService` |

## Logic

### State derivation

Single source of truth — implement once, reuse:

```ts
// in shared/strategy-state.ts (NEW) — or inline in dashboard.ts
import type { Strategy } from '../core/models';

export type CardState = 'on' | 'off' | 'borderline';

export function stateOf(s: Strategy): CardState {
  const sig = s.current_signal;
  if (!sig) return 'off';
  if (sig.risk_on) return 'on';
  if (sig.score === s.k_threshold) return 'borderline';
  return 'off';
}

export function stateLabel(s: Strategy): string {
  return ({ on: 'RISK ON', off: 'RISK OFF', borderline: 'BORDERLINE' })[stateOf(s)];
}

export function badgeClass(s: Strategy): string {
  return ({ on: 'badge--success', off: 'badge--danger', borderline: 'badge--warn' })[stateOf(s)];
}

export function cardAccentClass(s: Strategy): string {
  return ({ on: 'card--accent-success', off: 'card--accent-danger', borderline: 'card--accent-warn' })[stateOf(s)];
}

export function scoreClass(s: Strategy): string {
  const k = s.k_threshold;
  const score = s.current_signal?.score ?? 0;
  if (score > k) return 'text-success';
  if (score === k) return 'text-warn';
  return 'text-danger';
}
```

Create this helper in `frontend/src/app/shared/strategy-state.ts`.

### Filter

Dashboard has a `filter` signal: `'all' | 'on' | 'off'`. `filteredStrategies()` (computed) filters the list.

```ts
filter = signal<'all' | 'on' | 'off'>('all');
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
```

### KPI counts on header

Replace the existing `riskOnCount` with three computed totals:
```ts
counts = computed(() => {
  const all = this.strategies();
  const on = all.filter(s => stateOf(s) === 'on').length;
  const borderline = all.filter(s => stateOf(s) === 'borderline').length;
  const off = all.filter(s => stateOf(s) === 'off').length;
  return { on, borderline, off, total: all.length };
});
```

Display in header subtitle: `{{ counts().on }} on · {{ counts().borderline }} borderline · {{ counts().off }} off · {{ counts().total }} total`

## dashboard.ts (template)

```html
<section class="page">
  <header class="page__head">
    <div>
      <h1 class="page__title">Dashboard</h1>
      <p class="page__subtitle">
        @if (loading()) {
          Loading…
        } @else {
          {{ counts().on }} on · {{ counts().borderline }} borderline · {{ counts().off }} off · {{ counts().total }} total
        }
      </p>
    </div>

    <div class="page__actions">
      <div class="filter-bar">
        <button class="btn btn--sm" [class.is-active]="filter() === 'all'" (click)="setFilter('all')">All</button>
        <button class="btn btn--sm" [class.is-active]="filter() === 'on'"  (click)="setFilter('on')">Risk on</button>
        <button class="btn btn--sm" [class.is-active]="filter() === 'off'" (click)="setFilter('off')">Risk off</button>
      </div>
      <a routerLink="/strategies" [queryParams]="{ new: true }" class="btn btn--primary btn--sm">
        <svg class="ico" width="14" height="14"><use href="#plus"/></svg>
        Nova estratégia
      </a>
    </div>
  </header>

  @if (loading()) {
    <div class="strategy-grid">
      @for (i of [1,2,3,4,5,6]; track i) {
        <article class="card strategy-card">
          <div class="skeleton" style="width:60%;height:18px"></div>
          <div class="skeleton" style="width:40%;height:12px;margin-top:6px"></div>
          <div class="skeleton skeleton--block" style="height:42px;margin-top:12px"></div>
          <div class="skeleton skeleton--block" style="height:56px;margin-top:8px"></div>
        </article>
      }
    </div>
  } @else if (error()) {
    <div class="error-state">
      <svg class="error-state__ico" width="48" height="48"><use href="#alert-circle"/></svg>
      <h3 class="error-state__title">Não conseguimos carregar suas estratégias</h3>
      <p class="error-state__msg">{{ error() }}</p>
      <button class="btn btn--primary btn--md" (click)="load()">
        <svg class="ico" width="16" height="16"><use href="#refresh"/></svg>
        Try again
      </button>
    </div>
  } @else if (strategies().length === 0) {
    <div class="empty">
      <svg class="empty__ico" width="48" height="48"><use href="#strategies"/></svg>
      <h3 class="empty__title">Nenhuma estratégia ainda</h3>
      <p class="empty__msg">Crie sua primeira estratégia para começar a monitorar sinais.</p>
      <a routerLink="/strategies" [queryParams]="{ new: true }" class="btn btn--primary btn--md">
        <svg class="ico" width="16" height="16"><use href="#plus"/></svg>
        Nova estratégia
      </a>
    </div>
  } @else if (filteredStrategies().length === 0) {
    <div class="empty">
      <h3 class="empty__title">Nenhuma estratégia bate com os filtros</h3>
      <button class="btn btn--ghost btn--md" (click)="setFilter('all')">Reset filters</button>
    </div>
  } @else {
    <div class="strategy-grid">
      @for (s of filteredStrategies(); track s.id) {
        <app-strategy-card [strategy]="s" />
      }
    </div>
  }
</section>
```

## strategy-card.ts (template)

Replace existing template with the markup from `11-dashboard.md` (under "## HTML"). Use `cardAccentClass(s)`, `badgeClass(s)`, `stateLabel(s)`, `scoreClass(s)` helpers from `shared/strategy-state.ts`.

Key bits:
- Article wrapper: `<a [routerLink]="['/strategies', strategy().id]" class="card-link">` outside the card so the whole card is clickable. Then `<article class="card card--clickable" [ngClass]="accentClass()">…</article>` (use `[class]` binding for the accent class — Angular 21).
- Header: title + subtitle (tickers in mono) + `.badge.badge--lg` with state class.
- Metrics row: 3 `.metric` blocks (Score with mono pill colored by `scoreClass`, k threshold, Last update date).
- Sparkline: `<app-sparkline [data]="strategy().sparkline_90d" [state]="cardState()"/>`.
- Footer: eyebrow with indicator count + "Open" affordance with `chevron-right` icon.

Use `computed()` to derive `accentClass`, `cardState`, `stateLabel`, `badgeClass`, `scoreClass` from the input signal.

```ts
import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SparklineComponent } from './sparkline';
import { Strategy } from '../../core/models';
import { stateOf, stateLabel as stateLabelFn, badgeClass as badgeClassFn,
         cardAccentClass, scoreClass as scoreClassFn } from '../../shared/strategy-state';

@Component({
  selector: 'app-strategy-card',
  standalone: true,
  imports: [CommonModule, RouterLink, SparklineComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` … `, // markup from 11-dashboard.md (adapted)
})
export class StrategyCardComponent {
  strategy = input.required<Strategy>();
  cardState     = computed(() => stateOf(this.strategy()));
  accentClass   = computed(() => cardAccentClass(this.strategy()));
  badgeCls      = computed(() => badgeClassFn(this.strategy()));
  stateText     = computed(() => stateLabelFn(this.strategy()));
  scoreCls      = computed(() => scoreClassFn(this.strategy()));
}
```

## sparkline.ts

Refactor to consume `chart-tokens.ts` and react to theme changes:

```ts
import { Component, computed, effect, ElementRef, inject, input, signal, viewChild,
         AfterViewInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { getChartTokens } from '../../shared/charts/chart-tokens';
import { ThemeService } from '../../shared/theme/theme.service';
import type { CardState } from '../../shared/strategy-state';

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

@Component({
  selector: 'app-sparkline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #host class="spark-host"></div>`,
  styles: [`
    :host { display: block; width: 100%; height: 56px; }
    .spark-host { width: 100%; height: 100%; }
  `],
})
export class SparklineComponent implements AfterViewInit, OnDestroy {
  data  = input<number[]>([]);
  state = input<CardState>('on');

  private host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private theme = inject(ThemeService);
  private chart!: echarts.ECharts;
  private ro?: ResizeObserver;

  ngAfterViewInit() {
    this.chart = echarts.init(this.host().nativeElement);
    this.ro = new ResizeObserver(() => this.chart?.resize());
    this.ro.observe(this.host().nativeElement);
    effect(() => {
      // re-evaluates when theme.mode() OR data() OR state() changes
      const opt = this.buildOption();
      this.chart.setOption(opt, true);
    });
  }

  ngOnDestroy() {
    this.ro?.disconnect();
    this.chart?.dispose();
  }

  private buildOption() {
    const t = getChartTokens(this.theme.effective());
    const data = this.data();
    const st = this.state();
    const color = st === 'on' ? t.series.strategy
                : st === 'off' ? t.series.ratioNeg
                : '#bb5504'; // borderline = warn (override per design)
    return {
      backgroundColor: 'transparent',
      grid: { left: 0, right: 0, top: 4, bottom: 4 },
      xAxis: { type: 'category', show: false, boundaryGap: false, data: data.map((_, i) => i) },
      yAxis: { type: 'value', show: false, scale: true },
      tooltip: { show: false },
      animation: false,
      series: [{
        type: 'line',
        data,
        smooth: 0.2,
        symbol: 'none',
        lineStyle: { color, width: 1.5 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: color + '33' },
              { offset: 1, color: color + '00' },
            ],
          },
        },
      }],
    };
  }
}
```

> **Note:** `state` input must accept the union `'on' | 'off' | 'borderline'`. Match the type used in `strategy-state.ts`. The borderline color `#bb5504` is the WARN token in light mode; in dark mode the chart-tokens don't expose a "warn" series color, but for sparklines this is acceptable. If you want strict theming, use `getComputedStyle(document.documentElement).getPropertyValue('--warn')` for borderline color. Keep it simple for now.

## What NOT to change

- API service methods.
- Routes.
- The forms / modal — task 007 handles those.
- StrategyDetail / charts — task 005.

## Verification

1. Build:
   ```bash
   cd /var/www/pessoal/ai-swing/frontend
   npx ng build --configuration=development
   ```
   Must succeed.

2. Manual smoke (only if backend is already running):
   - `/dashboard` shows cards in the new layout.
   - At least one card with score == k shows BORDERLINE badge (warn color).
   - Filter bar All / Risk on / Risk off filters correctly.
   - Sparkline renders and changes color on theme toggle.

## Definition of done

1. `dashboard.ts`, `strategy-card.ts`, `sparkline.ts` rewritten.
2. `shared/strategy-state.ts` exists.
3. Sparkline reacts to theme toggle.
4. Build passes.
5. Print `TASK DONE: task-004-dashboard.md` at end.
