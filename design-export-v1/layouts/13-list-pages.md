# 13 — List pages (Strategies, Indicators, History, Holdings)

> Padrão único: page header com título + filters + primary CTA, table-wrap abaixo. Densidade alta, action column à direita.

## HTML — Strategies list

```html
<section class="page">
  <header class="page__head">
    <div>
      <h1 class="page__title">Strategies</h1>
      <p class="page__subtitle">{{ strategies.length }} total · {{ enabled }} enabled</p>
    </div>
    <div class="page__actions">
      <div class="search-input">
        <svg class="ico" width="14" height="14"><use href="#search"/></svg>
        <input class="input input--inline" placeholder="Filter by name or ticker…" />
      </div>
      <button class="btn btn--secondary btn--sm">
        <svg class="ico" width="14" height="14"><use href="#filter"/></svg>
        Filters
      </button>
      <button class="btn btn--primary btn--sm" routerLink="/strategies/new">
        <svg class="ico" width="14" height="14"><use href="#plus"/></svg>
        New
      </button>
    </div>
  </header>

  <div class="table-wrap">
    <table class="table">
      <thead class="t-head">
        <tr>
          <th>Name</th>
          <th>Tickers</th>
          <th>Indicators</th>
          <th class="num">Score</th>
          <th>State</th>
          <th>Last update</th>
          <th class="t-actions">Actions</th>
        </tr>
      </thead>
      <tbody class="t-body">
        <tr *ngFor="let s of filteredStrategies" [routerLink]="['/strategies', s.id]">
          <td>
            <div class="cell-stack">
              <span class="cell-stack__title">{{ s.name }}</span>
              <span class="cell-stack__sub">k = {{ s.k_threshold }}</span>
            </div>
          </td>
          <td class="mono">{{ s.benchmark_ticker }} · {{ s.risk_on_ticker }} ↔ {{ s.risk_off_ticker }}</td>
          <td>
            <span class="chip" *ngFor="let i of s.indicators | slice:0:2">{{ i.name }}</span>
            <span class="chip chip--more" *ngIf="s.indicators.length > 2">+{{ s.indicators.length - 2 }}</span>
          </td>
          <td class="num mono">
            <span [ngClass]="scoreClass(s)">{{ s.current_signal?.score }}</span>
            <span class="t-muted"> / {{ s.current_signal?.total }}</span>
          </td>
          <td><span class="badge" [ngClass]="badgeClass(s)">{{ stateLabel(s) }}</span></td>
          <td class="mono t-muted">{{ s.current_signal?.date || '—' }}</td>
          <td class="t-actions">
            <button class="btn btn--ghost btn--sm btn--icon" (click)="$event.stopPropagation(); edit(s)" aria-label="Edit">
              <svg class="ico" width="14" height="14"><use href="#pencil"/></svg>
            </button>
            <button class="btn btn--ghost btn--sm btn--icon" (click)="$event.stopPropagation(); delete(s)" aria-label="Delete">
              <svg class="ico" width="14" height="14"><use href="#trash"/></svg>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</section>
```

## HTML — Indicators list

Mesmo shell. Colunas: `Name · Type · Params · Description · Used by · Actions`.

```html
<tbody class="t-body">
  <tr *ngFor="let ind of indicators">
    <td>
      <div class="cell-stack">
        <span class="cell-stack__title">{{ ind.name }}</span>
        <span class="cell-stack__sub">{{ ind.description || '—' }}</span>
      </div>
    </td>
    <td><span class="badge badge--neutral">{{ typeLabel(ind.type) }}</span></td>
    <td class="mono t-muted">
      <span *ngFor="let key of paramKeys(ind); let last = last">
        {{ key }}={{ ind.params[key] }}<span *ngIf="!last">, </span>
      </span>
    </td>
    <td class="num mono">{{ usedByCount(ind.id) }}</td>
    <td class="t-actions">…</td>
  </tr>
</tbody>
```

