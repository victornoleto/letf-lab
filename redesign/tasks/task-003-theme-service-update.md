# Task 003 (v2) — Theme service update + 3-icon segmented switch

**Goal:** Update `ThemeService` to default `'light'` (was `'system'`), use storage key `ai-swing.theme` (was `aiswing.theme`), and dispatch a `'themechange'` event on the document each time the theme resolves. Rewrite `ThemeSwitchComponent` to be the 3-pill segmented control with icon + label (Light / Dark / System) — used **inside the Settings page**, NOT in the sidebar footer (the canonical render confirms theme switching lives only in `/settings`).

## Pre-conditions

- Tasks 001 and 002 done. Tokens + Inter font + new FOUC script + `.theme-row` SCSS partial all in place.

## Sources

1. `design-export/06-theme-toggle.md` — entire file. Especially:
   - §2 ThemeService implementation
   - §3 FOUC script (already in `index.html` from task 001 — confirm it matches)
   - §4 toggle UI markup + SCSS
   - §5 chart re-render via `themechange` event

## Files to modify

### `frontend/src/app/shared/theme/theme.service.ts`

Replace the current contents with the spec from `06-theme-toggle.md` §2:

```ts
import { Injectable, signal, effect, computed } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'ai-swing.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.readStored());
  readonly resolved = computed<'light' | 'dark'>(() => {
    const m = this.mode();
    if (m !== 'system') return m;
    return this.systemPrefersDark() ? 'dark' : 'light';
  });

  constructor() {
    effect(() => {
      const r = this.resolved();
      document.documentElement.setAttribute('data-theme', r);
      document.dispatchEvent(new Event('themechange'));
    });

    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', () => {
        if (this.mode() === 'system') this.mode.set('system');
      });
    }
  }

  set(mode: ThemeMode) {
    this.mode.set(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }

  toggle() {
    this.set(this.resolved() === 'dark' ? 'light' : 'dark');
  }

  private readStored(): ThemeMode {
    const v = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    return v ?? 'light';
  }
  private systemPrefersDark(): boolean {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }
}
```

Notes:
- **Default = `'light'`**, NOT `'system'`. Linear default is light.
- **Dispatch `themechange`** every time `resolved()` changes — chart components listen.
- The `effective()` method from the old service is gone; consumers use `resolved()` (signal) instead. Update any callers.

### `frontend/src/app/shared/theme/theme-switch.ts`

Rewrite as the 3-pill segmented control matching the canonical render in Settings (`linear-extras.jsx` SettingsScreen "Aparência" row). Each pill has icon + label.

```ts
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ThemeService, ThemeMode } from './theme.service';

@Component({
  selector: 'app-theme-switch',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pills" role="radiogroup" aria-label="Tema">
      <span class="pill"
            [class.pill--active]="theme.mode() === 'light'"
            (click)="theme.set('light')"
            role="radio"
            [attr.aria-checked]="theme.mode() === 'light'"
            tabindex="0">
        <svg class="ico" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
        </svg>
        Light
      </span>
      <span class="pill"
            [class.pill--active]="theme.mode() === 'dark'"
            (click)="theme.set('dark')"
            role="radio"
            [attr.aria-checked]="theme.mode() === 'dark'"
            tabindex="0">
        <svg class="ico" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
        Dark
      </span>
      <span class="pill"
            [class.pill--active]="theme.mode() === 'system'"
            (click)="theme.set('system')"
            role="radio"
            [attr.aria-checked]="theme.mode() === 'system'"
            tabindex="0">
        <svg class="ico" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="12" rx="2"/>
          <path d="M8 20h8M12 16v4"/>
        </svg>
        System
      </span>
    </div>
  `,
  styles: [`:host { display: inline-block; }`],
})
export class ThemeSwitchComponent {
  protected theme = inject(ThemeService);
}
```

**Important:** This component is consumed by the Settings page (task 010), not by the sidebar shell. The sidebar status-bar contains only the dot + last-update timestamp + Refresh button — no theme switch.

Visual styling: reuses the existing `.pills` / `.pill` / `.pill--active` rules from `_pill.scss` (created in task 002). No new SCSS file needed.

### Caller updates

Search the codebase for any reference to the old `effective()` method or `aiswing.theme` literal and update:

```bash
grep -rn 'effective()' /var/www/pessoal/ai-swing/frontend/src/app/
grep -rn 'aiswing\.theme' /var/www/pessoal/ai-swing/frontend/src/app/
```

Replace `theme.effective()` → `theme.resolved()`. Replace `'aiswing.theme'` → `'ai-swing.theme'`.

The chart-tokens consumer (currently in `backtest-panel.ts` and `sparkline.ts`) calls `getChartTokens(theme.effective())`. After this task, that becomes `getChartTokens(theme.resolved())` — the signature still expects `'light' | 'dark'` so it works. Note: task 004 will replace `getChartTokens` with `readChartTokens()` (no arg, reads CSS vars). Don't preempt that — just rename `effective` → `resolved` here.

## Files NOT to modify

- `chart-tokens.ts` — task 004 redoes this completely. Leave as-is.
- Any chart component (sparkline, backtest-panel) — task 008/009 redo those.

## Verification

```bash
cd /var/www/pessoal/ai-swing/frontend
npx ng build --configuration=development
```

Smoke test (only if backend + frontend are running):
- Open the app. Default should be light theme on a fresh browser.
- Click the theme switch (3 icons in sidebar footer once task 005 wires it; for now the switch may be in another spot). Theme persists to localStorage as `ai-swing.theme`.
- Switching from light → dark → light fires `themechange` events (verify with `document.addEventListener('themechange', ...)` in console).

## Definition of done

1. `theme.service.ts` matches spec (default `'light'`, key `ai-swing.theme`, dispatchEvent).
2. `theme-switch.ts` renders 3 icon-only radio buttons.
3. No code in `frontend/src/app/` calls `effective()` or uses the old storage key.
4. Build passes.
5. Print `TASK DONE: task-003-theme-service-update.md` at end.
