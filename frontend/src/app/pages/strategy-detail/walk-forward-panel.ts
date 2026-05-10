import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { WalkForwardReport, WalkForwardWindow } from '../../core/models';

@Component({
  selector: 'app-walk-forward-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section">
      <header class="section__head">
        <div>
          <h2 class="section__title">Walk-Forward Validation</h2>
          <p class="section__sub">
            8 non-overlapping chronological windows. A window passes when the
            strategy stayed above the benchmark for >=50% of days (study gate G3).
          </p>
        </div>
        @if (data(); as d) {
          <span class="wf-summary" [ngClass]="summaryCls(d.n_passed, d.windows.length)">
            {{ d.n_passed }} of {{ d.windows.length }} windows pass
          </span>
        }
      </header>

      <div class="section__body">
        @if (loading()) {
          <div class="skeleton" style="height: 220px;"></div>
        } @else if (error()) {
          <div class="empty"><div class="empty__title">{{ error() }}</div></div>
        } @else if (data(); as d) {
          @if (d.windows.length === 0) {
            <div class="empty"><div class="empty__title">History is too short for 8 windows</div></div>
          } @else {
            <div class="table-wrap">
              <table class="table wf-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Period</th>
                    <th class="th--num">Sortino</th>
                    <th class="th--num">CAGR</th>
                    <th class="th--num">Max DD</th>
                    <th class="th--num">% above bench</th>
                    <th>Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  @for (w of d.windows; track w.index) {
                    <tr [class.wf-row--passed]="w.passed">
                      <td class="mono">{{ w.index + 1 }}</td>
                      <td class="mono">{{ w.start }} → {{ w.end }}</td>
                      <td class="td--num mono">{{ formatNum(w.sortino) }}</td>
                      <td class="td--num mono">{{ formatPct(w.cagr) }}</td>
                      <td class="td--num mono">{{ formatPct(w.max_drawdown) }}</td>
                      <td class="td--num mono">{{ formatPct(w.pct_above_benchmark) }}</td>
                      <td>
                        <span class="wf-badge" [ngClass]="badgeCls(w.passed)">
                          @if (w.passed) { PASS } @else { FAIL }
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      </div>
    </section>
  `,
  styles: [`
    .wf-summary {
      font-family: var(--font-mono);
      font-size: 11.5px;
      padding: 4px 10px;
      border-radius: 999px;
      background: var(--surface-muted);
    }
    .wf-summary--good { color: var(--success); background: rgba(34,197,94,0.10); }
    .wf-summary--warn { color: var(--warn); background: rgba(245,158,11,0.10); }
    .wf-summary--bad  { color: var(--danger); background: rgba(239,68,68,0.10); }

    .wf-row--passed td { background: rgba(34,197,94,0.04); }
    .wf-badge {
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 0.06em;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: var(--fw-medium);
    }
    .wf-badge--pass { color: var(--success); background: rgba(34,197,94,0.12); }
    .wf-badge--fail { color: var(--danger); background: rgba(239,68,68,0.10); }
  `],
})
export class WalkForwardPanelComponent implements OnInit {
  strategyId = input.required<number>();

  private api = inject(ApiService);

  data = signal<WalkForwardReport | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.walkForward(this.strategyId()).subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: (err) => {
        this.error.set(err?.error?.detail ?? 'Failed to compute walk-forward');
        this.loading.set(false);
      },
    });
  }

  formatNum(v: number | null): string {
    return v === null ? '—' : v.toFixed(2);
  }

  formatPct(v: number | null): string {
    return v === null ? '—' : `${(v * 100).toFixed(1)}%`;
  }

  summaryCls(passed: number, total: number): string {
    if (total === 0) return '';
    const ratio = passed / total;
    if (ratio >= 0.75) return 'wf-summary--good';
    if (ratio >= 0.50) return 'wf-summary--warn';
    return 'wf-summary--bad';
  }

  badgeCls(passed: boolean): string {
    return passed ? 'wf-badge--pass' : 'wf-badge--fail';
  }
}
