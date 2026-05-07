# 14 — Forms (Strategy & Indicator)

> Forms vivem dentro de modals (criar/editar). Mesmo grid de fields para ambos. Usa o componente `Modal` (ver `04-components.md`).

## Strategy form

Schema (de `models.ts → StrategyCreate`):

| Field | Type | Required | UI |
|---|---|---|---|
| `name` | string | yes | text input |
| `benchmark_ticker` | string | yes | text + uppercase |
| `risk_on_ticker` | string | yes | text + uppercase |
| `risk_off_ticker` | string | yes | text + uppercase |
| `k_threshold` | number | yes | number 1–N |
| `enabled` | bool | no (default true) | toggle |
| `indicator_ids` | number[] | yes | multi-select chips |

### HTML

```html
<dialog class="modal modal--wide" #dlg open>
  <div class="modal__head">
    <h2 class="modal__title">{{ isEdit ? 'Edit strategy' : 'New strategy' }}</h2>
    <button class="btn btn--ghost btn--icon btn--sm" (click)="dlg.close()" aria-label="Close">
      <svg class="ico" width="16" height="16"><use href="#x"/></svg>
    </button>
  </div>

  <form class="form-grid modal__body" [formGroup]="form" (ngSubmit)="submit()">
    <!-- Name (full width) -->
    <div class="field" [class.is-invalid]="invalid('name')">
      <label class="field__label" for="name">Name</label>
      <input id="name" class="input" formControlName="name" placeholder="QQQ Rotation" />
      <p class="field__hint" *ngIf="!invalid('name')">Identificador único.</p>
      <p class="field__hint field__hint--error" *ngIf="invalid('name')">
        <svg class="ico" width="14" height="14"><use href="#alert-circle"/></svg>
        Nome obrigatório (máx 64 chars).
      </p>
    </div>

    <!-- Tickers row (3 cols) -->
    <div class="form-grid__row form-grid__row--3">
      <div class="field">
        <label class="field__label" for="bench">Benchmark</label>
        <input id="bench" class="input input--mono" formControlName="benchmark_ticker"
               placeholder="SPY" maxlength="6" />
        <p class="field__hint">Comparativo (B&amp;H).</p>
      </div>
      <div class="field">
        <label class="field__label" for="riskOn">Risk on ticker</label>
        <input id="riskOn" class="input input--mono" formControlName="risk_on_ticker"
               placeholder="QQQ" maxlength="6" />
        <p class="field__hint">Posição quando score &gt; k.</p>
      </div>
      <div class="field">
        <label class="field__label" for="riskOff">Risk off ticker</label>
        <input id="riskOff" class="input input--mono" formControlName="risk_off_ticker"
               placeholder="SHV" maxlength="6" />
        <p class="field__hint">Posição quando score ≤ k.</p>
      </div>
    </div>

    <!-- k threshold + enabled -->
    <div class="form-grid__row form-grid__row--split">
      <div class="field">
        <label class="field__label" for="k">k threshold</label>
        <input id="k" class="input input--mono" type="number" formControlName="k_threshold"
               min="1" [max]="indicatorIds.length" />
        <p class="field__hint">Score mínimo para "risk on" (1 a {{ indicatorIds.length }}).</p>
      </div>

      <div class="field field--inline">
        <label class="field__label">Status</label>
        <label class="toggle">
          <input type="checkbox" formControlName="enabled" />
          <span class="toggle__track"></span>
          <span class="toggle__label">{{ form.value.enabled ? 'Enabled' : 'Disabled' }}</span>
        </label>
      </div>
    </div>

    <!-- Indicators multi-select -->
    <div class="field">
      <label class="field__label">Indicators</label>
      <div class="indicator-picker">
        <label class="indicator-picker__item" *ngFor="let ind of allIndicators"
               [class.is-selected]="isSelected(ind.id)">
          <input type="checkbox" [checked]="isSelected(ind.id)" (change)="toggle(ind.id)" />
          <div class="indicator-picker__body">
            <span class="indicator-picker__name">{{ ind.name }}</span>
            <span class="indicator-picker__type badge badge--neutral">{{ typeLabel(ind.type) }}</span>
          </div>
          <p class="indicator-picker__desc">{{ ind.description }}</p>
        </label>
      </div>
      <p class="field__hint" *ngIf="!invalid('indicator_ids')">
        Selecione 1 a 8 indicadores.
      </p>
      <p class="field__hint field__hint--error" *ngIf="invalid('indicator_ids')">
        <svg class="ico" width="14" height="14"><use href="#alert-circle"/></svg>
        Selecione ao menos 1 indicador.
      </p>
    </div>
  </form>

  <div class="modal__foot">
    <button class="btn btn--ghost btn--md" (click)="dlg.close()">Cancel</button>
    <button class="btn btn--primary btn--md" (click)="submit()" [disabled]="form.invalid || saving()">
      <svg class="ico ico--spin" width="14" height="14" *ngIf="saving()"><use href="#loader"/></svg>
      {{ isEdit ? 'Save' : 'Create' }}
    </button>
  </div>
</dialog>
```

