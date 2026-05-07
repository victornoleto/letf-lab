# Task 011 (v2) — Login page (`/login`) — full-screen, no shell

**Goal:** Add a `/login` route that renders a centered card on a plain `--bg` background, **without the sidebar/shell**. Card has the brand mark, title "Entrar", email + password inputs, primary "Entrar" button (indigo), divider "OU", secondary "Continuar com SSO" (icon + label), and a mono small footer with version + last sync.

This task does NOT integrate authentication. The form submits to a placeholder handler that just logs / navigates. Auth wiring is a future task.

## Pre-conditions

- Tasks 001-009 done.
- `_login.scss` partial exists (from task 002).
- `_brand.scss` partial provides `.brand`, `.brand__mark`, `.brand__name` rules used by the login card too (a slightly larger size variant).
- `_field.scss` provides `.field`, `.label`, `.input`.
- `_button.scss` provides `.btn`, `.btn--primary`.

## Sources

1. `design-export/linear-extras.jsx` — `LoginScreen` component (line 73+)

## Files to create

| File | Purpose |
|---|---|
| `frontend/src/app/pages/login/login.ts` | Page component matching the canonical render |

## Files to modify

| File | Change |
|---|---|
| `frontend/src/app/app.routes.ts` | Add `{ path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent) }` |

**Important:** The login page must render WITHOUT the app-shell (sidebar). Two options:

(a) Render a normal page component but the parent `app.html` recognizes the current URL and conditionally hides the sidebar. Add to `app.ts`: `isAuthRoute = computed(() => this.url().startsWith('/login'))`. Wrap `<aside>` and `<main>` in `@if (!isAuthRoute()) { ... } @else { <router-outlet /> }`.

(b) Use a router structure with two layout shells: `MainLayoutComponent` (with sidebar) for app routes, `AuthLayoutComponent` (bare) for `/login`. Move the sidebar markup into `MainLayoutComponent`.

**Choose (a)** — simpler and matches the existing app structure with one-off conditional. Don't refactor into a new layout component for one auth page.

## Component

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { inject } from '@angular/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="login-shell">
      <div class="login-card">
        <div class="login-brand">
          <span class="brand__mark brand__mark--lg">
            <!-- Same logo SVG as sidebar but slightly larger (use 18-20px) -->
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="5.5" y1="6.5" x2="5.5" y2="14.5" stroke="var(--bg)" stroke-width="1.2" stroke-linecap="round"/>
              <rect x="4" y="9" width="3" height="4" rx="0.4" fill="var(--danger)"/>
              <line x1="12" y1="3.5" x2="12" y2="13" stroke="var(--bg)" stroke-width="1.2" stroke-linecap="round"/>
              <rect x="10.5" y="5.5" width="3" height="6" rx="0.4" fill="var(--success)"/>
              <line x1="18.5" y1="2" x2="18.5" y2="11.5" stroke="var(--bg)" stroke-width="1.2" stroke-linecap="round"/>
              <rect x="17" y="3.5" width="3" height="7" rx="0.4" fill="var(--success)"/>
              <path d="M3 19.5 Q 8 17 12 18.5 T 21 16" stroke="var(--bg)" stroke-width="1.6" stroke-linecap="round" fill="none"/>
              <path d="M19 14.5 L 21.2 16 L 19.7 18.2" stroke="var(--bg)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            </svg>
          </span>
          <span class="brand__name">
            <span>AI</span><span class="brand__dot">·</span><span>Swing</span>
          </span>
        </div>

        <h1 class="login-title">Entrar</h1>
        <p class="login-sub">Acesso ao monitor de estratégias rotacionais.</p>

        <form (submit)="$event.preventDefault(); submit()">
          <div class="field">
            <label class="label" for="login-email">Email</label>
            <input id="login-email" class="input" type="email"
                   [(ngModel)]="model.email" name="email"
                   autocomplete="username" required />
          </div>

          <div class="field">
            <label class="label" for="login-pass">Senha</label>
            <input id="login-pass" class="input" type="password"
                   [(ngModel)]="model.password" name="password"
                   autocomplete="current-password" required />
          </div>

          <button type="submit" class="btn btn--primary"
                  style="width: 100%; justify-content: center; padding: 9px 12px; margin-top: 4px;">
            Entrar
          </button>

          <div class="login-divider">ou</div>

          <button type="button" class="btn"
                  style="width: 100%; justify-content: center; padding: 9px 12px;"
                  (click)="continueWithSSO()">
            <svg class="ico" width="13" height="13"><use href="#command"/></svg>
            Continuar com SSO
          </button>

          <p class="login-foot">v0.4.2 · cron 22h ET · last sync 14:32</p>
        </form>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private router = inject(Router);
  model = { email: '', password: '' };

  submit(): void {
    // TODO: integrate auth service. For now, navigate to dashboard.
    console.log('login submit', this.model.email);
    this.router.navigate(['/dashboard']);
  }

  continueWithSSO(): void {
    console.log('SSO clicked');
    this.router.navigate(['/dashboard']);
  }
}
```

## Conditional shell rendering in `app.ts`

Update `app.ts` to compute the current route and hide the shell on `/login`:

```ts
import { Router, NavigationEnd } from '@angular/router';
import { computed, signal } from '@angular/core';

// inside class
private currentUrl = signal<string>('');
isShellRoute = computed(() => !this.currentUrl().startsWith('/login'));

constructor() {
  inject(Router).events.subscribe(ev => {
    if (ev instanceof NavigationEnd) {
      this.currentUrl.set(ev.urlAfterRedirects);
    }
  });
  this.currentUrl.set(location.pathname);
}
```

In `app.html`, wrap the entire `<div class="shell">` with `@if (isShellRoute()) { … } @else { <router-outlet /> }`.

## What NOT to do

- Don't implement real auth — out of scope.
- Don't add a "Forgot password?" link or remember-me checkbox — not in canonical render.
- Don't add the login route to the sidebar nav.

## Verification

```bash
cd /var/www/pessoal/ai-swing/frontend
npx ng build --configuration=development
```

Manual smoke:
- Navigate to `/login` → centered card, NO sidebar visible.
- Submit (or click SSO) → navigates to `/dashboard` (with shell back).
- Resize viewport: card stays centered.

## Definition of done

1. `pages/login/login.ts` exists.
2. `/login` route registered.
3. Shell hidden on `/login` via conditional in `app.html`.
4. Build passes.
5. Print `TASK DONE: task-011-login-page.md` at end.
