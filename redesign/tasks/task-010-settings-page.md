# Task 010 (v2) — Settings page (`/settings`)

**Goal:** Add a new Settings page reachable at `/settings` with a 2-column layout: vertical settings-nav (Geral / Cron & jobs / Feeds de preço / Notificações / Aparência / API & tokens) on the left, and the active section's form rows on the right. The Aparência section embeds the `<app-theme-switch>` (3-pill segmented control), which is the **only place** in the app where the user can change the theme.

This is a NEW screen — no v1 equivalent.

## Pre-conditions

- Tasks 001-009 done.
- `_settings.scss` partial exists (from task 002): `.settings-grid`, `.settings-nav`, `.settings-section`, `.settings-row`.
- `<app-theme-switch>` exists with `.pills` markup (from task 003).
- `_pill.scss` provides `.pills` / `.pill` / `.pill--active`.
- Sidebar nav has 3 items (Dashboard / Estratégias / Indicadores); Settings is reachable via Command Palette (task 012) and via direct URL — there's NO sidebar entry for it (per the canonical render).

## Sources

1. `design-export/linear-extras.jsx` — `SettingsScreen` component (line 328+) is the canonical reference
2. `design-export/00-OVERVIEW.md` "Theme toggle vai pro rodapé da sidebar como segmented control" — superseded by JSX render which puts it in Settings

## Files to create

| File | Purpose |
|---|---|
| `frontend/src/app/pages/settings/settings.ts` | Page component matching the canonical render |

## Files to modify

| File | Change |
|---|---|
| `frontend/src/app/app.routes.ts` | Add `{ path: 'settings', loadComponent: () => import('./pages/settings/settings').then(m => m.SettingsComponent) }` |

## Component layout

```ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeSwitchComponent } from '../../shared/theme/theme-switch';

type Section = 'geral' | 'cron' | 'feeds' | 'notif' | 'aparencia' | 'api';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ThemeSwitchComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1 class="page-h1">Configurações</h1>
          <p class="page-sub">Workspace · cron · feeds · aparência</p>
        </div>
      </header>

      <div class="settings-grid">
        <nav class="settings-nav" aria-label="Configurações">
          <span class="item" [class.active]="active() === 'geral'"     (click)="active.set('geral')">Geral</span>
          <span class="item" [class.active]="active() === 'cron'"      (click)="active.set('cron')">Cron & jobs</span>
          <span class="item" [class.active]="active() === 'feeds'"     (click)="active.set('feeds')">Feeds de preço</span>
          <span class="item" [class.active]="active() === 'notif'"     (click)="active.set('notif')">Notificações</span>
          <span class="item" [class.active]="active() === 'aparencia'" (click)="active.set('aparencia')">Aparência</span>
          <span class="item" [class.active]="active() === 'api'"       (click)="active.set('api')">API & tokens</span>
        </nav>

        <div class="settings-content">
          @switch (active()) {
            @case ('geral') {
              <section class="settings-section">
                <div class="settings-row">
                  <div>
                    <div class="lbl">Nome do workspace</div>
                    <div class="desc">Aparece no header e em emails de transição.</div>
                  </div>
                  <input class="input" [(ngModel)]="model.workspace" />
                </div>
                <div class="settings-row">
                  <div>
                    <div class="lbl">Timezone</div>
                    <div class="desc">Usado para timestamps do cron diário.</div>
                  </div>
                  <select class="input" [(ngModel)]="model.tz">
                    <option>America/New_York (ET)</option>
                    <option>America/Sao_Paulo</option>
                    <option>UTC</option>
                  </select>
                </div>
              </section>
            }

            @case ('cron') {
              <section class="settings-section">
                <div class="settings-row">
                  <div>
                    <div class="lbl">Cron diário</div>
                    <div class="desc">Quando rodar o pipeline de sinais. Default 22h ET (após close).</div>
                  </div>
                  <input class="input input--mono" [(ngModel)]="model.cron" />
                </div>
                <div class="settings-row">
                  <div>
                    <div class="lbl">Cache de backtest</div>
                    <div class="desc">Local. Limpe se mudar a definição de indicadores.</div>
                  </div>
                  <button class="btn">
                    <svg class="ico" width="12" height="12"><use href="#trash"/></svg>
                    Limpar cache (124 MB)
                  </button>
                </div>
              </section>
            }

            @case ('feeds') {
              <section class="settings-section">
                <div class="settings-row">
                  <div>
                    <div class="lbl">Provider de preços</div>
                    <div class="desc">Fonte primária dos OHLC.</div>
                  </div>
                  <div class="pills">
                    <span class="pill" [class.pill--active]="model.provider === 'yfinance'" (click)="model.provider = 'yfinance'">yfinance</span>
                    <span class="pill" [class.pill--active]="model.provider === 'polygon'"  (click)="model.provider = 'polygon'">polygon</span>
                    <span class="pill" [class.pill--active]="model.provider === 'tiingo'"   (click)="model.provider = 'tiingo'">tiingo</span>
                  </div>
                </div>
              </section>
            }

            @case ('notif') {
              <section class="settings-section">
                <div class="settings-row">
                  <div>
                    <div class="lbl">Email em transição</div>
                    <div class="desc">Avisa quando uma estratégia muda de estado (on ↔ off ↔ borderline).</div>
                  </div>
                  <div class="pills">
                    <span class="pill" [class.pill--active]="model.emailNotif"  (click)="model.emailNotif = true">on</span>
                    <span class="pill" [class.pill--active]="!model.emailNotif" (click)="model.emailNotif = false">off</span>
                  </div>
                </div>
              </section>
            }

            @case ('aparencia') {
              <section class="settings-section">
                <div class="settings-row">
                  <div>
                    <div class="lbl">Aparência</div>
                    <div class="desc">Tema do app · respeita preferência do SO quando "System".</div>
                  </div>
                  <app-theme-switch />
                </div>
              </section>
            }

            @case ('api') {
              <section class="settings-section">
                <div class="settings-row">
                  <div>
                    <div class="lbl">API tokens</div>
                    <div class="desc">Em breve.</div>
                  </div>
                  <span class="badge badge--neutral">Em breve</span>
                </div>
              </section>
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class SettingsComponent {
  active = signal<Section>('geral');

  model = {
    workspace: 'AI-Swing · trader@aiswing.dev',
    tz: 'America/New_York (ET)',
    cron: '0 22 * * 1-5',
    provider: 'yfinance' as 'yfinance' | 'polygon' | 'tiingo',
    emailNotif: true,
  };
}
```

Note: Settings doesn't yet persist to a backend — values are local-only state for this task. Wiring a `SettingsService` or backend endpoint is out of scope (TODO comment).

## Notes

- The form rows follow `_settings.scss` `.settings-row` grid: `1fr 280px`. Left side has `.lbl` (semibold 13px) + `.desc` (muted 11.5px). Right side has the control.
- The Aparência section wires `<app-theme-switch>` directly — no extra plumbing. Selecting a pill calls `theme.set(mode)` via the existing service.
- No save button per row (settings auto-persist on change). Add a footer "Salvar" button + `dirty` tracking later when wiring the backend.

## What NOT to do

- Don't add a sidebar entry for Settings. The canonical render has no Settings nav item — it's reached via `⌘K` palette or direct URL.
- Don't make Settings a modal — it's a full page route.

## Verification

```bash
cd /var/www/pessoal/ai-swing/frontend
npx ng build --configuration=development
```

Manual smoke:
- Navigate to `/settings` → page renders with 2-column layout.
- Click each tab on the left → right side switches sections.
- "Aparência" tab shows theme-switch with 3 pills; clicking changes the theme app-wide.
- Theme change persists via `localStorage('ai-swing.theme')`.

## Definition of done

1. `pages/settings/settings.ts` exists with the structure above.
2. `app.routes.ts` has the `/settings` route.
3. Theme switch is functional from this page.
4. No sidebar nav item for Settings.
5. Build passes.
6. Print `TASK DONE: task-010-settings-page.md` at end.
