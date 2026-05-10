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
          <span [ngClass]="cardState() === 'off' ? 'off' : 'on'">{{ strategy().risk_on_tickers.join('/') }}</span>
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
            <span class="ind-row__body">
              <span class="ind-row__name">{{ r.indicator_name }}</span>
              <span class="ind-row__detail">{{ r.raw_summary }}</span>
            </span>
            @if (r.headroom_pct !== null) {
              <span
                class="headroom"
                [ngClass]="headroomCls(r.headroom_pct)"
                [title]="headroomTitle(r)"
              >{{ formatHeadroom(r.headroom_pct) }}</span>
            }
          </div>
        }
      </div>

      @if (strategy().report; as rep) {
        <div class="card__report" [ngClass]="reportCls(rep.proximity_state)">
          <span class="card__report-tag">{{ proximityLabel(rep.proximity_state) }}</span>
          {{ rep.headline }}
        </div>
      }
    </a>
  `,
  styles: [`
    .card { display: block; text-decoration: none; color: inherit; }
    .card__report {
      margin-top: 10px;
      padding: 8px 10px;
      border-radius: var(--radius-md);
      background: var(--surface-muted);
      font-size: 11.5px;
      line-height: 1.4;
      color: var(--text-secondary);
    }
    .card__report--near_off { background: rgba(245, 158, 11, 0.10); color: var(--warn); }
    .card__report--near_on  { background: rgba(34, 197, 94, 0.10); }
    .card__report-tag {
      display: inline-block;
      margin-right: 6px;
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: var(--fw-medium);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
    }
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
    .headroom {
      font-family: var(--font-mono);
      font-feature-settings: 'tnum' 1;
      font-size: 12px;
      color: var(--success);
      align-self: center;
    }
    .headroom--good { color: var(--success); }
    .headroom--warn { color: var(--warn); }
    .headroom--bad  { color: var(--danger); }
  `],
})
export class StrategyCardComponent {
  strategy = input.required<Strategy>();

  cardState = computed<CardState>(() => stateOf(this.strategy()));

  stateLabel = computed(() => ({
    on: 'Risk on', off: 'Risk off', borderline: 'Borderline',
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

  segs = computed(() => {
    const total = this.strategy().current_signal?.total ?? this.strategy().indicators.length ?? 0;
    return Array.from({ length: Math.max(total, 1) }, (_, i) => i);
  });

  segClass(i: number): string {
    const s = this.strategy();
    const score = s.current_signal?.score ?? 0;
    const filled = i < score;
    if (!filled) return 'score-bar__seg';
    const stMap = ({ on: 'score-bar__seg--filled-on', off: 'score-bar__seg--filled-off',
                    borderline: 'score-bar__seg--filled-borderline' } as const);
    return 'score-bar__seg ' + stMap[this.cardState()];
  }

  reportCls(state: string | null | undefined): string {
    if (!state) return '';
    return `card__report--${state}`;
  }

  proximityLabel(state: string | null | undefined): string {
    return ({
      on: 'risk on',
      off: 'risk off',
      near_on: 'near on',
      near_off: 'near off',
      unknown: '·',
    } as Record<string, string>)[state ?? ''] ?? '·';
  }

  formatHeadroom(h: number): string {
    const pct = h * 100;
    const sign = pct > 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}%`;
  }

  headroomCls(h: number): string {
    // ≥5pp clear margin = "good" / "bad" depending on direction;
    // anything closer to the gate = "warn" (near flip).
    if (Math.abs(h) < 0.05) return 'headroom--warn';
    return h > 0 ? 'headroom--good' : 'headroom--bad';
  }

  headroomTitle(r: { headroom_pct: number | null; gate_passed: boolean; indicator_name: string }): string {
    if (r.headroom_pct === null) return '';
    const dir = r.headroom_pct >= 0 ? 'above' : 'below';
    return `${r.indicator_name}: ${this.formatHeadroom(r.headroom_pct)} ${dir} threshold (gate ${r.gate_passed ? 'passes' : 'fails'})`;
  }
}
