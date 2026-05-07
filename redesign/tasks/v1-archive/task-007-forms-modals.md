# Task 007 — Forms + modals redesign

**Goal:** Apply the design's modal styling and form-grid patterns to the existing `Modal`, `StrategyFormComponent`, and `IndicatorFormComponent`. The modals should use `<dialog>` semantics, the design's `.modal` styles, and the indicator-picker pattern for indicator selection in the strategy form.

## Pre-conditions

- Tasks 001-006 done.
- `.modal`, `.modal--wide`, `.form-grid`, `.field`, `.input`, `.select`, `.toggle`, `.indicator-picker`, `.callout`, `.btn` variants available.

## Sources

1. `design-export/04-components.md` — Modal, Field, Toggle, Indicator picker
2. `design-export/layouts/14-forms.md` — full HTML + SCSS for both forms (Strategy and Indicator)
3. `design-export/layouts/15-modals-states.md` — modal behavior (Esc, backdrop, focus, animations)

## Files to modify

| File | Changes |
|---|---|
| `frontend/src/app/shared/modal/modal.ts` | Use `.modal` design SCSS classes, structure with `__head/__body/__foot`, support `wide` size, expose `[size]` input |
| `frontend/src/app/pages/strategies/strategy-form.ts` | Use `.form-grid` + `.indicator-picker` + `.toggle` + `.field` styles |
| `frontend/src/app/pages/indicators/indicator-form.ts` | Use `.form-grid` + dynamic params row + `.field` styles |

## modal.ts refactor

The current `ModalComponent` uses inline SCSS. Replace its template + styles to consume the global `.modal` rules from `_modal.scss` (added in task 001).

```ts
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <dialog #dialog class="modal" [class.modal--wide]="size() === 'wide'"
            (close)="onDialogClose()" (click)="onBackdropClick($event)">
      @if (open()) {
        <div class="dialog-inner" (click)="$event.stopPropagation()">
          @if (title() || subtitle()) {
            <header class="modal__head">
              <div class="titles">
                @if (title()) { <h2 class="modal__title">{{ title() }}</h2> }
                @if (subtitle()) { <p class="modal__subtitle">{{ subtitle() }}</p> }
              </div>
              <button class="btn btn--ghost btn--icon btn--sm" (click)="close.emit()" aria-label="Fechar">
                <svg class="ico" width="14" height="14"><use href="#x"/></svg>
              </button>
            </header>
          }
          <div class="modal__body">
            <ng-content></ng-content>
          </div>
          <ng-content select="[modal-footer]"></ng-content>
        </div>
      }
    </dialog>
  `,
  styles: [`
    :host { display: contents; }

    /* Footer projected via [modal-footer] needs container styles.
       Project it inline using ::ng-deep, or add .modal__foot styles
       in _modal.scss and document that consumers should wrap with
       <div modal-footer class="modal__foot">. */
    ::ng-deep [modal-footer] {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      padding: 14px 20px;
      border-top: 1px solid var(--border-subtle);
      background: var(--surface-muted);
    }
    .modal__subtitle {
      margin: 4px 0 0;
      font: var(--text-xs);
      color: var(--text-muted);
    }
  `],
})
export class ModalComponent {
  open = input<boolean>(false);
  title = input<string | null>(null);
  subtitle = input<string | null>(null);
  size = input<'default' | 'wide'>('default');
  closeOnBackdrop = input<boolean>(true);
  closeOnEsc = input<boolean>(true);

  close = output<void>();
  // ... rest unchanged from current implementation (effect to call showModal/close,
  //     onDialogClose, onBackdropClick, ESC HostListener)
}
```

Keep the imperative `dialog.showModal()` / `dialog.close()` logic from current implementation. The CSS for `.modal` itself comes from `_modal.scss`.

If the current `ModalComponent` has inline `.modal` styles that conflict with the partial, remove them — the partial wins.

## strategy-form.ts refactor

Replace template with the markup from `14-forms.md` (Strategy form section). Key changes:
- Use `<app-modal [size]="'wide'">…</app-modal>` (640px–720px wide).
- Form fields use `.field` + `.input` classes — no inline styles.
- Tickers row uses `.form-grid__row.form-grid__row--3`.
- k_threshold + enabled toggle use `.form-grid__row.form-grid__row--split` with `.toggle`.
- Indicator selection uses `.indicator-picker` (grid of `.indicator-picker__item` cards) instead of vertical checkbox list.
- Validation: when `field.invalid` → add `.is-invalid` class, swap `.field__hint` to `.field__hint--error` with `alert-circle` icon.
- Modal footer: `<div modal-footer>` with `.btn--ghost` Cancel + `.btn--primary` Save.

Helpers in component class:
```ts
typeLabel(t: IndicatorType): string {
  // Map type enum to short label used in indicator-picker chip
  return ({ SMA_GATE: 'SMA', EMA_GATE: 'EMA', VOL_GATE: 'VOL', AR1_GATE: 'AR(1)' })[t];
}

isInvalid(field: keyof typeof this.model): boolean {
  // simple: return touched and value missing/invalid
  // Keep validation pragmatic — Reactive Forms migration is out of scope here.
}
```

The form is a template-driven form (`ngModel`) currently. Keep it that way — Reactive Forms migration is NOT in this task. Just style and restructure.

## indicator-form.ts refactor

Same approach: use `<app-modal>`, `.form-grid`, `.field` classes. Type select uses `.select` wrapper with `.select__caret` chevron icon. Params grid uses `.form-grid__row--2` (or `--3` if there are 3+ params).

Markup pattern from `14-forms.md` (Indicator form section). The form already supports dynamic params — just preserve that behavior.

Numeric inputs that hold ints/floats should get `class="input input--mono"` for tabular-num alignment.

## Modal behavior (cross-cutting)

- Esc closes — already handled by current `ModalComponent` (HostListener).
- Click backdrop closes — already handled.
- Discard-on-dirty: out of scope for this task. Add a TODO comment in both form components.
- `cdkFocusInitial` autofocus: not required (CDK is a dep we don't have). Add `(ngOnInit)` to focus the first input via `setTimeout(() => firstInput.focus(), 0)` if you want.

## Server error display

Inside the modal body, above the form fields, render a `.callout--danger` when `error()` is set:

```html
@if (error()) {
  <div class="callout callout--danger">
    <svg class="ico" width="16" height="16"><use href="#alert-circle"/></svg>
    <p>{{ error() }}</p>
  </div>
}
```

## What NOT to change

- API service methods.
- Routes (dashboard "+ Nova" still navigates to `/strategies?new=true`).
- Form submission logic (backend integration).
- The list components' integration with the form components.

## Verification

```bash
cd /var/www/pessoal/ai-swing/frontend
npx ng build --configuration=development
```

Manual smoke:
- Open `/strategies?new=true` → modal opens with wide size, design styling, indicator picker grid.
- Open `/strategies?edit=1` → modal pre-filled, all fields visible.
- Open `/indicators?new=true` → modal opens, type select, params row reflects type.
- Submit a form → loads, closes on success, refreshes list.
- Cancel + Esc + backdrop click → all close correctly.

## Definition of done

1. Modal, strategy-form, indicator-form rewritten using design classes.
2. Forms still submit to API correctly (no behavior change).
3. Build passes.
4. Print `TASK DONE: task-007-forms-modals.md` at end.
