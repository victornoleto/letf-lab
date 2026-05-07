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
      <header class="list-head">
        <div>
          <h1 class="page-h1">Estratégias</h1>
          <p class="list-head__sub">{{ counts().total }} · {{ counts().on }} risk-on · {{ counts().borderline }} no fio · {{ counts().off }} risk-off</p>
        </div>
        <div class="list-head__actions">
          <div class="search">
            <svg class="ico" width="13" height="13"><use href="#search"/></svg>
            <input [(ngModel)]="searchTerm" placeholder="Buscar nome ou ticker…" />
          </div>
          <a routerLink="/strategies/new" class="btn btn--primary">
            <svg class="ico" width="12" height="12"><use href="#plus"/></svg>
            Nova
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
          <table class="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Status</th>
                <th>Score</th>
                <th>Tickers</th>
                <th>k</th>
                <th>Indicadores</th>
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
                    <span class="status-cell" [ngClass]="'status-cell--' + stateOf(s)">
                      {{ stateText(s) }}
                    </span>
                  </td>
                  <td class="mono">
                    @if (s.current_signal) {
                      {{ s.current_signal.score }}/{{ s.current_signal.total }}
                    } @else { — }
                  </td>
                  <td class="mono">{{ s.benchmark_ticker }} → {{ s.risk_on_ticker }}</td>
                  <td class="mono">{{ s.k_threshold }}</td>
                  <td class="mono">{{ s.indicators.length }}</td>
                  <td>
                    <div class="table__actions">
                      <a class="icon-btn" (click)="$event.stopPropagation()"
                         [routerLink]="['/strategies', s.id, 'edit']" aria-label="Editar">
                        <svg width="13" height="13"><use href="#pencil"/></svg>
                      </a>
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

  protected stateOf = stateOf;
  stateText(s: Strategy) {
    return ({ on: 'Risk on', off: 'Risk off', borderline: 'No fio' } as Record<CardState, string>)[stateOf(s)];
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
