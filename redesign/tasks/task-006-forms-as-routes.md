# Task 006 (v2) — Forms back to routes (revert modal-based forms)

**Goal:** Revert the modal-based form pattern from v1. Strategy and Indicator forms become **page components at dedicated routes** (`/strategies/new`, `/strategies/:id/edit`, `/indicators/new`, `/indicators/:id/edit`). The reusable `<app-modal>` component stays for confirm-delete and future command palette only — it is NOT wrapped around forms anymore.

This is the biggest behavior revert in v2. After it, the app navigates fully (no modal opens for create/edit).

## Pre-conditions

- Tasks 001-005 done.
- `<app-modal>` exists in `frontend/src/app/shared/modal/modal.ts` and renders correctly with the new modal SCSS — leave it intact (it's used for confirm-delete in task 010).
- `_form.scss` partial (form, row-2, chips-field, kmin, form-footer) exists.

## Sources

1. `design-export/layouts/14-forms.md` — full Strategy & Indicator form specs, single-column 560px layout, sticky footer, validation rules
2. `design-export/00-OVERVIEW.md` "Estrutura" — "Forms são telas, não modais dialog. Rotas `/strategies/new`, `/strategies/:id/edit`. Layout single-column 560px, label acima do input, hint mono embaixo, footer sticky com `Cancelar` / `Salvar`."

## Files to modify

### `frontend/src/app/app.routes.ts`

Add the 4 form routes back. Final route table:

```ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
  },
  {
    path: 'strategies',
    loadComponent: () =>
      import('./pages/strategies/strategies-list').then((m) => m.StrategiesListComponent),
  },
  {
    path: 'strategies/new',
    loadComponent: () =>
      import('./pages/strategies/strategy-form').then((m) => m.StrategyFormComponent),
  },
  {
    path: 'strategies/:id/edit',
    loadComponent: () =>
      import('./pages/strategies/strategy-form').then((m) => m.StrategyFormComponent),
  },
  {
    path: 'strategies/:id',
    loadComponent: () =>
      import('./pages/strategy-detail/strategy-detail').then((m) => m.StrategyDetailComponent),
  },
  {
    path: 'indicators',
    loadComponent: () =>
      import('./pages/indicators/indicators-list').then((m) => m.IndicatorsListComponent),
  },
  {
    path: 'indicators/new',
    loadComponent: () =>
      import('./pages/indicators/indicator-form').then((m) => m.IndicatorFormComponent),
  },
  {
    path: 'indicators/:id/edit',
    loadComponent: () =>
      import('./pages/indicators/indicator-form').then((m) => m.IndicatorFormComponent),
  },
  { path: '**', redirectTo: 'dashboard' },
];
```

### `frontend/src/app/pages/strategies/strategy-form.ts`

Rewrite as a page component (no `<app-modal>` wrapper). Layout follows `design-export/layouts/14-forms.md`.

```ts
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Indicator } from '../../core/models';
// (no ModalComponent import — this is a page now)

@Component({
  selector: 'app-strategy-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <a routerLink="/strategies" class="breadcrumb">
        <svg class="ico" width="12" height="12"><use href="#chevron-right"/></svg>
        <span style="transform: rotate(180deg); display: inline-flex;">
          <svg width="12" height="12"><use href="#chevron-right"/></svg>
        </span>
        Estratégias
      </a>

      <h1 class="page-h1">{{ strategyId() ? 'Editar' : 'Nova' }} estratégia</h1>

      @if (loading()) {
        <div class="skeleton skeleton--card" style="height: 360px; max-width: 560px;"></div>
      } @else {
        <form class="form" (submit)="$event.preventDefault(); save()">

          <div class="field" [class.is-invalid]="touched.name && !validName()">
            <label class="label" for="name">Nome</label>
            <input id="name" class="input" [class.input--error]="touched.name && !validName()"
                   [(ngModel)]="model.name" name="name" maxlength="64"
                   (blur)="touched.name = true" />
            <p class="hint">{{ model.name.length }}/64 caracteres</p>
            @if (touched.name && !validName()) {
              <p class="error">Nome é obrigatório</p>
            }
          </div>

          <div class="field">
            <label class="label" for="bench">Benchmark ticker</label>
            <input id="bench" class="input input--mono" [(ngModel)]="model.benchmark_ticker"
                   name="benchmark" maxlength="6" (blur)="touched.benchmark = true"
                   (input)="model.benchmark_ticker = $any($event.target).value.toUpperCase()" />
            <p class="hint">Index/ETF de referência (ex: QQQ, SPY, IWM)</p>
          </div>

          <div class="row-2">
            <div class="field">
              <label class="label" for="riskOn">Risk-on ticker</label>
              <input id="riskOn" class="input input--mono" [(ngModel)]="model.risk_on_ticker"
                     name="risk_on" maxlength="6"
                     (input)="model.risk_on_ticker = $any($event.target).value.toUpperCase()" />
              <p class="hint">Quando indicators ativos</p>
            </div>
            <div class="field">
              <label class="label" for="riskOff">Risk-off ticker</label>
              <input id="riskOff" class="input input--mono" [(ngModel)]="model.risk_off_ticker"
                     name="risk_off" maxlength="6"
                     (input)="model.risk_off_ticker = $any($event.target).value.toUpperCase()" />
              <p class="hint">Quando indicators desativam</p>
            </div>
          </div>

          <div class="field">
            <label class="label">
              Indicadores (k de N)
              <span class="kmin">
                k mínimo:
                <select [(ngModel)]="model.k_threshold" name="k">
                  @for (i of kOptions(); track i) { <option [value]="i">{{ i }}</option> }
                </select>
              </span>
            </label>
            <div class="chips-field">
              @for (ind of allIndicators(); track ind.id) {
                <button type="button"
                        class="chip"
                        [class.chip--selected]="isSelected(ind.id)"
                        (click)="toggleIndicator(ind.id)">
                  {{ ind.name }}
                </button>
              }
            </div>
            <p class="hint">{{ model.indicator_ids.length }} selecionado(s) · {{ model.k_threshold }} mínimo(s) para risk-on</p>
          </div>

          @if (error()) {
            <div class="banner banner--danger" style="margin-top: 16px;">
              <svg class="ico" width="14" height="14"><use href="#alert-circle"/></svg>
              <span>{{ error() }}</span>
            </div>
          }

          <div class="form-footer">
            <a routerLink="/strategies" class="btn">Cancelar</a>
            <button type="submit" class="btn btn--primary" [disabled]="!canSave() || saving()">
              @if (saving()) {
                <svg class="ico spin" width="11" height="11"><use href="#refresh"/></svg>
                Salvando…
              } @else {
                {{ strategyId() ? 'Salvar' : 'Criar e rodar' }}
              }
            </button>
          </div>
        </form>
      }
    </div>
  `,
})
export class StrategyFormComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  strategyId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  allIndicators = signal<Indicator[]>([]);

  touched = { name: false, benchmark: false, riskOn: false, riskOff: false };

  model = {
    name: '',
    benchmark_ticker: '',
    risk_on_ticker: '',
    risk_off_ticker: 'ZROZ',
    k_threshold: 2,
    enabled: true,
    indicator_ids: [] as number[],
  };

  kOptions = computed(() => {
    const n = Math.max(this.model.indicator_ids.length, 1);
    return Array.from({ length: n }, (_, i) => i + 1);
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.api.listIndicators().subscribe({
      next: (inds) => {
        this.allIndicators.set(inds);
        const idParam = this.route.snapshot.paramMap.get('id');
        if (idParam) {
          this.strategyId.set(+idParam);
          this.api.getStrategy(+idParam).subscribe({
            next: (s) => { this.populate(s); this.loading.set(false); },
            error: () => { this.error.set('Estratégia não encontrada'); this.loading.set(false); },
          });
        } else {
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  private populate(s: any): void {
    this.model = {
      name: s.name,
      benchmark_ticker: s.benchmark_ticker,
      risk_on_ticker: s.risk_on_ticker,
      risk_off_ticker: s.risk_off_ticker,
      k_threshold: s.k_threshold,
      enabled: s.enabled,
      indicator_ids: s.indicators.map((i: Indicator) => i.id),
    };
  }

  validName() { return this.model.name.trim().length > 0; }

  isSelected(id: number) { return this.model.indicator_ids.includes(id); }
  toggleIndicator(id: number) {
    if (this.isSelected(id)) {
      this.model.indicator_ids = this.model.indicator_ids.filter(x => x !== id);
    } else {
      this.model.indicator_ids = [...this.model.indicator_ids, id];
    }
    if (this.model.k_threshold > this.model.indicator_ids.length) {
      this.model.k_threshold = Math.max(1, this.model.indicator_ids.length);
    }
  }

  canSave(): boolean {
    return this.validName()
      && this.model.benchmark_ticker.length > 0
      && this.model.risk_on_ticker.length > 0
      && this.model.risk_off_ticker.length > 0
      && this.model.indicator_ids.length > 0
      && this.model.k_threshold >= 1
      && this.model.k_threshold <= this.model.indicator_ids.length;
  }

  save(): void {
    if (!this.canSave() || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    const id = this.strategyId();
    const obs = id ? this.api.updateStrategy(id, this.model) : this.api.createStrategy(this.model);
    obs.subscribe({
      next: (s) => { this.saving.set(false); this.router.navigate(['/strategies', s.id]); },
      error: (err) => { this.saving.set(false); this.error.set(this.formatError(err)); },
    });
  }

  private formatError(err: any): string {
    const detail = err?.error?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map(d => d.msg ?? JSON.stringify(d)).join('; ');
    return err?.message ?? 'Erro ao salvar';
  }
}
```

Notes:
- `<input>` modifier `(input)` calls `toUpperCase()` to enforce uppercase tickers.
- Validation is **on blur** (not on input) — see `touched` map.
- Indicators are `.chip`s — multi-select via toggle.
- `kmin` selector inline beside the label, recomputed from `kOptions()`.
- On success, redirect to `/strategies/:id` (detail page).

### `frontend/src/app/pages/indicators/indicator-form.ts`

Same pattern. Single-column page with breadcrumb back to `/indicators`. Schema-driven params per `IndicatorTypeInfo`.

```ts
@Component({
  selector: 'app-indicator-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <a routerLink="/indicators" class="breadcrumb">… ‹ Indicadores</a>
      <h1 class="page-h1">{{ indicatorId() ? 'Editar' : 'Novo' }} indicador</h1>

      @if (loading()) { <div class="skeleton skeleton--card" style="height: 320px;"></div> }
      @else {
        <form class="form" (submit)="$event.preventDefault(); save()">

          <div class="field">
            <label class="label" for="iname">Nome</label>
            <input id="iname" class="input" [(ngModel)]="model.name" name="name" />
          </div>

          <div class="field">
            <label class="label" for="itype">Tipo</label>
            <select id="itype" class="input" [(ngModel)]="model.type" name="type"
                    (ngModelChange)="onTypeChange()" [disabled]="!!indicatorId()">
              @for (t of types(); track t.type) {
                <option [value]="t.type">{{ t.label }}</option>
              }
            </select>
            @if (selectedType()) {
              <p class="hint">{{ selectedType()!.description }}</p>
            }
          </div>

          @if (selectedType()) {
            <div class="row-2">
              @for (p of paramKeys(); track p) {
                <div class="field">
                  <label class="label">{{ p }}</label>
                  <input class="input input--mono" type="number"
                         [(ngModel)]="model.params[p]" [name]="'p_' + p"
                         [step]="paramStep(p)" [min]="paramMin(p)" [max]="paramMax(p)" />
                  @if (paramDescription(p)) {
                    <p class="hint">{{ paramDescription(p) }}</p>
                  }
                </div>
              }
            </div>
          }

          <div class="field">
            <label class="label" for="idesc">Descrição</label>
            <textarea id="idesc" class="input" rows="3"
                      [(ngModel)]="model.description" name="description"
                      style="height: auto; padding: 8px 10px;"></textarea>
            <p class="hint">Opcional · explica o uso do indicador</p>
          </div>

          @if (error()) {
            <div class="banner banner--danger" style="margin-top: 16px;">
              <svg class="ico" width="14" height="14"><use href="#alert-circle"/></svg>
              <span>{{ error() }}</span>
            </div>
          }

          <div class="form-footer">
            <a routerLink="/indicators" class="btn">Cancelar</a>
            <button type="submit" class="btn btn--primary" [disabled]="!canSave() || saving()">
              {{ saving() ? 'Salvando…' : 'Salvar' }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
})
export class IndicatorFormComponent { /* ... methods analogous to existing impl ... */ }
```

(Keep the param-resolving logic from the existing component — `selectedType()`, `paramKeys()`, `paramStep()`, etc. Just remove the `<app-modal>` wrapper and `open`/`indicatorId` `input()` signals.)

After save, redirect to `/indicators`.

### Cleanup of dead code

Search and remove:
- All `[open]="formOpen()"` patterns in list templates.
- All `(saved)`/`(cancelled)` event bindings on form components.
- All references to `?new=true` and `?edit=ID` query params reading logic in list components (will be re-cleaned in task 007).

## Files NOT to modify in this task

- `frontend/src/app/shared/modal/modal.ts` — kept for confirm-delete (task 010).
- `frontend/src/app/pages/strategies/strategies-list.ts` — task 007 redoes the list page.
- `frontend/src/app/pages/indicators/indicators-list.ts` — same.

If list components still try to render `<app-strategy-form>` / `<app-indicator-form>` inline, that breaks build. So **also** in this task: remove those template usages and the supporting signals (`formOpen`, `editingId`) — leave the list templates rendering the existing tables for now (task 007 redoes them). Replace any `<button (click)="openCreate()">` with `<a routerLink="/strategies/new">`.

## Verification

```bash
cd /var/www/pessoal/ai-swing/frontend
npx ng build --configuration=development
```

Manual smoke:
- Click "Nova estratégia" anywhere → URL changes to `/strategies/new` and the form page renders.
- Fill the form → save → redirected to `/strategies/:id`.
- Cancel → back to `/strategies` (the list).
- Edit on a row → `/strategies/:id/edit` → submit → redirected to detail.
- Same flow for `/indicators/new` and `/indicators/:id/edit`.

## Definition of done

1. Routes for `*/new` and `*/:id/edit` exist in `app.routes.ts`.
2. Form components are page-shaped (no modal wrapper), with single-column 560px layout.
3. List components no longer render forms inline; their create/edit buttons are router links.
4. Build passes.
5. Print `TASK DONE: task-006-forms-as-routes.md` at end.
