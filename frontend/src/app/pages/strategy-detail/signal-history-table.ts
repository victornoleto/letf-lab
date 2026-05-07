import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { SignalSnapshot, IndicatorResult } from '../../core/models';

const RANGES = ['1m', '3m', '6m', '1y', 'max'] as const;
type Range = typeof RANGES[number];

@Component({
  selector: 'app-signal-history-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section" style="margin-top: 12px;">
      <header class="section__head">
        <div>
          <h3 class="section__title">Signal history</h3>
          <p class="section__sub">{{ snapshots().length }} snapshots · range {{ range() }}</p>
        </div>
        <div class="pills">
          @for (r of ranges; track r) {
            <span
              class="pill"
              [class.pill--active]="range() === r"
              (click)="setRange(r)"
            >{{ r }}</span>
          }
        </div>
      </header>

      @if (loading()) {
        <div class="skeleton skeleton--block" style="height:120px"></div>
      } @else if (snapshots().length === 0) {
        <div class="empty" style="padding: 32px 16px;">
          <div class="empty__title">Sem histórico ainda</div>
          <div class="empty__copy">Será populado pelo cron diário (22h ET) ou ao usar refresh manual.</div>
        </div>
      } @else {
        <div class="table-wrap" style="border: none; border-radius: 0;">
          <table class="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Score</th>
                <th>Estado</th>
                @for (col of indicatorColumns(); track col) {
                  <th>{{ col }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (s of snapshotsDesc(); track s.date) {
                <tr>
                  <td class="mono">{{ s.date }}</td>
                  <td class="mono">{{ s.score }}/{{ s.total }}</td>
                  <td>
                    <span
                      class="status-cell"
                      [ngClass]="s.risk_on ? 'status-cell--on' : 'status-cell--off'"
                    >{{ s.risk_on ? 'on' : 'off' }}</span>
                  </td>
                  @for (col of indicatorColumns(); track col) {
                    <td style="text-align: center;">
                      @let r = findResult(s, col);
                      @if (r) {
                        <svg
                          class="ico"
                          width="14"
                          height="14"
                          [style.color]="r.gate_passed ? 'var(--success)' : 'var(--danger)'"
                        >
                          <use [attr.href]="r.gate_passed ? '#check' : '#x'"/>
                        </svg>
                      } @else {
                        <span style="color: var(--text-muted);">—</span>
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
})
export class SignalHistoryTableComponent {
  strategyId = input.required<number>();
  private api = inject(ApiService);
  private injector = inject(Injector);

  ranges = RANGES;
  range = signal<Range>('1y');
  snapshots = signal<SignalSnapshot[]>([]);
  loading = signal(false);

  snapshotsDesc = computed(() =>
    [...this.snapshots()].sort((a, b) => b.date.localeCompare(a.date)),
  );

  indicatorColumns = computed(() => {
    const names = new Set<string>();
    for (const s of this.snapshots()) {
      for (const r of s.results) names.add(r.indicator_name);
    }
    return [...names];
  });

  constructor() {
    effect(
      () => {
        const id = this.strategyId();
        const r = this.range();
        if (id) this.load(id, r);
      },
      { injector: this.injector },
    );
  }

  setRange(r: Range): void {
    this.range.set(r);
  }

  private load(id: number, range: Range): void {
    this.loading.set(true);
    this.api.signalHistory(id, range).subscribe({
      next: (rows) => {
        this.snapshots.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.snapshots.set([]);
        this.loading.set(false);
      },
    });
  }

  findResult(s: SignalSnapshot, name: string): IndicatorResult | null {
    return s.results.find((r) => r.indicator_name === name) ?? null;
  }
}
