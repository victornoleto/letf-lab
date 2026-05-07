# Task 006 — List pages (Strategies + Indicators) using `.table-wrap`

**Goal:** Refactor `strategies-list.ts` and `indicators-list.ts` to use the design's table pattern: `.table-wrap` + `.table` + `.t-head` + `.t-body` + `.cell-stack` + `.t-actions`. Add a search input (client-side filter, no backend) and a header that follows the page convention. Action buttons become icon-only (`btn--icon btn--ghost`).

## Pre-conditions

- Tasks 001-005 done.
- `.table-wrap`, `.table`, `.cell-stack`, `.t-actions`, `.t-link`, `.t-muted`, `.search-input`, `.input--inline`, `.chip`, `.chip--more`, `.badge` available.
- `shared/strategy-state.ts` from task 004 exists.

## Sources

1. `design-export/layouts/13-list-pages.md` — full HTML + SCSS for both list pages
2. `design-export/04-components.md` — Table, Chip, Badge variants

## Files to modify

| File | Changes |
|---|---|
| `frontend/src/app/pages/strategies/strategies-list.ts` | Header (title + subtitle + search + filter + New), table |
| `frontend/src/app/pages/indicators/indicators-list.ts` | Header (title + subtitle + search + New), table |

The forms (`strategy-form.ts`, `indicator-form.ts`) and modal styling are NOT in this task — they remain functional in their current state (modal still opens, forms still submit). Task 007 redesigns them.

## strategies-list.ts template

```html
<section class="page">
  <header class="page__head">
    <div>
      <h1 class="page__title">Estratégias</h1>
      <p class="page__subtitle">{{ strategies().length }} total · {{ enabledCount() }} ativas</p>
    </div>
    <div class="page__actions">
      <div class="search-input">
        <svg class="ico" width="14" height="14"><use href="#search"/></svg>
        <input class="input input--inline" placeholder="Filtrar por nome ou ticker…"
               [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event)" />
      </div>
      <button class="btn btn--primary btn--sm" (click)="openCreate()">
        <svg class="ico" width="14" height="14"><use href="#plus"/></svg>
        Nova
      </button>
    </div>
  </header>

  @if (loading()) {
    <div class="table-wrap">
      <div class="skeleton skeleton--block" style="height:44px;margin:0"></div>
      @for (i of [1,2,3,4,5]; track i) {
        <div class="skeleton skeleton--block" style="height:44px;margin-top:1px"></div>
      }
    </div>
  } @else if (strategies().length === 0) {
    <div class="empty">
      <svg class="empty__ico" width="48" height="48"><use href="#strategies"/></svg>
      <h3 class="empty__title">Nenhuma estratégia</h3>
      <p class="empty__msg">Crie sua primeira estratégia para começar.</p>
      <button class="btn btn--primary btn--md" (click)="openCreate()">
        <svg class="ico" width="16" height="16"><use href="#plus"/></svg>
        Nova estratégia
      </button>
    </div>
  } @else {
    <div class="table-wrap">
      <table class="table">
        <thead class="t-head">
          <tr>
            <th>Nome</th>
            <th>Tickers</th>
            <th>Indicadores</th>
            <th class="num">Score</th>
            <th>Estado</th>
            <th>Última atualização</th>
            <th class="t-actions"></th>
          </tr>
        </thead>
        <tbody class="t-body">
          @for (s of filteredStrategies(); track s.id) {
            <tr [routerLink]="['/strategies', s.id]">
              <td>
                <div class="cell-stack">
                  <span class="cell-stack__title">{{ s.name }}</span>
                  <span class="cell-stack__sub mono">k = {{ s.k_threshold }}</span>
                </div>
              </td>
              <td class="mono">{{ s.benchmark_ticker }} · {{ s.risk_on_ticker }} ↔ {{ s.risk_off_ticker }}</td>
              <td>
                @for (i of s.indicators.slice(0, 2); track i.id) {
                  <span class="chip">{{ i.name }}</span>
                }
                @if (s.indicators.length > 2) {
                  <span class="chip chip--more">+{{ s.indicators.length - 2 }}</span>
                }
              </td>
              <td class="num mono">
                @if (s.current_signal) {
                  <span [class]="scoreCls(s)">{{ s.current_signal.score }}</span>
                  <span class="t-muted"> / {{ s.current_signal.total }}</span>
                } @else { <span class="t-muted">—</span> }
              </td>
              <td>
                @if (s.current_signal) {
                  <span class="badge" [class]="badgeCls(s)">{{ stateText(s) }}</span>
                } @else {
                  <span class="badge badge--neutral">SEM DADOS</span>
                }
              </td>
              <td class="mono t-muted">{{ s.current_signal?.date ?? '—' }}</td>
              <td class="t-actions">
                <button class="btn btn--ghost btn--sm btn--icon" (click)="$event.stopPropagation(); openEdit(s.id)" aria-label="Editar">
                  <svg class="ico" width="14" height="14"><use href="#pencil"/></svg>
                </button>
                <button class="btn btn--ghost btn--sm btn--icon" (click)="$event.stopPropagation(); remove(s)" aria-label="Remover">
                  <svg class="ico" width="14" height="14"><use href="#trash"/></svg>
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  }

  <app-strategy-form
    [open]="formOpen()"
    [strategyId]="editingId()"
    (saved)="onSaved()"
    (cancelled)="onCancelled()"
  />
</section>
```

