import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ThemeService, ThemeMode } from './theme.service';

@Component({
  selector: 'app-theme-switch',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pills theme-switch" role="radiogroup" aria-label="Tema">
      <span class="pill pill--icon"
            [class.pill--active]="theme.mode() === 'light'"
            (click)="theme.set('light')"
            role="radio"
            [attr.aria-checked]="theme.mode() === 'light'"
            aria-label="Light"
            title="Light"
            tabindex="0">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
        </svg>
      </span>
      <span class="pill pill--icon"
            [class.pill--active]="theme.mode() === 'dark'"
            (click)="theme.set('dark')"
            role="radio"
            [attr.aria-checked]="theme.mode() === 'dark'"
            aria-label="Dark"
            title="Dark"
            tabindex="0">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </span>
      <span class="pill pill--icon"
            [class.pill--active]="theme.mode() === 'system'"
            (click)="theme.set('system')"
            role="radio"
            [attr.aria-checked]="theme.mode() === 'system'"
            aria-label="System"
            title="System"
            tabindex="0">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="12" rx="2"/>
          <path d="M8 20h8M12 16v4"/>
        </svg>
      </span>
    </div>
  `,
  styles: [`
    :host { display: inline-block; }
    .theme-switch .pill--icon {
      padding: 4px 6px;
      display: inline-grid;
      place-items: center;
      gap: 0;
    }
  `],
})
export class ThemeSwitchComponent {
  protected theme = inject(ThemeService);
}
