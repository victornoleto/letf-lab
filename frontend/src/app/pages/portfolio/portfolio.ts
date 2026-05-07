import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import {
  PortfolioPosition,
  PortfolioSummary,
  Transaction,
  TransactionCreate,
  TransactionSide,
} from '../../core/models';
import { ToastService } from '../../shared/toast/toast.service';
import { ModalComponent } from '../../shared/modal/modal';

type Tab = 'positions' | 'transactions';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="list-head">
        <div>
          <h1 class="page-h1">Portfólio</h1>
          <div class="list-head__sub">
            Posições agregadas em USD a partir das transações registradas
          </div>
        </div>
        <div class="list-head__actions">
          <button class="btn btn--primary btn--sm" (click)="openCreate()">
            <svg class="ico" width="11" height="11"><use href="#plus"/></svg>
            Nova transação
          </button>
        </div>
      </header>

      <div class="tabs" role="tablist">
        <button class="tab" role="tab"
                [class.tab--active]="tab() === 'positions'"
                (click)="setTab('positions')">Posições</button>
        <button class="tab" role="tab"
                [class.tab--active]="tab() === 'transactions'"
                (click)="setTab('transactions')">Transações</button>
      </div>

      @if (tab() === 'positions') {
        @if (portfolioLoading()) {
          <div class="skeleton skeleton--card" style="height: 200px;"></div>
        } @else if (!portfolio() || portfolio()!.positions.length === 0) {
          <div class="empty" style="padding: 48px 16px;">
            <div class="empty__title">Nenhuma posição</div>
            <div class="empty__copy">Adicione transações na aba ao lado.</div>
          </div>
        } @else {
          <section class="section">
            <div class="section__body">
              <div class="portfolio-totals">
                <div>
                  <div class="label">Investido</div>
                  <div class="val mono">{{ usd(portfolio()!.invested_usd) }}</div>
                </div>
                <div>
                  <div class="label">Mercado</div>
                  <div class="val mono">{{ usd(portfolio()!.market_value_usd) }}</div>
                </div>
                <div>
                  <div class="label">P/L</div>
                  <div class="val mono" [ngClass]="plCls(portfolio()!.pl_usd)">
                    {{ usd(portfolio()!.pl_usd) }}
                    @if (portfolio()!.pl_pct !== null) {
                      <span style="margin-left: 6px; font-size: 11px; color: var(--text-muted);">
                        {{ pct(portfolio()!.pl_pct) }}
                      </span>
                    }
                  </div>
                </div>
              </div>
            </div>

            <div class="section__body section__body--flush">
              <table class="table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th class="th--num">Shares</th>
                    <th class="th--num">Custo médio</th>
                    <th class="th--num">Investido (USD)</th>
                    <th class="th--num">Preço atual</th>
                    <th class="th--num">Mercado (USD)</th>
                    <th class="th--num">P/L</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of portfolio()!.positions; track p.asset_ticker) {
                    <tr>
                      <td class="mono">{{ p.asset_ticker }}</td>
                      <td class="td--num mono">{{ shares(p.n_shares) }}</td>
                      <td class="td--num mono">{{ usd(p.avg_cost_usd) }}</td>
                      <td class="td--num mono">{{ usd(p.invested_usd) }}</td>
                      <td class="td--num mono">{{ usd(p.current_price_usd) }}</td>
                      <td class="td--num mono">{{ usd(p.market_value_usd) }}</td>
                      <td class="td--num mono" [ngClass]="plCls(p.pl_usd)">
                        @if (p.pl_usd !== null) {
                          {{ usd(p.pl_usd) }}
                          @if (p.pl_pct !== null) {
                            <span style="margin-left: 4px; color: var(--text-muted); font-size: 11px;">
                              {{ pct(p.pl_pct) }}
                            </span>
                          }
                        } @else { — }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        }
      } @else {
        @if (txLoading()) {
          <div class="skeleton skeleton--card" style="height: 200px;"></div>
        } @else if (transactions().length === 0) {
          <div class="empty" style="padding: 48px 16px;">
            <div class="empty__title">Sem transações</div>
            <div class="empty__copy">
              Registre suas compras e vendas — usadas para o portfólio agregado.
            </div>
            <button class="btn btn--primary btn--sm" (click)="openCreate()" style="margin-top: 12px;">
              <svg class="ico" width="11" height="11"><use href="#plus"/></svg>
              Nova transação
            </button>
          </div>
        } @else {
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Ticker</th>
                  <th>Side</th>
                  <th class="th--num">Shares</th>
                  <th class="th--num">Preço</th>
                  <th>Moeda</th>
                  <th class="th--num">FX→USD</th>
                  <th class="th--num">Fees</th>
                  <th>Notas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (t of transactions(); track t.id) {
                  <tr>
                    <td class="mono">{{ t.date }}</td>
                    <td class="mono">{{ t.asset_ticker }}</td>
                    <td>
                      <span class="badge" [ngClass]="t.side === 'buy' ? 'badge--on' : 'badge--off'">
                        {{ t.side }}
                      </span>
                    </td>
                    <td class="td--num mono">{{ shares(t.n_shares) }}</td>
                    <td class="td--num mono">{{ t.price_per_share }}</td>
                    <td class="mono">{{ t.currency }}</td>
                    <td class="td--num mono">{{ t.fx_rate_to_usd }}</td>
                    <td class="td--num mono">{{ t.fees }}</td>
                    <td>{{ t.notes }}</td>
                    <td class="td--icon">
                      <button class="icon-btn" (click)="remove(t)" aria-label="Excluir">
                        <svg width="13" height="13"><use href="#trash"/></svg>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </div>

    <app-modal [open]="showModal()"
               [title]="'Nova transação'"
               (close)="closeModal()">
      <form (submit)="$event.preventDefault(); save()">
        <div class="row-2">
          <div class="field">
            <label class="label">Data</label>
            <input class="input" type="date"
                   [ngModel]="form.date()" (ngModelChange)="form.date.set($event)" name="date" />
          </div>
          <div class="field">
            <label class="label">Ticker</label>
            <input class="input input--mono"
                   [ngModel]="form.asset_ticker()"
                   (ngModelChange)="form.asset_ticker.set($any($event).toUpperCase())"
                   name="ticker" maxlength="16" />
          </div>
        </div>

        <div class="row-2">
          <div class="field">
            <label class="label">Side</label>
            <select class="input"
                    [ngModel]="form.side()" (ngModelChange)="form.side.set($event)" name="side">
              <option value="buy">buy</option>
              <option value="sell">sell</option>
            </select>
          </div>
          <div class="field">
            <label class="label">N. Shares</label>
            <input class="input input--mono" type="number" step="0.0001" min="0"
                   [ngModel]="form.n_shares()" (ngModelChange)="form.n_shares.set(+$event)" name="n_shares" />
          </div>
        </div>

        <div class="row-2">
          <div class="field">
            <label class="label">Preço/share</label>
            <input class="input input--mono" type="number" step="0.0001" min="0"
                   [ngModel]="form.price_per_share()"
                   (ngModelChange)="form.price_per_share.set(+$event)"
                   name="price" />
          </div>
          <div class="field">
            <label class="label">Moeda</label>
            <input class="input input--mono"
                   [ngModel]="form.currency()"
                   (ngModelChange)="form.currency.set($any($event).toUpperCase())"
                   name="currency" maxlength="8" />
          </div>
        </div>

        <div class="row-2">
          <div class="field">
            <label class="label">FX → USD</label>
            <input class="input input--mono" type="number" step="0.0001" min="0"
                   [ngModel]="form.fx()" (ngModelChange)="form.fx.set(+$event)" name="fx" />
            <p class="hint">1 se o trade já é em USD</p>
          </div>
          <div class="field">
            <label class="label">Fees</label>
            <input class="input input--mono" type="number" step="0.01" min="0"
                   [ngModel]="form.fees()" (ngModelChange)="form.fees.set(+$event)" name="fees" />
          </div>
        </div>

        <div class="field">
          <label class="label">Notas</label>
          <textarea class="input" rows="2"
                    [ngModel]="form.notes()" (ngModelChange)="form.notes.set($event)" name="notes"
                    style="height: auto; padding: 8px 10px;"></textarea>
        </div>

        @if (formError()) {
          <div class="banner banner--danger">
            <svg class="ico" width="13" height="13"><use href="#alert-circle"/></svg>
            <span>{{ formError() }}</span>
          </div>
        }

        <div modal-footer class="modal__foot">
          <button type="button" class="btn btn--ghost btn--md" (click)="closeModal()">Cancelar</button>
          <button type="submit" class="btn btn--primary btn--md"
                  [disabled]="!canSave() || saving()">
            @if (saving()) { Salvando… } @else { Salvar }
          </button>
        </div>
      </form>
    </app-modal>
  `,
  styles: [`
    .tabs {
      display: flex;
      gap: 4px;
      margin-top: 8px;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    .tab {
      appearance: none;
      background: transparent;
      border: none;
      padding: 8px 14px;
      font: inherit;
      font-size: 12.5px;
      color: var(--text-muted);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
    }
    .tab:hover { color: var(--text-primary); }
    .tab--active {
      color: var(--text-primary);
      border-bottom-color: var(--accent);
      font-weight: var(--fw-medium);
    }

    .portfolio-totals {
      display: flex;
      flex-wrap: wrap;
      gap: 28px;
      padding: 14px 18px;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--surface-muted);
      margin-bottom: 12px;
    }
    .pl-pos { color: var(--success); }
    .pl-neg { color: var(--danger); }
  `],
})
export class PortfolioComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  tab = signal<Tab>('positions');
  portfolio = signal<PortfolioSummary | null>(null);
  portfolioLoading = signal(true);
  transactions = signal<Transaction[]>([]);
  txLoading = signal(true);

  showModal = signal(false);
  saving = signal(false);
  formError = signal<string | null>(null);
  form = {
    date: signal(new Date().toISOString().slice(0, 10)),
    asset_ticker: signal(''),
    side: signal<TransactionSide>('buy'),
    n_shares: signal<number>(0),
    price_per_share: signal<number>(0),
    currency: signal('USD'),
    fx: signal<number>(1),
    fees: signal<number>(0),
    notes: signal<string>(''),
  };

  ngOnInit(): void {
    this.loadPortfolio();
    this.loadTransactions();
  }

  setTab(t: Tab): void {
    this.tab.set(t);
  }

  loadPortfolio(): void {
    this.portfolioLoading.set(true);
    this.api.getPortfolio().subscribe({
      next: (p) => { this.portfolio.set(p); this.portfolioLoading.set(false); },
      error: () => this.portfolioLoading.set(false),
    });
  }

  loadTransactions(): void {
    this.txLoading.set(true);
    this.api.listTransactions().subscribe({
      next: (rows) => { this.transactions.set(rows); this.txLoading.set(false); },
      error: () => this.txLoading.set(false),
    });
  }

  openCreate(): void {
    this.formError.set(null);
    this.form.date.set(new Date().toISOString().slice(0, 10));
    this.form.asset_ticker.set('');
    this.form.side.set('buy');
    this.form.n_shares.set(0);
    this.form.price_per_share.set(0);
    this.form.currency.set('USD');
    this.form.fx.set(1);
    this.form.fees.set(0);
    this.form.notes.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  canSave(): boolean {
    return (
      this.form.asset_ticker().trim().length > 0 &&
      this.form.n_shares() > 0 &&
      this.form.price_per_share() >= 0 &&
      this.form.fx() > 0
    );
  }

  save(): void {
    if (!this.canSave() || this.saving()) return;
    this.saving.set(true);
    this.formError.set(null);
    const body: TransactionCreate = {
      date: this.form.date(),
      asset_ticker: this.form.asset_ticker().trim().toUpperCase(),
      side: this.form.side(),
      n_shares: this.form.n_shares(),
      price_per_share: this.form.price_per_share(),
      currency: this.form.currency().trim().toUpperCase() || 'USD',
      fx_rate_to_usd: this.form.fx(),
      fees: this.form.fees(),
      notes: this.form.notes() || null,
    };
    this.api.createTransaction(body).subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.toast.push({ variant: 'success', message: 'Transação registrada' });
        this.loadTransactions();
        this.loadPortfolio();
      },
      error: (err) => {
        this.saving.set(false);
        const detail = err?.error?.detail;
        const msg = typeof detail === 'string'
          ? detail
          : Array.isArray(detail) ? detail.map((d: any) => d.msg ?? JSON.stringify(d)).join('; ')
          : 'Falha ao salvar';
        this.formError.set(msg);
      },
    });
  }

  remove(t: Transaction): void {
    if (!confirm(`Remover ${t.side} ${t.n_shares} ${t.asset_ticker}?`)) return;
    this.api.deleteTransaction(t.id).subscribe({
      next: () => {
        this.toast.push({ variant: 'info', message: 'Removida' });
        this.loadTransactions();
        this.loadPortfolio();
      },
    });
  }

  usd(v: string | null): string {
    if (v === null || v === undefined) return '—';
    const n = typeof v === 'string' ? parseFloat(v) : v;
    if (Number.isNaN(n)) return '—';
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  shares(v: string): string {
    const n = parseFloat(v);
    if (Number.isNaN(n)) return v;
    return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
  }

  pct(v: number | null): string {
    if (v === null || v === undefined) return '';
    return (v * 100).toFixed(2) + '%';
  }

  plCls(v: string | null): string {
    if (v === null || v === undefined) return '';
    const n = parseFloat(v);
    if (n > 0) return 'pl-pos';
    if (n < 0) return 'pl-neg';
    return '';
  }
}
