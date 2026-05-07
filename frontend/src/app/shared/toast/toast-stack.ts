import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-stack',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-stack">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [ngClass]="'toast--' + t.variant">
          <svg class="ico toast__icon" width="14" height="14">
            <use [attr.href]="t.variant === 'success' ? '#circle-check' : t.variant === 'danger' ? '#alert-circle' : '#info-circle'"/>
          </svg>
          <span>{{ t.message }}</span>
          <button class="icon-btn toast__close" (click)="toast.dismiss(t.id)" aria-label="Fechar">
            <svg width="12" height="12"><use href="#x"/></svg>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastStackComponent {
  protected toast = inject(ToastService);
}
