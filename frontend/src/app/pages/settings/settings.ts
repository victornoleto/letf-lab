import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeSwitchComponent } from '../../shared/theme/theme-switch';

type Section = 'general' | 'cron' | 'feeds' | 'notifications' | 'appearance' | 'api';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ThemeSwitchComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1 class="page-h1">Settings</h1>
          <p class="page-sub">Workspace · cron · feeds · appearance</p>
        </div>
      </header>

      <div class="settings-grid">
        <nav class="settings-nav" aria-label="Settings">
          <span class="item" [class.active]="active() === 'general'"   (click)="active.set('general')">General</span>
          <span class="item" [class.active]="active() === 'cron'"      (click)="active.set('cron')">Cron & jobs</span>
          <span class="item" [class.active]="active() === 'feeds'"     (click)="active.set('feeds')">Price feeds</span>
          <span class="item" [class.active]="active() === 'notifications'" (click)="active.set('notifications')">Notifications</span>
          <span class="item" [class.active]="active() === 'appearance'" (click)="active.set('appearance')">Appearance</span>
          <span class="item" [class.active]="active() === 'api'"       (click)="active.set('api')">API & tokens</span>
        </nav>

        <div class="settings-content">
          @switch (active()) {
            @case ('general') {
              <section class="settings-section">
                <div class="settings-row">
                  <div>
                    <div class="lbl">Workspace name</div>
                    <div class="desc">Appears in the header and transition emails.</div>
                  </div>
                  <input class="input" [(ngModel)]="model.workspace" />
                </div>
                <div class="settings-row">
                  <div>
                    <div class="lbl">Timezone</div>
                    <div class="desc">Used for daily cron timestamps.</div>
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
                    <div class="lbl">Daily cron</div>
                    <div class="desc">When to run the signal pipeline. Default is 10pm ET (after close).</div>
                  </div>
                  <input class="input input--mono" [(ngModel)]="model.cron" />
                </div>
                <div class="settings-row">
                  <div>
                    <div class="lbl">Backtest cache</div>
                    <div class="desc">Local. Clear it if indicator definitions change.</div>
                  </div>
                  <button class="btn">
                    <svg class="ico" width="12" height="12"><use href="#trash"/></svg>
                    Clear cache (124 MB)
                  </button>
                </div>
              </section>
            }

            @case ('feeds') {
              <section class="settings-section">
                <div class="settings-row">
                  <div>
                    <div class="lbl">Price provider</div>
                    <div class="desc">Primary OHLC source.</div>
                  </div>
                  <div class="pills">
                    <span class="pill" [class.pill--active]="model.provider === 'yfinance'" (click)="model.provider = 'yfinance'">yfinance</span>
                    <span class="pill" [class.pill--active]="model.provider === 'polygon'"  (click)="model.provider = 'polygon'">polygon</span>
                    <span class="pill" [class.pill--active]="model.provider === 'tiingo'"   (click)="model.provider = 'tiingo'">tiingo</span>
                  </div>
                </div>
              </section>
            }

            @case ('notifications') {
              <section class="settings-section">
                <div class="settings-row">
                  <div>
                    <div class="lbl">Transition email</div>
                    <div class="desc">Sends an alert when a strategy changes state (on ↔ off ↔ borderline).</div>
                  </div>
                  <div class="pills">
                    <span class="pill" [class.pill--active]="model.emailNotif"  (click)="model.emailNotif = true">on</span>
                    <span class="pill" [class.pill--active]="!model.emailNotif" (click)="model.emailNotif = false">off</span>
                  </div>
                </div>
              </section>
            }

            @case ('appearance') {
              <section class="settings-section">
                <div class="settings-row">
                  <div>
                    <div class="lbl">Appearance</div>
                    <div class="desc">App theme · follows the OS preference when set to "System".</div>
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
                    <div class="desc">Coming soon.</div>
                  </div>
                  <span class="badge badge--neutral">Coming soon</span>
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
  active = signal<Section>('general');

  // TODO: wire to SettingsService / backend — values are local-only state for now.
  model = {
    workspace: 'LETF Lab · trader@letf-lab.local',
    tz: 'America/New_York (ET)',
    cron: '0 22 * * 1-5',
    provider: 'yfinance' as 'yfinance' | 'polygon' | 'tiingo',
    emailNotif: true,
  };
}
