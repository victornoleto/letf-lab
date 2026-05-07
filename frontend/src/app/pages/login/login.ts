import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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
    console.log('login submit', this.model.email);
    this.router.navigate(['/dashboard']);
  }

  continueWithSSO(): void {
    console.log('SSO clicked');
    this.router.navigate(['/dashboard']);
  }
}
