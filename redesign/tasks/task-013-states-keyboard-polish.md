# Task 013 (v2) — States, keyboard, polish (loading bar, ToastService, confirm-delete modal, G 1/2/3, 404)

**Goal:** Wire the remaining transient states and interactions: top loading bar on route change, `ToastService` + `<app-toast-stack>`, confirm-delete modal that replaces `confirm()` browser dialog, global keyboard shortcuts (`G 1/2/3` navigation, `Esc` close modal), and a 404 page for unmatched routes.

## Pre-conditions

- Tasks 001-012 done (note: task 012 wires `⌘K` palette which replaces the `?` help dialog).
- `_loading-bar.scss`, `_toast.scss`, `_modal.scss`, `_empty.scss`, `_kbd.scss`, `_notfound.scss` partials exist.
- `<app-modal>` component is intact.
- `PaletteService` exists.

## Sources

1. `design-export/linear-extras.jsx` — `ModalOverlay`, `ToastStack`, `NotFoundScreen`, `LoadingStateBlock` are canonical
2. `design-export/layouts/15-modals-states.md` — confirm modal, loading bar, error state, toasts, 404 page (older spec; JSX wins on conflicts)
3. `design-export/04-components.md` §11, §12, §13, §14 — modal, toast, empty, skeleton
4. `design-export/04-components.md` §9 (sidebar) "Atalhos de teclado canônicos" — G 1/2/3 implementation pattern

## Files to create / modify

### Loading bar

`frontend/src/app/shared/loading-bar/loading-bar.ts`:

```ts
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';

@Component({
  selector: 'app-loading-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (active()) { <div class="loading-bar"></div> }`,
})
export class LoadingBarComponent implements OnInit {
  active = signal(false);
  private router = inject(Router);

  ngOnInit(): void {
    this.router.events.subscribe(ev => {
      if (ev instanceof NavigationStart) this.active.set(true);
      else if (ev instanceof NavigationEnd || ev instanceof NavigationCancel || ev instanceof NavigationError) {
        this.active.set(false);
      }
    });
  }
}
```

Add `<app-loading-bar/>` at the top of `frontend/src/app/app.html` (just inside `.shell` or before `.shell`).

### ToastService + stack component

`frontend/src/app/shared/toast/toast.service.ts`:

```ts
import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  variant: 'success' | 'danger' | 'info';
  message: string;
  duration?: number; // ms; default 4000; 0 = no auto-dismiss
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);

  push(t: Omit<Toast, 'id'>) {
    const id = (crypto as any).randomUUID?.() ?? Math.random().toString(36).slice(2);
    const full: Toast = { ...t, id };
    this.toasts.update(arr => [...arr, full].slice(-3)); // keep last 3
    if (t.duration !== 0) {
      setTimeout(() => this.dismiss(id), t.duration ?? 4000);
    }
  }
  dismiss(id: string) {
    this.toasts.update(arr => arr.filter(x => x.id !== id));
  }
}
```

`frontend/src/app/shared/toast/toast-stack.ts`:

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-stack',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-stack">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [ngClass]="'toast--' + t.variant">
          <svg class="ico toast__icon" width="14" height="14">
            <use [attr.href]="t.variant === 'success' ? '#circle-check' : t.variant === 'danger' ? '#alert-circle' : '#info-circle'"/>
          </svg>
          <span>{{ t.message }}</span>
          <button class="icon-btn toast__close" (click)="toast.dismiss(t.id)" aria-label="Fechar">
            <svg width="12" height="12"><use href="#x"/></svg>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastStackComponent {
  protected toast = inject(ToastService);
}
```

Add `<app-toast-stack/>` to `app.html` (anywhere outside `.shell` — fixed position handles placement).

Where to call `toast.push(...)`:
- `app.ts` after manual refresh success: `toast.push({ variant: 'info', message: 'Atualizado · ' + lastTime })`
- `strategy-form.ts` and `indicator-form.ts` after save: `toast.push({ variant: 'success', message: 'Estratégia salva' })`
- After delete: `toast.push({ variant: 'success', message: 'Removido' })`
- On error: `toast.push({ variant: 'danger', message: errorMessage, duration: 8000 })`

### Confirm-delete modal (rich content per canonical render)

