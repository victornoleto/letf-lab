import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  variant: 'success' | 'danger' | 'info';
  message: string;
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);

  push(t: Omit<Toast, 'id'>) {
    const id = (crypto as any).randomUUID?.() ?? Math.random().toString(36).slice(2);
    const full: Toast = { ...t, id };
    this.toasts.update(arr => [...arr, full].slice(-3));
    if (t.duration !== 0) {
      setTimeout(() => this.dismiss(id), t.duration ?? 4000);
    }
  }

  dismiss(id: string) {
    this.toasts.update(arr => arr.filter(x => x.id !== id));
  }
}
