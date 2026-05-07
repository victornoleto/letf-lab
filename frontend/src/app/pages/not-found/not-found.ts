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
  protected url = typeof location !== 'undefined' ? location.pathname : '';
}