## Indicator form

Schema dinâmico baseado em `IndicatorTypeInfo.params_schema`. Quando user troca o `type`, re-renderiza fields de params.

```html
<form class="form-grid">
  <div class="field">
    <label class="field__label" for="name">Name</label>
    <input id="name" class="input" formControlName="name" placeholder="SMA 200" />
  </div>

  <div class="field">
    <label class="field__label" for="type">Type</label>
    <div class="select">
      <select id="type" class="input" formControlName="type">
        <option *ngFor="let info of indicatorTypes" [value]="info.type">{{ info.label }}</option>
      </select>
      <svg class="select__caret ico" width="14" height="14"><use href="#chevron-down"/></svg>
    </div>
    <p class="field__hint">{{ currentTypeInfo?.description }}</p>
  </div>

  <!-- Params dinâmicos -->
  <div class="form-grid__row form-grid__row--2"
       *ngIf="currentTypeInfo">
    <div class="field" *ngFor="let p of paramEntries">
      <label class="field__label">{{ p.key }}</label>
      <input class="input input--mono" type="number"
             [formControlName]="'param_' + p.key"
             [min]="p.minimum" [max]="p.maximum" />
      <p class="field__hint">{{ p.description }}</p>
    </div>
  </div>

  <div class="field">
    <label class="field__label" for="desc">Description</label>
    <textarea id="desc" class="input" rows="3" formControlName="description"
              placeholder="(opcional) explica o uso do indicador"></textarea>
  </div>
</form>
```

## SCSS — form grid + toggle + indicator picker

```scss
.form-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);

  &__row {
    display: grid;
    gap: var(--space-3);
    &--2 { grid-template-columns: repeat(2, 1fr); }
    &--3 { grid-template-columns: repeat(3, 1fr); }
    &--split { grid-template-columns: 1fr auto; align-items: end; }
  }
}

.field--inline {
  align-self: end;
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;

  input { position: absolute; opacity: 0; pointer-events: none; }
  &__track {
    position: relative;
    width: 36px;
    height: 20px;
    background: var(--surface-muted);
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    transition: var(--transition-fast);

    &::after {
      content: '';
      position: absolute;
      top: 1px;
      left: 1px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--surface);
      box-shadow: var(--shadow-xs);
      transition: transform var(--transition-fast), background var(--transition-fast);
    }
  }
  input:checked + &__track {
    background: var(--primary);
    border-color: var(--primary);
    &::after { transform: translateX(16px); background: var(--primary-fg); box-shadow: none; }
  }
  &__label {
    font: var(--text-sm);
    font-weight: 500;
    color: var(--text-primary);
  }
}

.indicator-picker {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-2);
  max-height: 320px;
  overflow-y: auto;
  padding: 4px;

  &__item {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
    gap: 4px 10px;
    padding: 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: var(--transition-fast);

    input { grid-row: 1 / span 2; align-self: start; margin: 2px 0 0; }

    &:hover { border-color: var(--border-strong); }
    &.is-selected {
      border-color: var(--primary);
      background: var(--primary-soft);
    }
  }
  &__body { display: flex; align-items: center; gap: 8px; }
  &__name { font: var(--text-sm); font-weight: 500; color: var(--text-primary); }
  &__type { flex-shrink: 0; }
  &__desc { margin: 0; grid-column: 2; font: var(--text-xs); color: var(--text-muted); }
}
```

## Validação

- Mostre erro inline (vermelho) **só após** dirty/touched, ou no submit.
- Erro na borda do input + `box-shadow: 0 0 0 3px var(--danger-bg)`.
- Hint vira `field__hint--error` com ícone `alert-circle`.
- Submit desabilitado enquanto `form.invalid || saving()`.

## Estados especiais

- **Saving**: botão primary mostra spinner + texto "Saving…", form fica `pointer-events: none; opacity: 0.7`.
- **Server error**: toast vermelho + banner vermelho dentro do modal (acima de fields) com mensagem.
- **Edit pré-fill**: já documentado — patch o form com valores do strategy/indicator.
- **Sync entre k_threshold e indicators**: quando user remove indicators, recalcula `max` do `k_threshold` e clamp se necessário.
