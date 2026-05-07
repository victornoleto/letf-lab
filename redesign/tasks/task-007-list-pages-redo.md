# Task 007 (v2) — List pages: tables with status-cell, hover actions, search, pagination

**Goal:** Refactor `strategies-list.ts` and `indicators-list.ts` to use the Linear-DNA table pattern: header with sub-line, search box on the right, table with status-cell dot (NOT badge), hover-reveal action icons, optional pagination footer.

## Pre-conditions

- Tasks 001-006 done.
- `_table.scss`, `_status-cell.scss`, `_search.scss`, `_pagination.scss`, `_list-head` (in `_table.scss` or a sibling), `.icon-btn` available.
- Form routes exist (`/strategies/new`, `/strategies/:id/edit`, `/indicators/new`, `/indicators/:id/edit`) — buttons here use `routerLink` to those routes.

## Sources

1. `design-export/layouts/13-list-pages.md` — full HTML + SCSS specs for both lists, status-cell, search, pagination, sorting, hover actions

## Files to modify

### `frontend/src/app/pages/strategies/strategies-list.ts`

```ts
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Strategy } from '../../core/models';
import { stateOf, type CardState } from '../../shared/strategy-state';

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

  remove(s: Strategy): void {
    // For task 010 we replace with a confirm modal.
    if (!confirm(`Remover estratégia "${s.name}"?`)) return;
    this.api.deleteStrategy(s.id).subscribe({
      next: () => this.load(),
      error: (err) => alert(err?.error?.detail ?? 'Erro ao remover'),
    });
  }
}
```

Note:
- Uses `stateOf()` from `shared/strategy-state.ts`.
- Status column uses `.status-cell` with dot prefix — NOT `.badge`.
- Action buttons: edit is a `routerLink`, delete is a button (with `confirm()` for now — task 010 swaps to confirm modal).
- No filter pills here (those are dashboard-only).
- Pagination omitted (≤ 20 items typical). Add if `total > 20` in a follow-up — out of scope here.

### `frontend/src/app/pages/indicators/indicators-list.ts`

Mirror structure with columns: Nome · Tipo · Parâmetros · Descrição · Usado por · Ações.

```ts
@Component({
  selector: 'app-indicators-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <header class="list-head">
        <div>
          <h1 class="page-h1">Indicadores</h1>
          <p class="list-head__sub">{{ indicators().length }} cadastrados</p>
        </div>
        <div class="list-head__actions">
          <div class="search">
            <svg class="ico" width="13" height="13"><use href="#search"/></svg>
            <input [(ngModel)]="searchTerm" placeholder="Buscar nome ou tipo…" />
          </div>
          <a routerLink="/indicators/new" class="btn btn--primary">
            <svg class="ico" width="12" height="12"><use href="#plus"/></svg>
            Novo
          </a>
        </div>
      </header>

      @if (loading()) { <div class="skeleton skeleton--card" style="height: 240px;"></div> }
      @else if (indicators().length === 0) {
        <div class="empty">
          <svg class="empty__icon" width="24" height="24"><use href="#indicators"/></svg>
          <div class="empty__title">Nenhum indicador ainda</div>
          <div class="empty__copy">Adicione indicadores para usar em estratégias.</div>
          <a routerLink="/indicators/new" class="btn btn--primary">
            <svg class="ico" width="12" height="12"><use href="#plus"/></svg>
            Novo indicador
          </a>
        </div>
      } @else {
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Nome</th><th>Tipo</th><th>Parâmetros</th>
                <th>Descrição</th><th></th>
              </tr>
            </thead>
            <tbody>
              @for (ind of filteredIndicators(); track ind.id) {
                <tr (click)="edit(ind.id)">
                  <td><span class="mono" style="font-weight: 500;">{{ ind.name }}</span></td>
                  <td><span class="badge badge--neutral">{{ ind.type }}</span></td>
                  <td class="mono">{{ paramsString(ind) }}</td>
                  <td style="color: var(--text-muted);">{{ ind.description ?? '—' }}</td>
                  <td>
                    <div class="table__actions">
                      <a class="icon-btn" (click)="$event.stopPropagation()"
                         [routerLink]="['/indicators', ind.id, 'edit']" aria-label="Editar">
                        <svg width="13" height="13"><use href="#pencil"/></svg>
                      </a>
                      <button class="icon-btn" (click)="$event.stopPropagation(); remove(ind)" aria-label="Remover">
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
  styles: [`.table tr { cursor: pointer; }`],
})
export class IndicatorsListComponent {
  // analogous: searchTerm, filteredIndicators, paramsString, load, remove(), edit(id) -> router.navigate(['/indicators', id, 'edit'])
}
```

## Files NOT to modify

- Form components (already done in task 006).
- Dashboard / strategy-detail.

## Verification

```bash
cd /var/www/pessoal/ai-swing/frontend
npx ng build --configuration=development
```

Manual smoke:
- `/strategies` shows the new table with status-cell dots (green/red/amber).
- Hover row → edit + delete icons appear on the right.
- Click row body → navigates to detail.
- Click edit icon → navigates to `/strategies/:id/edit` (does NOT open detail).
- Search filters in real time.
- `/indicators` mirrors the pattern.

## Definition of done

1. Both list components rewritten with table-wrap + status-cell + search + hover actions.
2. Empty state visible when no items.
3. Build passes.
4. Print `TASK DONE: task-007-list-pages-redo.md` at end.
