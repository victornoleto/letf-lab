import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { IndicatorType, IndicatorTypeInfo, ParamProperty } from '../../core/models';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-indicator-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <a routerLink="/indicators" class="breadcrumb">
        <span style="display: inline-flex; transform: rotate(180deg);">
          <svg width="12" height="12"><use href="#chevron-right"/></svg>
        </span>
        Indicadores
      </a>

      <h1 class="page-h1">{{ indicatorId() ? 'Editar' : 'Novo' }} indicador</h1>

      @if (loading()) {
        <div class="skeleton skeleton--card" style="height: 320px; max-width: 560px;"></div>
      } @else {
        <form class="form" (submit)="$event.preventDefault(); save()">

          <div class="field" [class.is-invalid]="touched().has('name') && !name()">
            <label class="label" for="iname">Nome</label>
            <input id="iname" class="input"
                   [ngModel]="name()" (ngModelChange)="name.set($event)" name="name"
                   (blur)="markTouched('name')" />
            @if (touched().has('name') && !name()) {
              <p class="error">Nome é obrigatório</p>
            }
          </div>

          <div class="field">
            <label class="label" for="itype">Tipo</label>
            <select id="itype" class="input"
                    [ngModel]="type()" (ngModelChange)="onTypeChange($event)" name="type"
                    [disabled]="!!indicatorId()">
              @for (t of types(); track t.type) {
                <option [value]="t.type">{{ t.label }}</option>
              }
            </select>
            @if (selectedType(); as st) {
              <p class="hint">{{ st.description }}</p>
            }
          </div>

          @if (selectedType() && paramKeys().length > 0) {
            <div class="row-2">
              @for (p of paramKeys(); track p) {
                <div class="field">
                  <label class="label">{{ paramLabel(p) }}</label>
                  <input class="input input--mono" type="number"
                         [ngModel]="paramValue(p)"
                         (ngModelChange)="setParam(p, $event)"
                         [name]="'p_' + p"
                         [step]="paramStep(p)" [min]="paramMin(p)" [max]="paramMax(p)" />
                  @if (paramDescription(p)) {
                    <p class="hint">{{ paramDescription(p) }}</p>
                  }
                </div>
              }
            </div>
          }

          <div class="field">
            <label class="label" for="idesc">Descrição</label>
            <textarea id="idesc" class="input" rows="3"
                      [ngModel]="description()" (ngModelChange)="description.set($event)"
                      name="description"
                      style="height: auto; padding: 8px 10px;"></textarea>
            <p class="hint">Opcional · explica o uso do indicador</p>
          </div>

          @if (error()) {
            <div class="banner banner--danger" style="margin-top: 16px;">
              <svg class="ico" width="14" height="14"><use href="#alert-circle"/></svg>
              <span>{{ error() }}</span>
            </div>
          }

          <div class="form-footer">
            <a routerLink="/indicators" class="btn">Cancelar</a>
            <button type="submit" class="btn btn--primary" [disabled]="!canSave() || saving()">
              @if (saving()) {
                <svg class="ico spin" width="11" height="11"><use href="#refresh"/></svg>
                Salvando…
              } @else {
                {{ indicatorId() ? 'Salvar' : 'Criar' }}
              }
            </button>
          </div>
        </form>
      }
    </div>
  `,
})
export class IndicatorFormComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  indicatorId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  types = signal<IndicatorTypeInfo[]>([]);

  // Reactive form state.
  name = signal('');
  type = signal<IndicatorType>('SMA_GATE');
  params = signal<Record<string, number>>({});
  description = signal<string>('');
  touched = signal<Set<string>>(new Set());

  selectedType = computed(() =>
    this.types().find((t) => t.type === this.type()) ?? null,
  );

  paramKeys = computed(() => {
    const t = this.selectedType();
    return t ? Object.keys(t.params_schema.properties ?? {}) : [];
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.api.listIndicatorTypes().subscribe({
      next: (types) => {
        this.types.set(types);
        const idParam = this.route.snapshot.paramMap.get('id');
        if (idParam) {
          this.indicatorId.set(+idParam);
          this.api.getIndicator(+idParam).subscribe({
            next: (ind) => {
              this.name.set(ind.name);
              this.type.set(ind.type);
              this.params.set({ ...ind.params });
              this.description.set(ind.description ?? '');
              this.loading.set(false);
            },
            error: () => { this.error.set('Indicador não encontrado'); this.loading.set(false); },
          });
        } else {
          this.applyDefaultsForType();
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  paramProperty(name: string): ParamProperty | null {
    return this.selectedType()?.params_schema.properties?.[name] ?? null;
  }

  paramLabel(name: string): string {
    return PARAM_LABELS[`${this.type()}.${name}`] ?? PARAM_LABELS[name] ?? name;
  }

  paramDescription(name: string): string | undefined {
    return this.paramProperty(name)?.description;
  }

  paramStep(name: string): string {
    const p = this.paramProperty(name);
    return p?.type === 'number' ? '0.01' : '1';
  }

  paramMin(name: string): number | null {
    return this.paramProperty(name)?.minimum ?? null;
  }

  paramMax(name: string): number | null {
    return this.paramProperty(name)?.maximum ?? null;
  }

  paramValue(name: string): number | undefined {
    return this.params()[name];
  }

  setParam(name: string, value: number): void {
    this.params.set({ ...this.params(), [name]: +value });
  }

  onTypeChange(next: IndicatorType): void {
    this.type.set(next);
    this.applyDefaultsForType();
  }

  private applyDefaultsForType(): void {
    const t = this.selectedType();
    if (t) this.params.set({ ...t.default_params });
  }

  markTouched(field: string): void {
    const next = new Set(this.touched());
    next.add(field);
    this.touched.set(next);
  }

  canSave(): boolean {
    return this.name().length > 0
      && this.paramKeys().every((k) => this.params()[k] !== undefined);
  }

  save(): void {
    this.markTouched('name');
    if (!this.canSave() || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    const id = this.indicatorId();
    const obs = id
      ? this.api.updateIndicator(id, {
          params: this.params(),
          name: this.name(),
          description: this.description(),
        })
      : this.api.createIndicator({
          name: this.name(),
          type: this.type(),
          params: this.params(),
          description: this.description() || null,
        } as any);
    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.push({ variant: 'success', message: 'Indicador salvo' });
        this.router.navigate(['/indicators']);
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
    if (Array.isArray(detail)) return detail.map((d) => d.msg ?? JSON.stringify(d)).join('; ');
    return err?.message ?? 'Erro ao salvar';
  }
}

/**
 * Friendly labels per indicator type. Falls back to the param name itself
 * when no override is registered. Keep in sync with backend catalog.
 */
const PARAM_LABELS: Record<string, string> = {
  'SMA_GATE.period': 'Período (dias)',
  'SMA_GATE.threshold': 'Banda (% acima/abaixo da SMA)',
  'EMA_GATE.period': 'Span (dias)',
  'EMA_GATE.threshold': 'Banda (% acima/abaixo da EMA)',
  'VOL_GATE.window': 'Janela (dias)',
  'VOL_GATE.threshold': 'Vol máx anualizada',
  'AR1_GATE.window': 'Janela (dias)',
  'AR1_GATE.threshold': 'Coef. mínimo AR(1)',
  period: 'Período',
  window: 'Janela',
  threshold: 'Threshold',
};
