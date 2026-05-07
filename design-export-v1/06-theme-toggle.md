# 06 — Theme toggle (light / dark / system)

> Persiste em `localStorage` como `aiswing.theme` ∈ `"light" | "dark" | "system"`. Sem entrada = `"system"`.
> Aplica `data-theme="light|dark"` em `<html>`. Tokens em `01-tokens.scss` reagem ao atributo.

## ThemeService

`src/app/core/theme.service.ts`:

```ts
import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'aiswing.theme';
  readonly mode = signal<ThemeMode>(this.read());
  private mql = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    this.apply(this.mode());
    effect(() => this.apply(this.mode()));

    // React to system preference changes only when in 'system' mode
    this.mql.addEventListener('change', () => {
      if (this.mode() === 'system') this.apply('system');
    });
  }

  set(mode: ThemeMode) {
    this.mode.set(mode);
    localStorage.setItem(this.STORAGE_KEY, mode);
  }

  /** Resolves 'system' to actual 'light' | 'dark' for UI hints. */
  effective(): 'light' | 'dark' {
    const m = this.mode();
    if (m === 'system') return this.mql.matches ? 'dark' : 'light';
    return m;
  }

  private read(): ThemeMode {
    const v = localStorage.getItem(this.STORAGE_KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
  }

  private apply(mode: ThemeMode) {
    const resolved = mode === 'system' ? (this.mql.matches ? 'dark' : 'light') : mode;
    document.documentElement.setAttribute('data-theme', resolved);
  }
}
```

## FOUC prevention (no flash on reload)

Inline this **before** Angular bootstraps, in `index.html`:

```html
<script>
  (function () {
    try {
      var t = localStorage.getItem('aiswing.theme') || 'system';
      var dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    } catch (e) {}
  })();
</script>
```

## Segmented control component

`theme-switch.component.html`:

```html
<div class="theme-switch" role="radiogroup" aria-label="Color theme">
  <button
    *ngFor="let opt of options"
    type="button"
    role="radio"
    [attr.aria-checked]="theme.mode() === opt.value"
    [class.is-active]="theme.mode() === opt.value"
    (click)="theme.set(opt.value)"
  >
    <svg class="ico" width="14" height="14" aria-hidden="true">
      <use [attr.href]="'/assets/icons/sprite.svg#' + opt.icon"></use>
    </svg>
    <span>{{ opt.label }}</span>
  </button>
</div>
```

```ts
options = [
  { value: 'light' as const, label: 'Light',  icon: 'sun' },
  { value: 'dark'  as const, label: 'Dark',   icon: 'moon' },
  { value: 'system' as const, label: 'System', icon: 'monitor' },
];
constructor(public theme: ThemeService) {}
```

```scss
.theme-switch {
  display: inline-flex;
  padding: 2px;
  background: var(--surface-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  gap: 2px;

  button {
    appearance: none;
    background: transparent;
    border: 0;
    border-radius: calc(var(--radius-md) - 2px);
    padding: 4px 10px;
    font: var(--text-xs);
    font-weight: 500;
    color: var(--text-muted);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: var(--transition-fast);

    &:hover { color: var(--text-primary); }
    &.is-active {
      background: var(--surface);
      color: var(--text-primary);
      box-shadow: var(--shadow-xs);
    }
    &:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: 2px;
    }
  }
}
```

Posiciona no rodapé da sidebar, full-width quando expandida; quando collapsed, esconda labels e mostre só ícones empilhados ou um único toggle ícone.

## Detalhes que importam

- **Não use `prefers-color-scheme` em SCSS** para tema do app — só para o fallback inicial (já está em `01-tokens.scss`). O atributo `data-theme` é a fonte de verdade depois do bootstrap.
- **Persistência cross-tab.** Adicione listener de `storage` no service se quiser que outra aba reflita mudança imediata; opcional.
- **Charts** precisam re-aplicar tokens ao trocar tema (ECharts não reage a CSS vars). Ouça mudanças de `mode` e chame `chart.setOption(buildOption(getChartTokens()))`. Ver `05-charts-echarts.md`.
