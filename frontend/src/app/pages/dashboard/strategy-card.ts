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
    .ticker {
      display: inline-flex;
      align-items: center;
      font-family: var(--font-mono);
      font-feature-settings: 'tnum' 1;
      font-size: 12.5px;
      font-weight: var(--fw-medium);
      color: var(--text-primary);
    }
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
    if (score === k) return 'off';
    return 'off';
  });

  segs = computed(() => Array.from({ length: 5 }, (_, i) => i));

  segClass(i: number): string {
    const s = this.strategy();
    const score = s.current_signal?.score ?? 0;
    const filled = i < score;
    if (!filled) return 'score-bar__seg';
    const stMap = ({ on: 'score-bar__seg--filled-on', off: 'score-bar__seg--filled-off',
                    borderline: 'score-bar__seg--filled-borderline' } as const);
    return 'score-bar__seg ' + stMap[this.cardState()];
  }
}
