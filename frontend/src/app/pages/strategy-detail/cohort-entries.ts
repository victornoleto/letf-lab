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
import { CohortReport } from '../../core/models';

@Component({
  selector: 'app-cohort-entries',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section">
      <header class="section__head">
        <div>
          <h2 class="section__title">Cohort Entry</h2>
          <p class="section__sub">
            Como a estratégia teria se saído começando em 8 datas históricas relevantes
            (forward {{ forwardYears() }}y).
          </p>
        </div>
      </header>

      <div class="section__body">
        @if (loading()) {
          <div class="skeleton" style="height: 220px;"></div>
        } @else if (error()) {
          <div class="empty"><div class="empty__title">{{ error() }}</div></div>
        } @else if (data(); as d) {
          <div class="table-wrap">
            <table class="table cohort-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Cenário</th>
                  <th class="th--num">CAGR</th>
                  <th class="th--num">Sortino</th>
                  <th class="th--num">MaxDD</th>
                </tr>
              </thead>
              <tbody>
                @for (e of d.entries; track e.entry_date) {
                  <tr [class.cohort-table__row--no-data]="!e.has_data">
                    <td class="mono">{{ e.entry_date }}</td>
                    <td>{{ e.label }}</td>
                    @if (e.has_data) {
                      <td class="td--num mono" [ngClass]="cagrCls(e.cagr)">
                        {{ formatPct(e.cagr) }}
                      </td>
                      <td class="td--num mono" [ngClass]="sortinoCls(e.sortino)">
                        {{ formatNum(e.sortino) }}
                      </td>
                      <td class="td--num mono" [ngClass]="mddCls(e.max_drawdown)">
                        {{ formatPct(e.max_drawdown) }}
                      </td>
                    } @else {
                      <td colspan="3" class="td--num cohort-table__no-data">
                        sem histórico ({{ e.n_days }}d disponíveis)
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .cohort-table__row--no-data { color: var(--text-muted); }
    .cohort-table__no-data {
      text-align: center;
      font-style: italic;
      color: var(--text-muted);
    }
    .num--good { color: var(--success); }
    .num--bad  { color: var(--danger); }
    .num--warn { color: var(--warn); }
  `],
})
export class CohortEntriesComponent implements OnInit {
  strategyId = input.required<number>();
  forwardYears = input<number>(5);

  private api = inject(ApiService);

  data = signal<CohortReport | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.cohortEntry(this.strategyId(), this.forwardYears()).subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: (err) => {
        this.error.set(err?.error?.detail ?? 'Falha ao calcular cohort entry');
        this.loading.set(false);
      },
    });
  }

  formatPct(v: number | null): string {
    return v === null ? '—' : `${(v * 100).toFixed(1)}%`;
  }

  formatNum(v: number | null): string {
    return v === null ? '—' : v.toFixed(2);
  }

  cagrCls(v: number | null): string {
    if (v === null) return '';
    if (v > 0.15) return 'num--good';
    if (v < 0) return 'num--bad';
    return 'num--warn';
  }

  sortinoCls(v: number | null): string {
    if (v === null) return '';
    if (v > 0.7) return 'num--good';
    if (v < 0.3) return 'num--bad';
    return 'num--warn';
  }

  mddCls(v: number | null): string {
    if (v === null) return '';
    if (v > -0.30) return 'num--good';
    if (v < -0.60) return 'num--bad';
    return 'num--warn';
  }
}