Replace `confirm("Remover?")` calls in list components with a real modal. The canonical render (`linear-extras.jsx` ModalOverlay) has rich content:

- Header: red triangle alert icon (in `--danger-soft` tinted square 28×28 with 6px radius) + title + close X
- Body: prose with strategy name in mono bold + a separate boxed callout (mono small, on `--bg` with hairline border) listing impact ("67 trades registrados · 10y de backtest cache" + "Esta operação não pode ser desfeita.")
- Footer: `Cancelar` (ghost) + `🗑 Excluir` (danger primary — bg `--danger`, text white)

#### ConfirmService + dialog component

`frontend/src/app/shared/confirm/confirm.service.ts`:

```ts
import { Injectable, signal } from '@angular/core';

export interface ConfirmConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  config = signal<ConfirmConfig | null>(null);
  private resolver: ((v: boolean) => void) | null = null;

  ask(cfg: ConfirmConfig): Promise<boolean> {
    return new Promise(resolve => {
      this.resolver = resolve;
      this.config.set(cfg);
    });
  }
  resolve(v: boolean) {
    this.resolver?.(v);
    this.resolver = null;
    this.config.set(null);
  }
}
```

`frontend/src/app/shared/confirm/confirm-dialog.ts` — renders an `<app-modal>` with confirmService.config() in template, calls `resolve(true|false)`.

