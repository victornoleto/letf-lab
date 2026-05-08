import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Strategy } from '../../core/models';
import { stateOf, type CardState } from '../../shared/strategy-state';
import { ConfirmService } from '../../shared/confirm/confirm.service';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-strategies-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1 class="page-head__h1">Estratégias</h1>
          <p class="page-head__sub">{{ counts().total }} · {{ counts().on }} risk-on · {{ counts().borderline }} no fio · {{ counts().off }} risk-off</p>
        </div>
        <div class="page-head__actions">
          <div class="search">
            <svg class="ico" width="13" height="13"><use href="#search"/></svg>
            <input [(ngModel)]="searchTerm" placeholder="Buscar nome ou ticker…" />
          </div>
          <a routerLink="/strategies/new" class="btn btn--primary">
            <svg class="ico" width="12" height="12"><use href="#plus"/></svg>
            Nova estratégia
          </a>
        </div>
      </header>

      @if (loading()) {
        <div class="skeleton skeleton--card" style="height: 320px;"></div>
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
      } @else {
        <div class="table-wrap">
          <table class="table table--strategies">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Status</th>
                <th>Score</th>
                <th>Tickers</th>
                <th class="th--num">k</th>
                <th class="th--num">Indicadores</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (s of filteredStrategies(); track s.id) {
                <tr (click)="open(s.id)">
                  <td>
                    <span class="mono" style="font-weight: 500;">{{ s.name }}</span>
                  </td>
                  <td>
                    <span class="badge" [ngClass]="badgeCls(s)">{{ stateText(s) }}</span>
                  </td>
                  <td>
                    <div class="score-cell">
                      <div class="score-bar score-bar--sm">
                        @for (i of segs(s); track i) {
                          <span class="score-bar__seg" [ngClass]="segClass(s, i)"></span>
                        }
                      </div>
                      <span class="mono score-cell__num" [ngClass]="scoreNumCls(s)">
                        @if (s.current_signal) {
                          {{ s.current_signal.score }}/{{ s.current_signal.total }}
                        } @else { — }
                      </span>
                    </div>
                  </td>
                  <td class="mono">{{ s.benchmark_ticker }} → {{ s.risk_on_ticker }}</td>
                  <td class="td--num mono">{{ s.k_threshold }}</td>
                  <td class="td--num mono">{{ s.indicators.length }}</td>
                  <td>
                    <div class="table__actions">
                      <a class="icon-btn" (click)="$event.stopPropagation()"
                         [routerLink]="['/strategies', s.id, 'edit']" aria-label="Editar">
                        <svg width="13" height="13"><use href="#pencil"/></svg>
                      </a>
                      <button class="icon-btn"
                              (click)="$event.stopPropagation(); clone(s)"
                              [disabled]="cloning() === s.id"
                              aria-label="Clonar">
                        <svg width="13" height="13"><use href="#copy"/></svg>
                      </button>
                      <button class="icon-btn" (click)="$event.stopPropagation(); remove(s)" aria-label="Remover">
                        <svg width="13" height="13"><use href="#trash"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .table tr { cursor: pointer; }

    .score-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .score-cell__num {
      min-width: 30px;
      font-size: 11.5px;
      color: var(--text-secondary);
    }
    .score-cell__num--on { color: var(--success); }
    .score-cell__num--off { color: var(--danger); }
    .score-cell__num--borderline { color: var(--warn); }

    /* Slightly tighter than the dashboard card variant — fits a table row. */
    .score-bar--sm .score-bar__seg {
      width: 10px;
      height: 5px;
    }
  `],
})
export class StrategiesListComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  strategies = signal<Strategy[]>([]);
  loading = signal(true);
  searchTerm = '';
  cloning = signal<number | null>(null);

  protected stateOf = stateOf;
  stateText(s: Strategy) {
    return ({ on: 'Risk on', off: 'Risk off', borderline: 'No fio' } as Record<CardState, string>)[stateOf(s)];
  }

  badgeCls(s: Strategy): string {
    return ({ on: 'badge--on', off: 'badge--off', borderline: 'badge--borderline' } as Record<CardState, string>)[
      stateOf(s)
    ];
  }

  /** Segment indices — one per indicator on the strategy. */
  segs(s: Strategy): number[] {
    const total = s.current_signal?.total ?? s.indicators.length ?? 0;
    return Array.from({ length: Math.max(total, 1) }, (_, i) => i);
  }

  /** Per-segment fill class, matching the dashboard card semantics. */
  segClass(s: Strategy, i: number): string {
    const score = s.current_signal?.score ?? 0;
    const filled = i < score;
    if (!filled) return 'score-bar__seg';
    const stMap = {
      on: 'score-bar__seg--filled-on',
      off: 'score-bar__seg--filled-off',
      borderline: 'score-bar__seg--filled-borderline',
    } as const;
    return 'score-bar__seg ' + stMap[stateOf(s)];
  }

  scoreNumCls(s: Strategy): string {
    if (!s.current_signal) return '';
    return 'score-cell__num--' + stateOf(s);
  }

  filteredStrategies = computed(() => {
    const all = this.strategies();
    const q = this.searchTerm.toLowerCase().trim();
    if (!q) return all;
    return all.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.benchmark_ticker.toLowerCase().includes(q) ||
      s.risk_on_ticker.toLowerCase().includes(q) ||
      s.risk_off_ticker.toLowerCase().includes(q)
    );
  });

  counts = computed(() => {
    const all = this.strategies();
    let on = 0, off = 0, borderline = 0;
    for (const s of all) {
      const st = stateOf(s);
      if (st === 'on') on++; else if (st === 'borderline') borderline++; else off++;
    }
    return { total: all.length, on, borderline, off };
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.listStrategies().subscribe({
      next: (data) => { this.strategies.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  open(id: number): void {
    this.router.navigate(['/strategies', id]);
  }

  clone(s: Strategy): void {
    this.cloning.set(s.id);
    this.api.cloneStrategy(s.id).subscribe({
      next: (created) => {
        this.cloning.set(null);
        this.toast.push({ variant: 'success', message: `Clone criado: ${created.name}` });
        this.router.navigate(['/strategies', created.id, 'edit']);
      },
      error: (err) => {
        this.cloning.set(null);
        this.toast.push({
          variant: 'danger',
          message: err?.error?.detail ?? 'Erro ao clonar estratégia',
          duration: 8000,
        });
      },
    });
  }

  async remove(s: Strategy): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Remover estratégia',
      message: `${s.name} será removida permanentemente. Esta ação não pode ser desfeita.`,
      confirmLabel: 'Remover',
      variant: 'danger',
    });
    if (!ok) return;
    this.api.deleteStrategy(s.id).subscribe({
      next: () => {
        this.toast.push({ variant: 'success', message: 'Estratégia removida' });
        this.load();
      },
      error: (err) =>
        this.toast.push({
          variant: 'danger',
          message: err?.error?.detail ?? 'Erro ao remover',
          duration: 8000,
        }),
    });
  }
}
