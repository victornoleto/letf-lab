import { Injectable, signal, effect, computed } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'ai-swing.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.readStored());
  readonly resolved = computed<'light' | 'dark'>(() => {
    const m = this.mode();
    if (m !== 'system') return m;
    return this.systemPrefersDark() ? 'dark' : 'light';
  });

  constructor() {
    effect(() => {
      const r = this.resolved();
      document.documentElement.setAttribute('data-theme', r);
      document.dispatchEvent(new Event('themechange'));
    });

    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', () => {
        if (this.mode() === 'system') this.mode.set('system');
      });
    }
  }

  set(mode: ThemeMode) {
    this.mode.set(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }

  toggle() {
    this.set(this.resolved() === 'dark' ? 'light' : 'dark');
  }

  private readStored(): ThemeMode {
    const v = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    return v ?? 'light';
  }
  private systemPrefersDark(): boolean {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }
}
