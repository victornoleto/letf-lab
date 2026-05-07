# Theme toggle — AI-Swing (Linear DNA)

> Implementação canônica light/dark. Default = light. Persistência localStorage.
> Trocar tema = trocar `data-theme` no `<html>`. Tokens fazem o resto.

---

## 1 · Princípio

Toda variável de tema vive em `01-tokens.scss`. O toggle não toca cor; só seta o atributo:

```ts
document.documentElement.setAttribute('data-theme', 'dark' | 'light');
```

Isso re-resolve `--bg`, `--text-primary`, etc. Componentes consomem via `var(--bg)` e atualizam automaticamente.

**3 estados:** `light` · `dark` · `system` (segue prefer-color-scheme).

---

## 2 · Service (Angular standalone)

```ts
// theme.service.ts
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
    // Aplicar no documento sempre que mudar
    effect(() => {
      const r = this.resolved();
      document.documentElement.setAttribute('data-theme', r);
      // Permite charts re-lerem tokens
      document.dispatchEvent(new Event('themechange'));
    });

    // Reagir a mudanças do OS quando mode === 'system'
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', () => {
        if (this.mode() === 'system') this.mode.set('system'); // força recompute
      });
    }
  }

  set(mode: ThemeMode) {
    this.mode.set(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }

  toggle() {
    // Light → Dark → Light (ignora system no toggle binário)
    this.set(this.resolved() === 'dark' ? 'light' : 'dark');
  }

  private readStored(): ThemeMode {
    const v = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    return v ?? 'light';   // default explícito (não 'system')
  }
  private systemPrefersDark(): boolean {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }
}
```

**Default = `'light'`**, não `'system'`. Linear default é light; usuário escolhe dark conscientemente.

---

## 3 · Anti-FOUC (no `index.html`)

Setar `data-theme` ANTES do Angular bootstrap evita flash de cor errada:

```html
<!-- index.html, primeiro <script> dentro do <head> -->
<script>
  (function () {
    try {
      var v = localStorage.getItem('ai-swing.theme');
      var resolved =
        v === 'dark' ? 'dark' :
        v === 'light' ? 'light' :
        v === 'system' && window.matchMedia &&
          window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', resolved);
    } catch (e) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  })();
</script>
```

E no body, definir `background` e `color` antecipadamente pra que mesmo o blank-screen pré-bootstrap seja na cor correta:

```html
<style>
  html { background: var(--bg); color: var(--text-primary); }
</style>
```

---

## 4 · Toggle UI

Compact 3-segment switch na sidebar (light/system/dark) com ícones outline:

```html
<div class="theme-row" role="radiogroup" aria-label="Tema">
  <button class="theme-btn" [class.theme-btn--active]="theme.mode() === 'light'"
          (click)="theme.set('light')" aria-label="Tema claro">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
    </svg>
  </button>
  <button class="theme-btn" [class.theme-btn--active]="theme.mode() === 'system'"
          (click)="theme.set('system')" aria-label="Tema do sistema">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>
    </svg>
  </button>
  <button class="theme-btn" [class.theme-btn--active]="theme.mode() === 'dark'"
          (click)="theme.set('dark')" aria-label="Tema escuro">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  </button>
</div>
```

```scss
.theme-row {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  padding: 2px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
.theme-btn {
  flex: 1;
  display: grid;
  place-items: center;
  padding: 4px;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: var(--text-muted);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out);

  &:hover { color: var(--text-primary); }
  &--active {
    background: var(--surface-muted);
    color: var(--text-primary);
  }
}
```

**Coloque na footer da sidebar**, abaixo do `Atualizado 14:32 ET` + Refresh button.

---

## 5 · Charts re-render no theme change

ECharts não re-resolve `var(--*)` automaticamente. Componente que hospeda chart precisa reagir:

```ts
@Component({ /* ... */ })
export class EquityChartComponent implements OnInit, OnDestroy {
  options!: EChartsOption;
  private listener = () => this.rebuild();

  @Input() series!: EquityPoint[];

  ngOnInit() {
    this.rebuild();
    document.addEventListener('themechange', this.listener);
  }
  ngOnDestroy() {
    document.removeEventListener('themechange', this.listener);
  }

  private rebuild() {
    this.options = equityOptions(this.series, readChartTokens());
  }
}
```

Sparklines SVG usam `currentColor` ou `var(--success)` direto — não precisam re-render manual.

---

## 6 · Acessibilidade

- O `theme-row` é `role="radiogroup"`. Cada botão tem `aria-label` claro.
- Keyboard: Tab navega; Space/Enter ativa.
- `prefers-reduced-motion`: respeitar — o toggle já é instantâneo (sem animação além da transition de `background-color` que é quase imperceptível). Se adicionar transition no `*`, envolver em media query:

```scss
@media (prefers-reduced-motion: no-preference) {
  // transitions opcionais aqui
}
```

---

## 7 · NÃO fazer

- ❌ `transition: all 300ms` no `body` ou `*` — gera flash desagradável no toggle.
- ❌ Salvar tema em cookie. localStorage basta (não precisa SSR sync).
- ❌ Default `system`. Default explícito = `light`.
- ❌ Esconder o toggle em mobile. Mobile precisa também.
- ❌ Toggle binário sem opção `system`. Sempre 3 estados.
