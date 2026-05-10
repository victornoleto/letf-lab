import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Indicator, Strategy } from '../../core/models';
import { ToastService } from '../../shared/toast/toast.service';

type Touched = { name: boolean; benchmark: boolean; riskOn: boolean; riskOff: boolean };

@Component({
  selector: 'app-strategy-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <a routerLink="/strategies" class="breadcrumb">
        <span style="display: inline-flex; transform: rotate(180deg);">
          <svg width="12" height="12"><use href="#chevron-right"/></svg>
        </span>
        Strategies
      </a>

      <h1 class="page-h1">{{ strategyId() ? 'Edit' : 'New' }} strategy</h1>

      @if (loading()) {
        <div class="skeleton skeleton--card" style="height: 360px; max-width: 560px;"></div>
      } @else {
        <form class="form" (submit)="$event.preventDefault(); save()">

          <div class="field" [class.is-invalid]="touched.name && !validName()">
            <label class="label" for="name">Name</label>
            <input id="name" class="input" [class.input--error]="touched.name && !validName()"
                   [(ngModel)]="model.name" name="name" maxlength="64"
                   (blur)="touched.name = true" />
            <p class="hint">{{ model.name.length }}/64 characters</p>
            @if (touched.name && !validName()) {
              <p class="error">Name is required</p>
            }
          </div>

          <div class="field">
            <label class="label" for="bench">Benchmark ticker</label>
            <input id="bench" class="input input--mono" [(ngModel)]="model.benchmark_ticker"
                   name="benchmark" maxlength="6" (blur)="touched.benchmark = true"
                   (input)="model.benchmark_ticker = $any($event.target).value.toUpperCase()" />
            <p class="hint">Reference index/ETF (for example: QQQ, SPY, IWM)</p>
          </div>

          <div class="row-2">
            <div class="field">
              <label class="label" for="riskOn">Risk-on ticker</label>
              <input id="riskOn" class="input input--mono" [(ngModel)]="model.risk_on_ticker"
                     name="risk_on" maxlength="6"
                     (input)="model.risk_on_ticker = $any($event.target).value.toUpperCase()" />
              <p class="hint">When indicators are active</p>
            </div>
            <div class="field">
              <label class="label" for="riskOff">Risk-off ticker</label>
              <input id="riskOff" class="input input--mono" [(ngModel)]="model.risk_off_ticker"
                     name="risk_off" maxlength="6"
                     (input)="model.risk_off_ticker = $any($event.target).value.toUpperCase()" />
              <p class="hint">When indicators deactivate</p>
            </div>
          </div>

          <div class="field">
            <label class="label">
              Indicators (k of N)
              <span class="kmin">
                min k:
                <select [ngModel]="kThreshold()" (ngModelChange)="kThreshold.set(+$event)" name="k">
                  @for (i of kOptions(); track i) { <option [value]="i">{{ i }}</option> }
                </select>
              </span>
            </label>
            <div class="chips-field">
              @for (ind of allIndicators(); track ind.id) {
                <button type="button"
                        class="chip"
                        [class.chip--selected]="isSelected(ind.id)"
                        (click)="toggleIndicator(ind.id)">
                  {{ ind.name }}
                </button>
              }
            </div>
            <p class="hint">{{ indicatorIds().length }} selected · {{ kThreshold() }} minimum for risk-on</p>
          </div>

          @if (error()) {
            <div class="banner banner--danger" style="margin-top: 16px;">
              <svg class="ico" width="14" height="14"><use href="#alert-circle"/></svg>
              <span>{{ error() }}</span>
            </div>
          }

          <div class="form-footer">
            <a routerLink="/strategies" class="btn">Cancel</a>
            <button type="submit" class="btn btn--primary" [disabled]="!canSave() || saving()">
              @if (saving()) {
                <svg class="ico spin" width="11" height="11"><use href="#refresh"/></svg>
                Saving...
              } @else {
                {{ strategyId() ? 'Save' : 'Create and run' }}
              }
            </button>
          </div>
        </form>
      }
    </div>
  `,
})
export class StrategyFormComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  strategyId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  allIndicators = signal<Indicator[]>([]);

  touched: Touched = { name: false, benchmark: false, riskOn: false, riskOff: false };

  // Reactive bits — drive the k-of-N dropdown and the chips selection.
  indicatorIds = signal<number[]>([]);
  kThreshold = signal<number>(2);

  // Plain fields kept on a model object (ngModel handles their CD on input).
  model = {
    name: '',
    benchmark_ticker: '',
    risk_on_ticker: '',
    risk_off_ticker: 'ZROZ',
    enabled: true,
  };

  kOptions = computed(() => {
    const n = Math.max(this.indicatorIds().length, 1);
    return Array.from({ length: n }, (_, i) => i + 1);
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.api.listIndicators().subscribe({
      next: (inds) => {
        this.allIndicators.set(inds);
        const idParam = this.route.snapshot.paramMap.get('id');
        if (idParam) {
          this.strategyId.set(+idParam);
          this.api.getStrategy(+idParam).subscribe({
            next: (s) => { this.populate(s); this.loading.set(false); },
            error: () => { this.error.set('Strategy not found'); this.loading.set(false); },
          });
        } else {
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  private populate(s: Strategy): void {
    this.model = {
      name: s.name,
      benchmark_ticker: s.benchmark_ticker,
      risk_on_ticker: s.risk_on_ticker,
      risk_off_ticker: s.risk_off_ticker,
      enabled: s.enabled,
    };
    this.indicatorIds.set(s.indicators.map((i) => i.id));
    this.kThreshold.set(s.k_threshold);
  }

  validName() { return this.model.name.trim().length > 0; }

  isSelected(id: number) { return this.indicatorIds().includes(id); }

  toggleIndicator(id: number) {
    const ids = this.indicatorIds();
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    this.indicatorIds.set(next);
    if (this.kThreshold() > next.length) {
      this.kThreshold.set(Math.max(1, next.length));
    }
  }

  canSave(): boolean {
    return this.validName()
      && this.model.benchmark_ticker.length > 0
      && this.model.risk_on_ticker.length > 0
      && this.model.risk_off_ticker.length > 0
      && this.indicatorIds().length > 0
      && this.kThreshold() >= 1
      && this.kThreshold() <= this.indicatorIds().length;
  }

  save(): void {
    if (!this.canSave() || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    const id = this.strategyId();
    const body = {
      ...this.model,
      k_threshold: this.kThreshold(),
      indicator_ids: this.indicatorIds(),
    };
    const obs = id ? this.api.updateStrategy(id, body) : this.api.createStrategy(body);
    obs.subscribe({
      next: (s) => {
        this.saving.set(false);
        this.toast.push({ variant: 'success', message: 'Strategy saved' });
        this.router.navigate(['/strategies', s.id]);
      },
      error: (err) => {
        this.saving.set(false);
        const msg = this.formatError(err);
        this.error.set(msg);
        this.toast.push({ variant: 'danger', message: msg, duration: 8000 });
      },
    });
  }

  private formatError(err: any): string {
    const detail = err?.error?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map(d => d.msg ?? JSON.stringify(d)).join('; ');
    return err?.message ?? 'Failed to save';
  }
}
