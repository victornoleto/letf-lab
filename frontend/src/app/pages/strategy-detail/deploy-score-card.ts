import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { CriterionStatus, DeployScore } from '../../core/models';

@Component({
  selector: 'app-deploy-score-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="skeleton" style="height: 76px; margin-top: 12px;"></div>
    } @else if (data(); as d) {
      <section class="deploy-card" [ngClass]="tierCls(d.tier_label)">
        <header class="deploy-card__head" (click)="toggleExpanded()">
          <div class="deploy-card__score">
            <span class="deploy-card__num">{{ d.total | number:'1.0-0' }}</span>
            <span class="deploy-card__den">/100</span>
          </div>
          <div class="deploy-card__meta">
            <span class="deploy-card__tier" [ngClass]="tierBadgeCls(d.tier_label)">
              {{ tierLabel(d.tier_label) }}
            </span>
            <span class="deploy-card__caption">
              Deploy threshold ≥90 ·
              {{ d.range_start }} → {{ d.range_end }}
            </span>
          </div>
          <button class="deploy-card__chevron" type="button" [attr.aria-expanded]="expanded()">
            <svg width="14" height="14"><use [attr.href]="expanded() ? '#chevron-down' : '#chevron-right'"/></svg>
          </button>
        </header>

        @if (expanded()) {
          <div class="deploy-card__breakdown">
            @for (c of d.criteria; track c.key) {
              <div class="crit" [ngClass]="critCls(c.status)">
                <div class="crit__head">
                  <span class="crit__label">{{ c.label }}</span>
                  <span class="crit__pts mono">
                    {{ c.points | number:'1.1-1' }}/{{ c.max_points }}
                  </span>
                </div>
                <div class="crit__note">{{ c.note }}</div>
              </div>
            }
            @if (!d.winner_conditions_met) {
              <p class="deploy-card__hint">
                Critérios 3 (gates) e 4 (DSR) ainda pendentes — chegam na Fase 3 com walk-forward + bootstrap.
              </p>
            }
          </div>
        }
      </section>
    }
  `,
  styles: [`
    .deploy-card {
      margin-top: 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--surface);
      overflow: hidden;
    }
    .deploy-card--strong { border-color: color-mix(in oklab, var(--success) 30%, var(--border)); }
    .deploy-card--promising { border-color: color-mix(in oklab, var(--warn) 30%, var(--border)); }
    .deploy-card--marginal,
    .deploy-card--near_fail,
    .deploy-card--fail { border-color: color-mix(in oklab, var(--danger) 25%, var(--border)); }

    .deploy-card__head {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 14px 18px;
      cursor: pointer;
      user-select: none;
    }
    .deploy-card__head:hover { background: var(--surface-muted); }
    .deploy-card__score {
      display: flex;
      align-items: baseline;
      gap: 2px;
      font-family: var(--font-mono);
    }
    .deploy-card__num {
      font-size: 26px;
      font-weight: var(--fw-semibold);
      letter-spacing: var(--tracking-tight);
    }
    .deploy-card__den {
      font-size: 13px;
      color: var(--text-muted);
    }
    .deploy-card__meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }
    .deploy-card__tier {
      font-family: var(--font-mono);
      font-size: 10.5px;
      font-weight: var(--fw-medium);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 4px;
      width: fit-content;
      background: var(--surface-muted);
      color: var(--text-muted);
    }
    .deploy-card__tier--ok   { color: var(--success); background: rgba(34,197,94,0.10); }
    .deploy-card__tier--warn { color: var(--warn); background: rgba(245,158,11,0.10); }
    .deploy-card__tier--bad  { color: var(--danger); background: rgba(239,68,68,0.10); }
    .deploy-card__caption {
      font-size: 11px;
      color: var(--text-muted);
    }
    .deploy-card__chevron {
      appearance: none;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 6px;
    }

    .deploy-card__breakdown {
      padding: 10px 18px 16px;
      border-top: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .crit {
      padding: 10px 12px;
      border-radius: var(--radius-md);
      background: var(--surface-muted);
    }
    .crit__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .crit__label { font-size: 12px; font-weight: var(--fw-medium); }
    .crit__pts {
      font-size: 11.5px;
      color: var(--text-muted);
    }
    .crit__note {
      font-size: 11px;
      line-height: 1.5;
      color: var(--text-secondary);
      margin-top: 3px;
    }
    .crit--ok { border-left: 2px solid var(--success); }
    .crit--warn { border-left: 2px solid var(--warn); }
    .crit--fail { border-left: 2px solid var(--danger); }
    .crit--pending {
      border-left: 2px solid var(--text-muted);
      opacity: 0.75;
    }

    .deploy-card__hint {
      margin: 4px 0 0;
      font-size: 10.5px;
      color: var(--text-muted);
      font-style: italic;
    }
  `],
})
export class DeployScoreCardComponent {
  strategyId = input.required<number>();

  private api = inject(ApiService);

  data = signal<DeployScore | null>(null);
  loading = signal(true);
  expanded = signal(false);

  constructor() {
    queueMicrotask(() => this.load());
  }

  toggleExpanded(): void {
    this.expanded.update((v) => !v);
  }

  load(): void {
    this.loading.set(true);
    this.api.deployScore(this.strategyId()).subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  tierCls(tier: DeployScore['tier_label']): string {
    return 'deploy-card--' + tier.toLowerCase();
  }

  tierBadgeCls(tier: DeployScore['tier_label']): string {
    if (tier === 'WINNER' || tier === 'STRONG') return 'deploy-card__tier--ok';
    if (tier === 'PROMISING') return 'deploy-card__tier--warn';
    return 'deploy-card__tier--bad';
  }

  tierLabel(tier: DeployScore['tier_label']): string {
    return ({
      WINNER: 'Deploy-ready',
      STRONG: 'Strong',
      PROMISING: 'Promising',
      MARGINAL: 'Marginal',
      NEAR_FAIL: 'Near fail',
      FAIL: 'Fail',
    } as Record<DeployScore['tier_label'], string>)[tier];
  }

  critCls(s: CriterionStatus): string {
    return 'crit--' + s;
  }
}
