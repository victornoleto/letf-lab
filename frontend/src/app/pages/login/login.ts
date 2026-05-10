import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

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
            <span>LETF</span><span class="brand__dot">·</span><span>Lab</span>
          </span>
        </div>

        <h1 class="login-title">Sign In</h1>
        <p class="login-sub">Access the rotational strategies monitor.</p>

        <form (submit)="$event.preventDefault(); submit()">
          <div class="field">
            <label class="label" for="login-email">Email</label>
            <input id="login-email" class="input" type="email"
                   [ngModel]="email()" (ngModelChange)="email.set($event)" name="email"
                   autocomplete="username" required />
          </div>

          <div class="field">
            <label class="label" for="login-pass">Password</label>
            <input id="login-pass" class="input" type="password"
                   [ngModel]="password()" (ngModelChange)="password.set($event)" name="password"
                   autocomplete="current-password" required />
          </div>

          @if (error()) {
            <div class="banner banner--danger" style="margin-top: 4px;">
              <svg class="ico" width="13" height="13"><use href="#alert-circle"/></svg>
              <span>{{ error() }}</span>
            </div>
          }

          <button type="submit" class="btn btn--primary"
                  [disabled]="submitting() || !canSubmit()"
                  style="width: 100%; justify-content: center; padding: 9px 12px; margin-top: 4px;">
            @if (submitting()) {
              <svg class="ico spin" width="13" height="13"><use href="#refresh"/></svg>
              Signing in...
            } @else {
              Sign in
            }
          </button>

          <p class="login-foot">v0.4.2 · cron 22h ET</p>
        </form>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = signal('');
  password = signal('');
  submitting = signal(false);
  error = signal<string | null>(null);

  canSubmit(): boolean {
    return this.email().trim().length > 0 && this.password().length > 0;
  }

  submit(): void {
    if (!this.canSubmit() || this.submitting()) return;
    this.submitting.set(true);
    this.error.set(null);
    this.auth.login(this.email().trim(), this.password()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.submitting.set(false);
        const detail = err?.error?.detail;
        this.error.set(typeof detail === 'string' ? detail : 'Authentication failed');
      },
    });
  }
}
