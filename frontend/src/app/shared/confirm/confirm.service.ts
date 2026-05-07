import { Injectable, signal } from '@angular/core';

export interface ConfirmConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  config = signal<ConfirmConfig | null>(null);
  private resolver: ((v: boolean) => void) | null = null;

  ask(cfg: ConfirmConfig): Promise<boolean> {
    return new Promise(resolve => {
      this.resolver = resolve;
      this.config.set(cfg);
    });
  }

  resolve(v: boolean) {
    this.resolver?.(v);
    this.resolver = null;
    this.config.set(null);
  }
}
