import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Indicator } from '../../core/models';
import { ConfirmService } from '../../shared/confirm/confirm.service';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-indicators-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1 class="page-head__h1">Indicators</h1>
          <p class="page-head__sub">{{ indicators().length }} registered</p>
        </div>
        <div class="page-head__actions">
          <div class="search">
            <svg class="ico" width="13" height="13"><use href="#search"/></svg>
            <input [(ngModel)]="searchTerm" placeholder="Search name or type..." />
          </div>
          <a routerLink="/indicators/new" class="btn btn--primary">
            <svg class="ico" width="12" height="12"><use href="#plus"/></svg>
            New indicator
          </a>
        </div>
      </header>

      @if (loading()) {
        <div class="skeleton skeleton--card" style="height: 240px;"></div>
      } @else if (indicators().length === 0) {
        <div class="empty">
          <svg class="empty__icon" width="24" height="24"><use href="#indicators"/></svg>
          <div class="empty__title">No indicators yet</div>
          <div class="empty__copy">Add indicators to use in strategies.</div>
          <a routerLink="/indicators/new" class="btn btn--primary">
            <svg class="ico" width="12" height="12"><use href="#plus"/></svg>
            New indicator
          </a>
        </div>
      } @else {
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Name</th><th>Type</th><th>Parameters</th>
                <th>Description</th><th></th>
              </tr>
            </thead>
            <tbody>
              @for (ind of filteredIndicators(); track ind.id) {
                <tr (click)="edit(ind.id)">
                  <td><span class="mono" style="font-weight: 500;">{{ ind.name }}</span></td>
                  <td><span class="badge badge--neutral">{{ ind.type }}</span></td>
                  <td class="mono">{{ paramsString(ind) }}</td>
                  <td style="color: var(--text-muted);">{{ ind.description ?? '—' }}</td>
                  <td>
                    <div class="table__actions">
                      <a class="icon-btn" (click)="$event.stopPropagation()"
                         [routerLink]="['/indicators', ind.id, 'edit']" aria-label="Edit">
                        <svg width="13" height="13"><use href="#pencil"/></svg>
                      </a>
                      <button class="icon-btn" (click)="$event.stopPropagation(); remove(ind)" aria-label="Remove">
                        <svg width="13" height="13"><use href="#trash"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`.table tr { cursor: pointer; }`],
})
export class IndicatorsListComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  indicators = signal<Indicator[]>([]);
  loading = signal(true);
  searchTerm = '';

  filteredIndicators = computed(() => {
    const all = this.indicators();
    const q = this.searchTerm.toLowerCase().trim();
    if (!q) return all;
    return all.filter(ind =>
      ind.name.toLowerCase().includes(q) ||
      ind.type.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.listIndicators().subscribe({
      next: (data) => { this.indicators.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  paramsString(ind: Indicator): string {
    return Object.entries(ind.params).map(([k, v]) => `${k}=${v}`).join(', ');
  }

  edit(id: number): void {
    this.router.navigate(['/indicators', id, 'edit']);
  }

  async remove(ind: Indicator): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Remove indicator',
      message: `${ind.name} will be permanently removed. This action cannot be undone.`,
      confirmLabel: 'Remove',
      variant: 'danger',
    });
    if (!ok) return;
    this.api.deleteIndicator(ind.id).subscribe({
      next: () => {
        this.toast.push({ variant: 'success', message: 'Indicator removed' });
        this.load();
      },
      error: (err) =>
        this.toast.push({
          variant: 'danger',
          message: err?.error?.detail ?? 'Failed to remove',
          duration: 8000,
        }),
    });
  }
}
