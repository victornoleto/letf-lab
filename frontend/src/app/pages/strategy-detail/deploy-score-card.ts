import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { ValidationGate, ValidationSnapshot } from '../../core/models';

@Component({
  selector: 'app-deploy-score-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="skeleton" style="height: 176px; margin-top: 12px;"></div>
    } @else if (data(); as d) {
      <section class="validation-card">
        <header class="validation-card__head">
          <div>
            <h2 class="validation-card__title">Validation Snapshot</h2>
            <p class="validation-card__sub">
              Statistical gates and time-based strategy validations
              @if (d.asof_date) { · {{ d.asof_date }} · {{ d.range_years }}y }
            </p>
          </div>
          <span class="validation-card__status" [ngClass]="d.gates_available ? 'status--ok' : 'status--pending'">
             @if (d.gates_available) { refresh ready } @else { waiting for refresh }
          </span>
        </header>

        <div class="validation-card__grid">
          @for (g of d.gates; track g.key) {
            <article class="gate" [ngClass]="gateCls(g)">
              <div class="gate__top">
                <span class="gate__label">{{ g.label }}</span>
                <span class="gate__value mono">{{ g.value }}</span>
              </div>
              <p class="gate__desc">{{ g.description }}</p>
            </article>
          }
          <article class="gate gate--wide" [ngClass]="gateCls(d.oos_fwd)">
            <div class="gate__top">
              <span class="gate__label">{{ d.oos_fwd.label }}</span>
              <span class="gate__value mono">{{ d.oos_fwd.value }}</span>
            </div>
            <p class="gate__desc">{{ d.oos_fwd.description }}</p>
          </article>
        </div>

        <p class="validation-card__note">{{ d.dsr_note }}</p>
      </section>
    }
  `,
  styles: [`
    .validation-card {
      margin-top: 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--surface);
      padding: 14px 16px;
    }
    .validation-card__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }
    .validation-card__title {
      margin: 0;
      font-size: 14px;
      font-weight: var(--fw-semibold);
      letter-spacing: var(--tracking-tight);
    }
    .validation-card__sub {
      margin: 3px 0 0;
      font-size: 11.5px;
      color: var(--text-muted);
    }
    .validation-card__status {
      font-family: var(--font-mono);
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 3px 8px;
      border-radius: 999px;
      background: var(--surface-muted);
      white-space: nowrap;
    }
    .status--ok { color: var(--success); background: rgba(34,197,94,0.10); }
    .status--pending { color: var(--warn); background: rgba(245,158,11,0.10); }

    .validation-card__grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }
    @media (max-width: 720px) {
      .validation-card__grid { grid-template-columns: 1fr; }
    }
    .gate {
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--surface-muted);
    }
    .gate--wide { grid-column: 1 / -1; }
    .gate--ok { border-left: 2px solid var(--success); }
    .gate--fail { border-left: 2px solid var(--danger); }
    .gate--pending { border-left: 2px solid var(--text-muted); }
    .gate__top {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
    }
    .gate__label { font-size: 12px; font-weight: var(--fw-medium); }
    .gate__value { font-size: 11px; color: var(--text-secondary); white-space: nowrap; }
    .gate__desc {
      margin: 4px 0 0;
      font-size: 11px;
      line-height: 1.45;
      color: var(--text-muted);
    }
    .validation-card__note {
      margin: 10px 0 0;
      font-size: 11px;
      line-height: 1.45;
      color: var(--text-muted);
      font-style: italic;
    }
  `],
})
export class DeployScoreCardComponent {
  strategyId = input.required<number>();

  private api = inject(ApiService);

  data = signal<ValidationSnapshot | null>(null);
  loading = signal(true);

  constructor() {
    queueMicrotask(() => this.load());
  }

  load(): void {
    this.loading.set(true);
    this.api.validationSnapshot(this.strategyId()).subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  gateCls(g: ValidationGate): string {
    if (g.passed === true) return 'gate--ok';
    if (g.passed === false) return 'gate--fail';
    return 'gate--pending';
  }
}
