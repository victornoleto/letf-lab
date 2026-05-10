import {
  Component,
  ElementRef,
  effect,
  HostListener,
  input,
  output,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Reusable HTML5 <dialog>-based modal.
 * Usage:
 *   <app-modal [open]="isOpen()" [size]="'wide'" [title]="'New strategy'" (close)="onClose()">
 *     <!-- body content -->
 *     <div modal-footer class="modal__foot">
 *       <button class="btn btn--ghost btn--md">Cancel</button>
 *       <button class="btn btn--primary btn--md">Save</button>
 *     </div>
 *   </app-modal>
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <dialog #dialog class="modal" [class.modal--wide]="size() === 'wide'"
            (close)="onDialogClose()" (click)="onBackdropClick($event)">
      @if (open()) {
        <div class="dialog-inner" (click)="$event.stopPropagation()">
          @if (title() || subtitle()) {
            <header class="modal__head">
              <div class="titles">
                @if (title()) { <h2 class="modal__title">{{ title() }}</h2> }
                @if (subtitle()) { <p class="modal__subtitle">{{ subtitle() }}</p> }
              </div>
              <button type="button" class="btn btn--ghost btn--icon btn--sm" (click)="close.emit()" aria-label="Fechar">
                <svg class="ico" width="14" height="14"><use href="#x"/></svg>
              </button>
            </header>
          }
          <div class="modal__body">
            <ng-content></ng-content>
          </div>
          <ng-content select="[modal-footer]"></ng-content>
        </div>
      }
    </dialog>
  `,
  styles: [`
    :host { display: contents; }
    .dialog-inner { display: flex; flex-direction: column; }
    .titles { flex: 1; min-width: 0; }
    .modal__subtitle {
      margin: 4px 0 0;
      font: var(--text-xs);
      color: var(--text-muted);
    }
  `],
})
export class ModalComponent {
  open = input<boolean>(false);
  title = input<string | null>(null);
  subtitle = input<string | null>(null);
  size = input<'default' | 'wide'>('default');
  closeOnBackdrop = input<boolean>(true);
  closeOnEsc = input<boolean>(true);

  close = output<void>();

  private dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const isOpen = this.open();
      const el = this.dialog()?.nativeElement;
      if (!el) return;
      if (isOpen && !el.open) {
        el.showModal();
      } else if (!isOpen && el.open) {
        el.close();
      }
    });
  }

  onDialogClose(): void {
    if (this.open()) {
      this.close.emit();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (!this.closeOnBackdrop()) return;
    const dialogEl = this.dialog()?.nativeElement;
    if (event.target === dialogEl) {
      this.close.emit();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEsc(event: Event): void {
    if (this.open() && this.closeOnEsc()) {
      event.preventDefault();
      this.close.emit();
    }
  }
}