## HTML — Signal history (full page)

Colunas: `Date · Strategy · From → To · Score · k · Reason`.

```html
<tr *ngFor="let t of transitions">
  <td class="mono">{{ t.date }}</td>
  <td>
    <a class="t-link" [routerLink]="['/strategies', t.strategy_id]">
      {{ strategyName(t.strategy_id) }}
    </a>
  </td>
  <td>
    <span class="badge" [ngClass]="t.from_state ? 'badge--success' : 'badge--danger'">
      {{ t.from_state ? 'ON' : 'OFF' }}
    </span>
    <svg class="ico t-arrow" width="12" height="12"><use href="#chevron-right"/></svg>
    <span class="badge" [ngClass]="t.to_state ? 'badge--success' : 'badge--danger'">
      {{ t.to_state ? 'ON' : 'OFF' }}
    </span>
  </td>
  <td class="num mono">{{ t.score }} <span class="t-muted">/ {{ t.total }}</span></td>
  <td class="num mono">{{ kFor(t.strategy_id) }}</td>
  <td class="t-muted">{{ reasonOf(t) }}</td>
</tr>
```

## HTML — Holdings (current state of all strategies)

Não existe na API atual mas é roadmap. Reusa o mesmo shell — colunas `Strategy · Holding · Since · Score · State · P&L`.

## SCSS adicional

```scss
.search-input {
  position: relative;
  display: inline-flex;
  align-items: center;

  .ico {
    position: absolute;
    left: 10px;
    color: var(--text-muted);
    pointer-events: none;
  }
  .input--inline {
    height: 28px;
    padding-left: 30px;
    width: 240px;
    font-size: 12px;
    background: var(--surface-muted);
  }
}

.cell-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  &__title { font: var(--text-sm); font-weight: 500; color: var(--text-primary); }
  &__sub   { font: var(--text-xs); color: var(--text-muted); }
}

.t-link { color: var(--text-primary); text-decoration: none; font-weight: 500;
  &:hover { text-decoration: underline; } }
.t-muted { color: var(--text-muted); }
.t-arrow { color: var(--text-disabled); margin: 0 4px; vertical-align: middle; }

.chip--more {
  background: transparent;
  color: var(--text-muted);
  border-style: dashed;
}

// Sortable column header
.t-head th.is-sortable {
  cursor: pointer;
  user-select: none;
  &:hover { color: var(--text-primary); }
  .ico { vertical-align: -2px; margin-left: 4px; opacity: 0.5; }
  &.is-sorted-asc, &.is-sorted-desc {
    color: var(--text-primary);
    .ico { opacity: 1; }
  }
}

// Row clickable
.table tbody tr[routerLink] { cursor: pointer; }
```

## Pagination

Quando >50 rows, paginação simples no footer da `table-wrap`:

```html
<footer class="table-wrap__foot">
  <span class="t-muted">{{ start }}–{{ end }} of {{ total }}</span>
  <div class="pagination">
    <button class="btn btn--secondary btn--sm" [disabled]="page === 1">Previous</button>
    <span class="mono">{{ page }} / {{ pages }}</span>
    <button class="btn btn--secondary btn--sm" [disabled]="page === pages">Next</button>
  </div>
</footer>
```

```scss
.table-wrap__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px var(--space-4);
  border-top: 1px solid var(--border-subtle);
  background: var(--surface-muted);
  font: var(--text-xs);
}
.pagination { display: flex; align-items: center; gap: 10px; }
```

## Estados

- **Empty (no items)**: empty state dentro do `.table-wrap` com padding 64px.
- **Empty (filtered)**: linha de "no results" + "Clear filters" link no centro.
- **Loading**: 5–8 skeleton rows com height 44px.
- **Row hover**: bg → `--surface-muted` (já no `.table`).
- **Row clicked**: bg ainda em hover, action buttons mantém pointer-events (use `.stopPropagation()`).
