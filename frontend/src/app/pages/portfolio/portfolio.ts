import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  AxisPointerComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';
import { ApiService } from '../../core/api.service';
import {
  PortfolioHistory,
  PortfolioSummary,
  Transaction,
  TransactionCreate,
  TransactionSide,
} from '../../core/models';
import { ToastService } from '../../shared/toast/toast.service';
import { ModalComponent } from '../../shared/modal/modal';
import { readChartTokens, tok } from '../../shared/charts/chart-tokens';

echarts.use([
  LineChart,
  AxisPointerComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
]);

type Tab = 'positions' | 'transactions';

function todayLocalIsoDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1 class="page-head__h1">Portfólio</h1>
          <div class="page-head__sub">
            Posições agregadas em {{ currency() }} a partir das transações registradas
            @if (portfolio()?.fx_rate_used) {
              · USDBRL: {{ formatFxRate(portfolio()!.fx_rate_used!) }}
            }
          </div>
        </div>
        <div class="page-head__actions">
          <div class="pills">
            <span class="pill" [class.pill--active]="currency() === 'USD'"
                  (click)="setCurrency('USD')">USD</span>
            <span class="pill" [class.pill--active]="currency() === 'BRL'"
                  (click)="setCurrency('BRL')">BRL</span>
          </div>
          <button class="btn btn--primary" (click)="openCreate()">
            <svg class="ico" width="12" height="12"><use href="#plus"/></svg>
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
            <header class="section__head portfolio-history-head">
              <div>
                <h3 class="section__title">Evolução do portfólio</h3>
                <p class="section__sub">
                  Valor de mercado em USD comparado ao benchmark com os mesmos fluxos de compra/venda.
                </p>
              </div>
              <label class="benchmark-field">
                <span class="label">Benchmark</span>
                <input class="input input--mono benchmark-input"
                       list="portfolio-benchmarks"
                       [ngModel]="benchmark()"
                       (change)="setBenchmark($any($event.target).value)" />
                <datalist id="portfolio-benchmarks">
                  @for (b of benchmarkOptions; track b) {
                    <option [value]="b"></option>
                  }
                </datalist>
              </label>
            </header>
            <div class="section__body">
              @if (historyLoading()) {
                <div class="skeleton skeleton--card" style="height: 260px;"></div>
              } @else if (historyError()) {
                <div class="banner banner--danger">
                  <svg class="ico" width="13" height="13"><use href="#alert-circle"/></svg>
                  <span>{{ historyError() }}</span>
                </div>
              } @else if (!history() || history()!.points.length === 0) {
                <div class="empty" style="padding: 32px 16px;">
                  <div class="empty__title">Histórico indisponível</div>
                  <div class="empty__copy">Não há preços suficientes para montar a curva.</div>
                </div>
              } @else {
                <div #historyHost class="portfolio-history-chart"></div>
              }
            </div>

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
               [subtitle]="'Registrar compra ou venda no portfólio'"
               (close)="closeModal()">
      <form id="portfolio-tx-form" (submit)="$event.preventDefault(); save()">

        <!-- Side: segmented control buy/sell -->
        <div class="field">
          <label class="label">Operação</label>
          <div class="segmented" role="tablist">
            <button type="button" role="tab"
                    class="segmented__opt segmented__opt--buy"
                    [class.segmented__opt--active]="form.side() === 'buy'"
                    (click)="form.side.set('buy')">Buy</button>
            <button type="button" role="tab"
                    class="segmented__opt segmented__opt--sell"
                    [class.segmented__opt--active]="form.side() === 'sell'"
                    (click)="form.side.set('sell')">Sell</button>
          </div>
        </div>

        <div class="row-2">
          <div class="field">
            <label class="label">Data</label>
            <input class="input" type="date"
                   [ngModel]="form.date()" (ngModelChange)="form.date.set($event)" name="date" />
          </div>
          <div class="field">
            <label class="label">Ticker</label>
            <input class="input input--mono" placeholder="AAPL"
                   [ngModel]="form.asset_ticker()"
                   (ngModelChange)="form.asset_ticker.set($any($event).toUpperCase())"
                   name="ticker" maxlength="16" />
          </div>
        </div>

        <div class="row-3">
          <div class="field">
            <label class="label">Preço da cota</label>
            <div class="input-affix input-affix--suffix">
              <input class="input input--mono" type="number" step="0.0001" min="0"
                     [ngModel]="form.price_per_share()"
                     (ngModelChange)="setTradeAmount('price', $event)"
                     name="price" />
              <span class="input-affix__suffix">{{ form.currency() || 'USD' }}</span>
            </div>
          </div>
          <div class="field">
            <label class="label">Valor pago</label>
            <div class="input-affix input-affix--suffix">
              <input class="input input--mono" type="number" step="0.01" min="0"
                     [ngModel]="form.total_paid()"
                     (ngModelChange)="setTradeAmount('total', $event)"
                     name="total_paid" />
              <span class="input-affix__suffix">{{ form.currency() || 'USD' }}</span>
            </div>
          </div>
          <div class="field">
            <label class="label">N. cotas</label>
            <input class="input input--mono" type="number" step="0.00000001" min="0"
                   [ngModel]="form.n_shares()"
                   (ngModelChange)="setTradeAmount('shares', $event)"
                   name="n_shares" />
          </div>
        </div>

        <div class="modal__divider"></div>

        <div class="row-3">
          <div class="field">
            <label class="label">Moeda</label>
            <select class="input"
                    [ngModel]="form.currency()" (ngModelChange)="form.currency.set($event)" name="currency">
              <option value="USD">USD</option>
              <option value="BRL">BRL</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          <div class="field">
            <label class="label">
              FX → USD
              <span class="label__hint">1 se já é USD</span>
            </label>
            <input class="input input--mono" type="number" step="0.0001" min="0"
                   [ngModel]="form.fx()" (ngModelChange)="form.fx.set(+$event)" name="fx" />
          </div>
          <div class="field">
            <label class="label">Fees</label>
            <div class="input-affix input-affix--suffix">
              <input class="input input--mono" type="number" step="0.01" min="0"
                     [ngModel]="form.fees()" (ngModelChange)="form.fees.set(+$event)" name="fees" />
              <span class="input-affix__suffix">{{ form.currency() || 'USD' }}</span>
            </div>
          </div>
        </div>

        <div class="field">
          <label class="label">
            Notas
            <span class="label__hint">opcional</span>
          </label>
          <textarea class="input" rows="2" placeholder="Estratégia, observação, …"
                    [ngModel]="form.notes()" (ngModelChange)="form.notes.set($event)" name="notes"></textarea>
        </div>

        @if (formError()) {
          <div class="banner banner--danger">
            <svg class="ico" width="13" height="13"><use href="#alert-circle"/></svg>
            <span>{{ formError() }}</span>
          </div>
        }
      </form>

      <div modal-footer class="modal__foot">
        <span class="foot-hint">
          <kbd>Esc</kbd> fechar · <kbd>⌘</kbd><kbd>↵</kbd> salvar
        </span>
        <button type="button" class="btn btn--ghost btn--md" (click)="closeModal()">Cancelar</button>
        <button type="button" class="btn btn--secondary btn--md"
                [disabled]="!canSave() || saving()"
                (click)="save(true)">
          @if (saving()) { Salvando… } @else { Salvar e criar outra }
        </button>
        <button type="submit" form="portfolio-tx-form" class="btn btn--primary btn--md"
                [disabled]="!canSave() || saving()">
          @if (saving()) { Salvando… } @else { Salvar }
        </button>
      </div>
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
    .portfolio-history-head {
      align-items: flex-start;
      gap: 16px;
    }
    .benchmark-field {
      display: grid;
      gap: 6px;
      min-width: 128px;
    }
    .benchmark-input {
      width: 128px;
      text-transform: uppercase;
    }
    .portfolio-history-chart { height: 280px; }
    @media (max-width: 720px) {
      .portfolio-history-head { display: grid; }
      .benchmark-field, .benchmark-input { width: 100%; }
    }
    .pl-pos { color: var(--success); }
    .pl-neg { color: var(--danger); }
  `],
})
export class PortfolioComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private injector = inject(Injector);
  private historyHost = viewChild<ElementRef<HTMLDivElement>>('historyHost');

  tab = signal<Tab>('positions');
  currency = signal<'USD' | 'BRL'>('USD');
  portfolio = signal<PortfolioSummary | null>(null);
  portfolioLoading = signal(true);
  history = signal<PortfolioHistory | null>(null);
  historyLoading = signal(true);
  historyError = signal<string | null>(null);
  benchmark = signal('SPY');
  transactions = signal<Transaction[]>([]);
  txLoading = signal(true);
  benchmarkOptions = ['SPY', 'QQQ', 'VT', 'IVV', 'VOO'];

  private historyChart?: echarts.ECharts;
  private ro?: ResizeObserver;
  private themeListener = () => this.redrawHistoryChart();

  showModal = signal(false);
  saving = signal(false);
  formError = signal<string | null>(null);
  form = {
    date: signal(todayLocalIsoDate()),
    asset_ticker: signal(''),
    side: signal<TransactionSide>('buy'),
    n_shares: signal<number>(0),
    price_per_share: signal<number>(0),
    total_paid: signal<number>(0),
    currency: signal('USD'),
    fx: signal<number>(1),
    fees: signal<number>(0),
    notes: signal<string>(''),
  };

  ngOnInit(): void {
    this.loadPortfolio();
    this.loadHistory();
    this.loadTransactions();

    effect(
      () => {
        const host = this.historyHost()?.nativeElement;
        const h = this.history();
        if (!host) {
          this.disposeHistoryChart();
          return;
        }
        if (!this.historyChart) {
          this.historyChart = echarts.init(host);
          this.ro = new ResizeObserver(() => this.historyChart?.resize());
          this.ro.observe(host);
        }
        if (h) this.redrawHistoryChart();
      },
      { injector: this.injector },
    );

    document.addEventListener('themechange', this.themeListener);
  }

  ngOnDestroy(): void {
    document.removeEventListener('themechange', this.themeListener);
    this.disposeHistoryChart();
  }

  setTab(t: Tab): void {
    this.tab.set(t);
  }

  loadPortfolio(): void {
    this.portfolioLoading.set(true);
    this.api.getPortfolio(this.currency()).subscribe({
      next: (p) => { this.portfolio.set(p); this.portfolioLoading.set(false); },
      error: () => this.portfolioLoading.set(false),
    });
  }

  loadHistory(): void {
    this.historyLoading.set(true);
    this.historyError.set(null);
    this.api.getPortfolioHistory(this.benchmark()).subscribe({
      next: (h) => {
        this.history.set(h);
        this.historyLoading.set(false);
      },
      error: () => {
        this.history.set(null);
        this.historyError.set('Falha ao carregar histórico do portfólio');
        this.historyLoading.set(false);
      },
    });
  }

  setBenchmark(raw: string): void {
    const next = (raw || 'SPY').trim().toUpperCase();
    if (this.benchmark() === next) return;
    this.benchmark.set(next);
    this.loadHistory();
  }

  setCurrency(c: 'USD' | 'BRL'): void {
    if (this.currency() === c) return;
    this.currency.set(c);
    this.loadPortfolio();
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
    this.form.date.set(todayLocalIsoDate());
    this.form.asset_ticker.set('');
    this.form.side.set('buy');
    this.form.n_shares.set(0);
    this.form.price_per_share.set(0);
    this.form.total_paid.set(0);
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

  setTradeAmount(field: 'price' | 'total' | 'shares', raw: string | number): void {
    const value = this.toNumber(raw);
    if (field === 'price') this.form.price_per_share.set(value);
    if (field === 'total') this.form.total_paid.set(value);
    if (field === 'shares') this.form.n_shares.set(value);

    const price = this.form.price_per_share();
    const total = this.form.total_paid();
    const shares = this.form.n_shares();

    if (field === 'price') {
      if (price > 0 && total > 0) this.form.n_shares.set(this.roundShares(total / price));
      else if (price > 0 && shares > 0) this.form.total_paid.set(this.roundMoney(price * shares));
      return;
    }

    if (field === 'total') {
      if (total > 0 && price > 0) this.form.n_shares.set(this.roundShares(total / price));
      else if (total > 0 && shares > 0) this.form.price_per_share.set(this.roundPrice(total / shares));
      return;
    }

    if (shares > 0 && price > 0) this.form.total_paid.set(this.roundMoney(shares * price));
    else if (shares > 0 && total > 0) this.form.price_per_share.set(this.roundPrice(total / shares));
  }

  private toNumber(raw: string | number): number {
    const value = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(value) ? value : 0;
  }

  private roundShares(value: number): number {
    return Math.round(value * 100_000_000) / 100_000_000;
  }

  private roundPrice(value: number): number {
    return Math.round(value * 1_000_000) / 1_000_000;
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }

  save(createAnother = false): void {
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
        if (createAnother) this.resetTransactionFields();
        else this.showModal.set(false);
        this.toast.push({ variant: 'success', message: 'Transação registrada' });
        this.loadTransactions();
        this.loadPortfolio();
        this.loadHistory();
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

  private resetTransactionFields(): void {
    this.form.date.set(todayLocalIsoDate());
    this.form.asset_ticker.set('');
    this.form.side.set('buy');
    this.form.n_shares.set(0);
    this.form.price_per_share.set(0);
    this.form.total_paid.set(0);
    this.form.fees.set(0);
    this.form.notes.set('');
    this.formError.set(null);
  }

  remove(t: Transaction): void {
    if (!confirm(`Remover ${t.side} ${t.n_shares} ${t.asset_ticker}?`)) return;
    this.api.deleteTransaction(t.id).subscribe({
      next: () => {
        this.toast.push({ variant: 'info', message: 'Removida' });
        this.loadTransactions();
        this.loadPortfolio();
        this.loadHistory();
      },
    });
  }

  private disposeHistoryChart(): void {
    this.ro?.disconnect();
    this.ro = undefined;
    this.historyChart?.dispose();
    this.historyChart = undefined;
  }

  private redrawHistoryChart(): void {
    const h = this.history();
    if (!h || !this.historyChart) return;
    const t = readChartTokens();
    this.historyChart.setOption(this.historyOptions(h, t), true);
  }

  private historyOptions(h: PortfolioHistory, t = readChartTokens()): EChartsOption {
    return {
      animation: false,
      grid: { left: 4, right: 8, top: 28, bottom: 24, containLabel: true },
      textStyle: { fontFamily: t.fontMono, fontSize: 11, color: t.textMuted },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: t.border } },
        axisTick: { show: false },
        axisLabel: { color: t.textMuted, fontSize: 10, hideOverlap: true },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        position: 'right',
        scale: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: t.textMuted, fontSize: 10, formatter: (v: number) => this.usdNumber(v) },
        splitLine: { lineStyle: { color: t.grid, type: [3, 3] } },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: tok('--surface-elevated'),
        borderColor: t.border,
        borderWidth: 1,
        padding: [10, 12],
        textStyle: { color: t.textPrimary, fontSize: 12, fontFamily: t.fontMono },
        axisPointer: { lineStyle: { color: t.border, width: 1 } },
        valueFormatter: (value: unknown) => this.usdNumber(Number(value)),
      },
      legend: {
        top: 0,
        left: 0,
        itemWidth: 14,
        itemHeight: 2,
        itemGap: 16,
        textStyle: { color: t.textMuted, fontSize: 11, fontFamily: tok('--font-sans') },
      },
      series: [
        {
          name: 'Portfólio',
          type: 'line',
          showSymbol: false,
          lineStyle: { color: t.equity, width: 1.6 },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: t.equityFill },
                { offset: 1, color: 'rgba(0,0,0,0)' },
              ],
            },
          },
          data: h.points.map((p) => [p.date, p.portfolio_value_usd]),
        },
        {
          name: h.benchmark_ticker,
          type: 'line',
          showSymbol: false,
          lineStyle: { color: t.textMuted, width: 1, type: [4, 3] },
          data: h.points.map((p) => [p.date, p.benchmark_value_usd]),
        },
      ],
    };
  }

  usd(v: string | null): string {
    // Despite the name, formats in whatever currency the portfolio came back
    // in (USD by default, BRL when the user toggled the BRL view).
    if (v === null || v === undefined) return '—';
    const n = typeof v === 'string' ? parseFloat(v) : v;
    if (Number.isNaN(n)) return '—';
    const cur = this.portfolio()?.display_currency ?? 'USD';
    if (cur === 'BRL') {
      return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  usdNumber(v: number): string {
    if (!Number.isFinite(v)) return '—';
    return v.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
  }

  shares(v: string): string {
    const n = parseFloat(v);
    if (Number.isNaN(n)) return v;
    return n.toLocaleString('en-US', { maximumFractionDigits: 8 });
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

  formatFxRate(v: string): string {
    const n = parseFloat(v);
    if (Number.isNaN(n)) return v;
    return n.toFixed(2);
  }
}