Component class additions:
```ts
searchTerm = signal('');
filteredStrategies = computed(() => {
  const all = this.strategies();
  const q = this.searchTerm().toLowerCase().trim();
  if (!q) return all;
  return all.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.benchmark_ticker.toLowerCase().includes(q) ||
    s.risk_on_ticker.toLowerCase().includes(q) ||
    s.risk_off_ticker.toLowerCase().includes(q)
  );
});
enabledCount = computed(() => this.strategies().filter(s => s.enabled).length);

protected stateText(s: Strategy): string { return stateLabel(s); }
protected badgeCls(s: Strategy): string { return badgeClass(s); }
protected scoreCls(s: Strategy): string { return scoreClass(s); }
```

Imports update — add `FormsModule`, helpers from `shared/strategy-state.ts`.

## indicators-list.ts template

```html
<section class="page">
  <header class="page__head">
    <div>
      <h1 class="page__title">Indicadores</h1>
      <p class="page__subtitle">{{ indicators().length }} cadastrados</p>
    </div>
    <div class="page__actions">
      <div class="search-input">
        <svg class="ico" width="14" height="14"><use href="#search"/></svg>
        <input class="input input--inline" placeholder="Filtrar por nome ou tipo…"
               [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event)" />
      </div>
      <button class="btn btn--primary btn--sm" (click)="openCreate()">
        <svg class="ico" width="14" height="14"><use href="#plus"/></svg>
        Novo
      </button>
    </div>
  </header>

  @if (loading()) {
    <div class="skeleton skeleton--block" style="height:200px"></div>
  } @else if (indicators().length === 0) {
    <div class="empty">
      <svg class="empty__ico" width="48" height="48"><use href="#indicators"/></svg>
      <h3 class="empty__title">Sem indicadores ainda</h3>
      <p class="empty__msg">Indicadores são as regras de risco que alimentam as estratégias.</p>
      <button class="btn btn--primary btn--md" (click)="openCreate()">
        <svg class="ico" width="16" height="16"><use href="#plus"/></svg>
        Novo indicador
      </button>
    </div>
  } @else {
    <div class="table-wrap">
      <table class="table">
        <thead class="t-head">
          <tr>
            <th>Nome</th>
            <th>Tipo</th>
            <th>Parâmetros</th>
            <th>Descrição</th>
            <th class="t-actions"></th>
          </tr>
        </thead>
        <tbody class="t-body">
          @for (ind of filteredIndicators(); track ind.id) {
            <tr>
              <td>
                <div class="cell-stack">
                  <span class="cell-stack__title">{{ ind.name }}</span>
                </div>
              </td>
              <td><span class="badge badge--neutral">{{ ind.type }}</span></td>
              <td class="mono t-muted">{{ paramsString(ind) }}</td>
              <td class="t-muted">{{ ind.description ?? '—' }}</td>
              <td class="t-actions">
                <button class="btn btn--ghost btn--sm btn--icon" (click)="openEdit(ind.id)" aria-label="Editar">
                  <svg class="ico" width="14" height="14"><use href="#pencil"/></svg>
                </button>
                <button class="btn btn--ghost btn--sm btn--icon" (click)="remove(ind)" aria-label="Remover">
                  <svg class="ico" width="14" height="14"><use href="#trash"/></svg>
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  }

  <app-indicator-form
    [open]="formOpen()"
    [indicatorId]="editingId()"
    (saved)="onSaved()"
    (cancelled)="onCancelled()"
  />
</section>
```

Add `searchTerm` + `filteredIndicators` computed, similar to strategies-list.

## What NOT to change

- The form components' code (`strategy-form.ts`, `indicator-form.ts`).
- API methods.
- Routes.

## Verification

```bash
cd /var/www/pessoal/ai-swing/frontend
npx ng build --configuration=development
```

Must succeed.

Manual smoke:
- Tables render with sticky header, hairline borders, hover row.
- Search filters in real time.
- Action icons appear on every row.
- Empty state shows when search has no results — adapt: when `filteredX().length === 0 && X().length > 0`, show inline empty state inside the table-wrap with a "Reset" button.

## Definition of done

1. Both list components rewritten with table-wrap pattern.
2. Search filter works.
3. Action buttons are icon-only ghost buttons.
4. Build passes.
5. Print `TASK DONE: task-006-list-pages.md` at end.