```ts
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  template: `
    <app-modal [open]="cs.config() !== null"
               [title]="cs.config()?.title ?? ''"
               (close)="cs.resolve(false)">
      <p style="margin: 0; color: var(--text-secondary); line-height: 1.6;">
        {{ cs.config()?.message }}
      </p>
      <div modal-footer style="display:flex; gap:8px; justify-content:flex-end; padding: 14px 20px; border-top: 1px solid var(--border-subtle); background: var(--bg);">
        <button class="btn" (click)="cs.resolve(false)">{{ cs.config()?.cancelLabel ?? 'Cancelar' }}</button>
        <button class="btn"
                [class.btn--danger]="cs.config()?.variant === 'danger'"
                [class.btn--primary]="cs.config()?.variant !== 'danger'"
                (click)="cs.resolve(true)">
          {{ cs.config()?.confirmLabel ?? 'Confirmar' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class ConfirmDialogComponent {
  protected cs = inject(ConfirmService);
}
```

Mount once in `app.html`: `<app-confirm-dialog/>`.

Update list components:
```ts
// in StrategiesListComponent
private confirm = inject(ConfirmService);

async remove(s: Strategy) {
  const ok = await this.confirm.ask({
    title: 'Remover estratégia',
    message: `${s.name} será removida permanentemente. Esta ação não pode ser desfeita.`,
    confirmLabel: 'Remover',
    variant: 'danger',
  });
  if (!ok) return;
  this.api.deleteStrategy(s.id).subscribe({
    next: () => { this.toast.push({ variant: 'success', message: 'Estratégia removida' }); this.load(); },
    error: (err) => this.toast.push({ variant: 'danger', message: err?.error?.detail ?? 'Erro ao remover', duration: 8000 }),
  });
}
```

Same for indicators-list.

### Global keyboard shortcuts (G 1/2/3)

`⌘K` / `Ctrl+K` is already wired in task 012 (palette toggle).

This task adds `G 1/2/3` navigation. Extend the existing keydown listener in `app.ts`:

```ts
ngOnInit(): void {
  // ... existing init ...
  let armed = false; let armTimer: any;
  document.addEventListener('keydown', (e) => {
    const tag = (e.target as HTMLElement).tagName;
    if (['INPUT','TEXTAREA','SELECT'].includes(tag)) return;
    if ((e.target as HTMLElement).isContentEditable) return;
    if (this.palette.isOpen()) return;  // don't compete with palette navigation

    if (e.key === 'g' && !armed) {
      armed = true;
      clearTimeout(armTimer);
      armTimer = setTimeout(() => armed = false, 1500);
      return;
    }
    if (armed) {
      if (e.key === '1') this.router.navigate(['/dashboard']);
      else if (e.key === '2') this.router.navigate(['/strategies']);
      else if (e.key === '3') this.router.navigate(['/indicators']);
      armed = false;
      clearTimeout(armTimer);
    }
  });
}
```

(Inject `Router` and `PaletteService` in app.ts if not already.)

`Esc` close modal — already handled by `<app-modal>` HostListener.

### `?` help dialog

**Skipped** — the command palette (⌘K from task 012) replaces the help-shortcut affordance per Linear DNA spec. Users discover shortcuts via palette.

### 404 page (full-screen, no shell)

Per the canonical render (`linear-extras.jsx` NotFoundScreen), 404 is **full-screen centered**, NOT inside the app-shell.

`frontend/src/app/pages/not-found/not-found.ts`:

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="notfound-shell">
      <div class="notfound-inner">
        <div class="notfound-code mono">404</div>
        <div class="notfound-title">Página não encontrada</div>
        <div class="notfound-sub">
          A rota <span class="mono" style="color: var(--text-primary);">{{ url }}</span> não existe ou foi removida do catálogo.
        </div>
        <div class="notfound-actions">
          <a routerLink="/dashboard" class="btn">
            <svg class="ico" width="12" height="12"><use href="#chevron-right"/></svg>
            Voltar ao dashboard
          </a>
          <a routerLink="/strategies" class="btn btn--primary">
            <svg class="ico" width="12" height="12"><use href="#search"/></svg>
            Buscar estratégias
          </a>
        </div>
      </div>
    </div>
  `,
})
export class NotFoundComponent {
  protected url = location.pathname;
}
```

The 404 reuses the same shell-bypass pattern from task 011 (Login). Extend `app.ts`'s `isShellRoute` computed to also exclude `/404` if you choose a dedicated route. Easier: since unmatched routes hit the catch-all `**` route which loads `NotFoundComponent`, just check that the loaded component is `NotFoundComponent` — but that's hard. Practical approach: also bypass shell when the URL doesn't match any known route prefix. Simplest: keep the rule "shell hidden on `/login`" and let 404 render inside the shell — it's a graceful degradation. **Decision**: bypass shell only on `/login`; the 404 page renders inside the shell and its own internal margin/padding makes it look standalone.

If you want strict shell-bypass for 404, set up a sentinel: the `NotFoundComponent` exposes a static flag and `app.ts` watches navigation events to detect it. Out of scope here — keep it inside shell.

Update `app.routes.ts`:
- Replace the catch-all redirect `{ path: '**', redirectTo: 'dashboard' }` with `{ path: '**', loadComponent: () => import('./pages/not-found/not-found').then(m => m.NotFoundComponent) }`.

### Refactor list / form remove confirmations

Search for any remaining `confirm(...)` browser-dialog calls across the codebase:
```bash
grep -rn '\bconfirm(' /var/www/pessoal/ai-swing/frontend/src/app/
```
Replace each with the `ConfirmService.ask()` pattern. There should be at most 2-3 (strategies-list, indicators-list, possibly form-page on delete).

## What NOT to do

- **No** new toast variants (success, info, danger only — per spec).
- **No** new modal sizes (the `--wide` variant from v1 is gone since forms are routes).
- **No** `?` help dialog yet — out of scope. Document as TODO comment if you want.

## Verification

```bash
cd /var/www/pessoal/ai-swing/frontend
npx ng build --configuration=development
```

Manual smoke:
- Click any nav link → 2px indigo bar appears at top of page during navigation.
- After saving a form → toast appears bottom-right and auto-dismisses.
- Click delete on a strategy → confirm modal appears (NOT the browser confirm), Cancel closes, Confirm deletes + toast.
- Press `g` then `1` → navigates to Dashboard. Same for `g 2`, `g 3`.
- Press `g` then wait 2s → arming expires; pressing `1` does nothing.
- Type `g 1` while focused on an `<input>` → does NOT navigate.
- Visit `/nonexistent-route` → 404 page renders.

## Definition of done

1. `LoadingBarComponent` mounted, reacts to NavigationStart/End.
2. `ToastService` + `ToastStackComponent` working; called on save/delete/refresh.
3. `ConfirmService` + `ConfirmDialogComponent` mounted; replaces all browser `confirm()` calls.
4. Global `G n` shortcuts navigate (skip when input focused).
5. 404 page registered as catch-all.
6. Build passes.
7. Print `TASK DONE: task-013-states-keyboard-polish.md` at end.
