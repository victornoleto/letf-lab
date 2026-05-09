import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
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

  // TODO: wire to SettingsService / backend — values are local-only state for now.
  model = {
    workspace: 'LETF Lab · trader@letf-lab.local',
    tz: 'America/New_York (ET)',
    cron: '0 22 * * 1-5',
    provider: 'yfinance' as 'yfinance' | 'polygon' | 'tiingo',
    emailNotif: true,
  };
}
