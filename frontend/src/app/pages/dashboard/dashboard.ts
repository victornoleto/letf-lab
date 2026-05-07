import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Strategy } from '../../core/models';
import { StrategyCardComponent } from './strategy-card';
import { stateOf } from '../../shared/strategy-state';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, StrategyCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1 class="page-head__h1">Dashboard</h1>
          <p class="page-head__sub">
            {{ counts().on }}/{{ counts().total }} risk-on
            @if (counts().borderline > 0) { · {{ counts().borderline }} no fio }
            @if (asof()) { · asof <span class="mono">{{ asof() }}</span> }
          </p>
        </div>
        <div class="page-head__actions">
          <div class="pills">
            <span class="pill" [class.pill--active]="filter() === 'all'" (click)="setFilter('all')">Todas</span>
            <span class="pill" [class.pill--active]="filter() === 'on'"  (click)="setFilter('on')">Risk-on</span>
            <span class="pill" [class.pill--active]="filter() === 'off'" (click)="setFilter('off')">Risk-off</span>
          </div>
          <a routerLink="/strategies/new" class="btn btn--primary">
            <svg class="ico" width="12" height="12"><use href="#plus"/></svg>
            Nova estratégia
          </a>
        </div>
      </header>

      @if (loading()) {
        <div class="grid">
          @for (_ of [1,2,3,4,5,6]; track _) {
            <div class="card">
              <div class="card__head" style="padding: 12px 14px 10px;">
                <div class="skeleton skeleton--text" style="width: 110px"></div>
                <div class="skeleton" style="width: 56px; height: 16px; border-radius: 4px;"></div>
              </div>
              <div class="card__spark"><div class="skeleton" style="height: 42px"></div></div>
              <div class="card__rows">
                @for (_ of [1,2,3,4]; track _) {
                  <div class="skeleton skeleton--text" style="width: 80%"></div>
                }
              </div>
            </div>
          }
        </div>
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
      } @else if (filteredStrategies().length === 0) {
        <div class="empty">
          <svg class="empty__icon" width="24" height="24"><use href="#filter"/></svg>
          <div class="empty__title">Nenhum resultado</div>
          <button class="btn" (click)="setFilter('all')">Limpar filtros</button>
        </div>
      } @else {
        <div class="grid">
          @for (s of filteredStrategies(); track s.id) {
            <app-strategy-card [strategy]="s"/>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      gap: var(--space-4);
    }
  `],
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  strategies = signal<Strategy[]>([]);
  loading = signal(true);
  filter = signal<'all' | 'on' | 'off'>('all');

  asof = computed(() => this.strategies()[0]?.current_signal?.date ?? null);

  counts = computed(() => {
    const all = this.strategies();
    let on = 0, borderline = 0, off = 0;
    for (const s of all) {
      const st = stateOf(s);
      if (st === 'on') on++; else if (st === 'borderline') borderline++; else off++;
    }
    return { total: all.length, on, borderline, off };
  });

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

  ngOnInit(): void {
    const f = this.route.snapshot.queryParamMap.get('filter') as any;
    if (f === 'on' || f === 'off' || f === 'all') this.filter.set(f);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.listStrategies().subscribe({
      next: (data) => { this.strategies.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  setFilter(f: 'all' | 'on' | 'off'): void {
    this.filter.set(f);
    this.router.navigate([], { queryParams: { filter: f === 'all' ? null : f }, queryParamsHandling: 'merge' });
  }
}
