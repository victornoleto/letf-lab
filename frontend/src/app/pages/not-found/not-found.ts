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
        <div class="notfound-title">Page not found</div>
        <div class="notfound-sub">
          The route <span class="mono" style="color: var(--text-primary);">{{ url }}</span> does not exist or was removed from the catalog.
        </div>
        <div class="notfound-actions">
          <a routerLink="/dashboard" class="btn">
            <svg class="ico" width="12" height="12"><use href="#chevron-right"/></svg>
            Back to dashboard
          </a>
          <a routerLink="/strategies" class="btn btn--primary">
            <svg class="ico" width="12" height="12"><use href="#search"/></svg>
            Search strategies
          </a>
        </div>
      </div>
    </div>
  `,
})
export class NotFoundComponent {
  protected url = typeof location !== 'undefined' ? location.pathname : '';
}
