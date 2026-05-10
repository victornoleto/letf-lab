import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmService } from './confirm.service';
import { ModalComponent } from '../modal/modal';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [open]="cs.config() !== null"
               [title]="cs.config()?.title ?? ''"
               (close)="cs.resolve(false)">
      <p style="margin: 0; color: var(--text-secondary); line-height: 1.6;">
        {{ cs.config()?.message }}
      </p>
      <div modal-footer style="display:flex; gap:8px; justify-content:flex-end; padding: 14px 20px; border-top: 1px solid var(--border-subtle); background: var(--bg);">
        <button class="btn" (click)="cs.resolve(false)">{{ cs.config()?.cancelLabel ?? 'Cancel' }}</button>
        <button class="btn"
                [class.btn--danger]="cs.config()?.variant === 'danger'"
                [class.btn--primary]="cs.config()?.variant !== 'danger'"
                (click)="cs.resolve(true)">
          {{ cs.config()?.confirmLabel ?? 'Confirm' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class ConfirmDialogComponent {
  protected cs = inject(ConfirmService);
}
