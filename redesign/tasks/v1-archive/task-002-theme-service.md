# Task 002 — Theme service + chart-tokens resolver + theme-switch component

**Goal:** Wire light/dark/system theming end-to-end. The user can toggle the theme, the choice persists, charts react to changes. Foundation for tasks 003+.

## Pre-conditions

- Task 001 completed (tokens.scss exists, components.scss aggregator wired, fonts loaded, sprite inlined).
- `frontend/src/styles/tokens.scss` defines `:root` (light) and `[data-theme="dark"]` overrides.

## Sources

1. `design-export/06-theme-toggle.md` — `ThemeService`, FOUC script, segmented control HTML/SCSS
2. `design-export/05-charts-echarts.md` — `chart-tokens.ts` (LIGHT/DARK records + `getChartTokens(mode)`)
3. `design-export/00-OVERVIEW.md` — "Sidebar fica `--surface` (branco em light)…"

## Files to create

| File | Source |
|---|---|
| `frontend/src/app/shared/theme/theme.service.ts` | exact copy of `ThemeService` from `06-theme-toggle.md`, no behavior changes |
| `frontend/src/app/shared/theme/theme-switch.ts` | a standalone Angular 21 component implementing the segmented control from `06-theme-toggle.md` |
| `frontend/src/app/shared/charts/chart-tokens.ts` | exact copy of the `ChartTokens` interface, `LIGHT` / `DARK` constants, and `getChartTokens(mode)` function from `05-charts-echarts.md` |

## Files to modify

None of the existing pages — wiring into the shell happens in task 003.

## Component contracts

### `theme.service.ts`

Translate the snippet in `06-theme-toggle.md` to TypeScript that compiles against Angular 21:

```ts
import { Injectable, signal, effect, DestroyRef, inject } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'aiswing.theme';
  readonly mode = signal<ThemeMode>(this.read());
  private mql = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    this.apply(this.mode());
    effect(() => this.apply(this.mode()));

    this.mql.addEventListener('change', () => {
      if (this.mode() === 'system') this.apply('system');
    });
  }

  set(mode: ThemeMode) {
    this.mode.set(mode);
    localStorage.setItem(this.STORAGE_KEY, mode);
  }

  effective(): 'light' | 'dark' {
    const m = this.mode();
    if (m === 'system') return this.mql.matches ? 'dark' : 'light';
    return m;
  }

  private read(): ThemeMode {
    const v = localStorage.getItem(this.STORAGE_KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
  }

  private apply(mode: ThemeMode) {
    const resolved = mode === 'system' ? (this.mql.matches ? 'dark' : 'light') : mode;
    document.documentElement.setAttribute('data-theme', resolved);
  }
}
```

### `theme-switch.ts`

Standalone, self-styled (template inline). Markup from `06-theme-toggle.md`. Replace `*ngFor` with Angular 21 control flow `@for`. Use `inject()` for the service.

```ts
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ThemeService, ThemeMode } from './theme.service';

interface Option { value: ThemeMode; label: string; icon: string; }

@Component({
  selector: 'app-theme-switch',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="theme-switch" role="radiogroup" aria-label="Color theme">
      @for (opt of options; track opt.value) {
        <button
          type="button"
          role="radio"
          [attr.aria-checked]="theme.mode() === opt.value"
          [class.is-active]="theme.mode() === opt.value"
          (click)="theme.set(opt.value)"
        >
          <svg class="ico" width="14" height="14" aria-hidden="true">
            <use [attr.href]="'#' + opt.icon"></use>
          </svg>
          <span>{{ opt.label }}</span>
        </button>
      }
    </div>
  `,
  styles: [`
    /* All visuals live in the SCSS — keep this empty or minimal.
       The .theme-switch styles came in components.scss via task 001 if you put them there.
       If not, add them here verbatim from 06-theme-toggle.md. */
    :host { display: inline-flex; }
  `],
})
export class ThemeSwitchComponent {
  protected theme = inject(ThemeService);
  protected options: Option[] = [
    { value: 'light',  label: 'Light',  icon: 'sun' },
    { value: 'dark',   label: 'Dark',   icon: 'moon' },
    { value: 'system', label: 'System', icon: 'monitor' },
  ];
}
```

**Important:** the SCSS for `.theme-switch` is in `06-theme-toggle.md`. Add it to `frontend/src/styles/components/_theme-switch.scss` (new partial) and `@use` it in `components.scss` — that way the look is consistent with the rest of the design system. Do NOT duplicate styles inline in the component.

If task 001 missed `_theme-switch.scss`, add it now and update `frontend/src/styles/components.scss` to `@use 'components/theme-switch';`.

### `chart-tokens.ts`

Verbatim from `05-charts-echarts.md` (the `ChartTokens` interface, `LIGHT` and `DARK` constants, `getChartTokens(mode)` function). No theme service import — pure data. Tasks 004+ will combine `getChartTokens(theme.effective())` with `effect()` to make charts reactive.

## Step-by-step

1. Read the three source files.
2. Create `frontend/src/app/shared/theme/theme.service.ts`.
3. Create `frontend/src/app/shared/theme/theme-switch.ts`.
4. Create `frontend/src/app/shared/charts/chart-tokens.ts`.
5. If `_theme-switch.scss` is missing from `frontend/src/styles/components/`, add it and register in `components.scss`.

## Verification

```bash
cd /var/www/pessoal/ai-swing/frontend
npx ng build --configuration=development
```

Should succeed. The new files compile but aren't yet used by any other component — that's expected.

Smoke check:
```bash
test -f /var/www/pessoal/ai-swing/frontend/src/app/shared/theme/theme.service.ts
test -f /var/www/pessoal/ai-swing/frontend/src/app/shared/theme/theme-switch.ts
test -f /var/www/pessoal/ai-swing/frontend/src/app/shared/charts/chart-tokens.ts
```

## Definition of done

1. Three new files exist with the correct contents.
2. `_theme-switch.scss` partial exists and is `@use`d.
3. Build succeeds.
4. No existing components were modified.
5. Print `TASK DONE: task-002-theme-service.md` at the end.
