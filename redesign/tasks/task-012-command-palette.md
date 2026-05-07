# Task 012 (v2) — Command palette (`⌘K`) overlay

**Goal:** Add a command palette overlay opened with `⌘K` (or `Ctrl+K`) and closed with `Esc`. Lists search results across Estratégias / Indicadores / Ações / Navegação. Each item has icon + label + optional kbd hint. Keyboard navigation with `↑↓` and `Enter`.

## Pre-conditions

- Tasks 001-011 done.
- `_palette.scss` partial exists (from task 002): `.palette-overlay`, `.palette`, `.palette__input`, `.palette__list`, `.palette__section`, `.palette__item`, `.palette__foot`.
- `_kbd.scss` provides `.kbd`.
- API service exposes `listStrategies()` and `listIndicators()`.

## Sources

1. `design-export/linear-extras.jsx` — `CommandPaletteOverlay` component (line 234+)

## Files to create

| File | Purpose |
|---|---|
| `frontend/src/app/shared/palette/palette.service.ts` | Open/close state singleton |
| `frontend/src/app/shared/palette/command-palette.ts` | Overlay component |

## Files to modify

| File | Change |
|---|---|
| `frontend/src/app/app.html` | Mount `<app-command-palette/>` once at the bottom of `.shell` (or right before `</body>` equivalent) |
| `frontend/src/app/app.ts` | Add global `keydown` for `⌘K` / `Ctrl+K` that toggles `palette.open()` |

The palette service is a tiny singleton:

```ts
// palette.service.ts
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PaletteService {
  isOpen = signal(false);
  open()  { this.isOpen.set(true); }
  close() { this.isOpen.set(false); }
  toggle(){ this.isOpen.update(v => !v); }
}
```

## Component layout

```ts
import {
  ChangeDetectionStrategy, Component, ElementRef, computed, effect,
  inject, signal, viewChild, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PaletteService } from './palette.service';
import { ApiService } from '../../core/api.service';
import { Indicator, Strategy } from '../../core/models';

interface Item {
  type: 'strategy' | 'indicator' | 'action' | 'nav';
  label: string;
  ctx?: string;       // right-side hint (e.g. "Risk on · 4/4" or "G 1")
  icon: string;       // sprite id
  run: () => void;
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (palette.isOpen()) {
      <div class="palette-overlay" (click)="onBackdropClick($event)">
        <div class="palette" (click)="$event.stopPropagation()">
          <div class="palette__input">
            <svg class="ico" width="14" height="14" style="color: var(--text-muted);"><use href="#search"/></svg>
            <input #q [(ngModel)]="query" placeholder="Buscar estratégias, indicadores, comandos…"
                   (keydown.arrowdown)="moveSelection(1); $event.preventDefault()"
                   (keydown.arrowup)="moveSelection(-1); $event.preventDefault()"
                   (keydown.enter)="runActive(); $event.preventDefault()"
                   (keydown.escape)="palette.close(); $event.preventDefault()" />
            <span class="kbd">esc</span>
          </div>

          <div class="palette__list">
            @for (group of grouped(); track group.label) {
              <div class="palette__section">{{ group.label }}</div>
              @for (item of group.items; track item.label; let idx = $index) {
                <div class="palette__item"
                     [class.is-active]="absoluteIndex(group, idx) === activeIdx()"
                     (mouseenter)="activeIdx.set(absoluteIndex(group, idx))"
                     (click)="run(item)">
                  <svg class="ico" width="14" height="14"><use [attr.href]="'#' + item.icon"/></svg>
                  <span class="label">{{ item.label }}</span>
                  @if (item.ctx) { <span class="ctx">{{ item.ctx }}</span> }
                </div>
              }
            }
          </div>

          <div class="palette__foot">
            <span><span class="kbd">↑↓</span> navegar</span>
            <span><span class="kbd">↵</span> selecionar</span>
            <span><span class="kbd">esc</span> fechar</span>
            <span style="margin-left: auto;">{{ filtered().length }} resultados</span>
          </div>
        </div>
      </div>
    }
  `,
})
export class CommandPaletteComponent implements AfterViewInit {
  protected palette = inject(PaletteService);
  private api = inject(ApiService);
  private router = inject(Router);
  private input = viewChild<ElementRef<HTMLInputElement>>('q');

  query = '';
  activeIdx = signal(0);
  strategies = signal<Strategy[]>([]);
  indicators = signal<Indicator[]>([]);

  constructor() {
    // Load data when palette opens
    effect(() => {
      if (this.palette.isOpen()) {
        this.api.listStrategies().subscribe(s => this.strategies.set(s));
        this.api.listIndicators().subscribe(i => this.indicators.set(i));
        this.activeIdx.set(0);
        // Focus input after open
        setTimeout(() => this.input()?.nativeElement.focus(), 50);
      } else {
        this.query = '';
      }
    });
  }

  ngAfterViewInit(): void {}

  private actions: Item[] = [
    { type: 'action', label: 'Nova estratégia',     ctx: '⌘N', icon: 'plus',    run: () => this.router.navigate(['/strategies/new']) },
    { type: 'action', label: 'Refresh sinais agora', ctx: '⌘R', icon: 'refresh', run: () => this.refresh() },
  ];
  private navItems: Item[] = [
    { type: 'nav', label: 'Ir para Dashboard',    ctx: 'G 1', icon: 'dashboard',  run: () => this.router.navigate(['/dashboard']) },
    { type: 'nav', label: 'Ir para Estratégias',  ctx: 'G 2', icon: 'strategies', run: () => this.router.navigate(['/strategies']) },
    { type: 'nav', label: 'Ir para Indicadores',  ctx: 'G 3', icon: 'indicators', run: () => this.router.navigate(['/indicators']) },
    { type: 'nav', label: 'Configurações',        icon: 'settings', run: () => this.router.navigate(['/settings']) },
  ];

  private matches(s: string): boolean {
    const q = this.query.toLowerCase().trim();
    return !q || s.toLowerCase().includes(q);
  }

  filtered = computed<Item[]>(() => {
    const q = this.query;
    const stratItems: Item[] = this.strategies().filter(s => this.matches(s.name) || this.matches(s.benchmark_ticker)).map(s => ({
      type: 'strategy', label: s.name, ctx: s.current_signal?.risk_on ? `Risk on · ${s.current_signal.score}/${s.current_signal.total}` : 'Risk off',
      icon: 'strategies', run: () => this.router.navigate(['/strategies', s.id]),
    }));
    const indItems: Item[] = this.indicators().filter(i => this.matches(i.name)).map(i => ({
      type: 'indicator', label: i.name, ctx: i.type, icon: 'indicators',
      run: () => this.router.navigate(['/indicators', i.id, 'edit']),
    }));
    const acts = this.actions.filter(a => this.matches(a.label));
    const navs = this.navItems.filter(n => this.matches(n.label));
    return [...stratItems, ...indItems, ...acts, ...navs];
  });

  grouped = computed(() => {
    const f = this.filtered();
    const groups: { label: string; items: Item[] }[] = [];
    const strats = f.filter(i => i.type === 'strategy');
    const inds   = f.filter(i => i.type === 'indicator');
    const acts   = f.filter(i => i.type === 'action');
    const navs   = f.filter(i => i.type === 'nav');
    if (strats.length) groups.push({ label: 'Estratégias', items: strats });
    if (inds.length)   groups.push({ label: 'Indicadores', items: inds });
    if (acts.length)   groups.push({ label: 'Ações',       items: acts });
    if (navs.length)   groups.push({ label: 'Navegação',   items: navs });
    return groups;
  });

  absoluteIndex(group: { label: string; items: Item[] }, idx: number): number {
    let acc = 0;
    for (const g of this.grouped()) {
      if (g.label === group.label) return acc + idx;
      acc += g.items.length;
    }
    return idx;
  }

  moveSelection(delta: 1 | -1) {
    const total = this.filtered().length;
    if (!total) return;
    this.activeIdx.update(v => (v + delta + total) % total);
  }

  runActive(): void {
    const item = this.filtered()[this.activeIdx()];
    if (item) this.run(item);
  }

  run(item: Item): void {
    item.run();
    this.palette.close();
  }

  onBackdropClick(_e: MouseEvent): void {
    this.palette.close();
  }

  private refresh(): void {
    // Wire to existing refresh endpoint if convenient. For now, navigate to dashboard.
    this.router.navigate(['/dashboard']);
  }
}
```

## Wire ⌘K in `app.ts`

Add a global keydown listener:

```ts
import { PaletteService } from './shared/palette/palette.service';
import { HostListener } from '@angular/core';

private palette = inject(PaletteService);

@HostListener('document:keydown', ['$event'])
onKeydown(ev: KeyboardEvent) {
  if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') {
    ev.preventDefault();
    this.palette.toggle();
  }
}
```

(Or move this into a `KeyboardService` — but keeping it inline in `app.ts` is fine for now. The G 1/2/3 navigation handler from task 013 can live in the same listener.)

In `app.html`, mount the overlay at the end of the shell (so it's always available):

```html
<app-command-palette />
```

Add `CommandPaletteComponent` to `app.ts` imports.

## What NOT to do

- Don't implement fuzzy matching beyond simple substring — keep search trivially correct.
- Don't add command history / recents — out of scope.
- Don't make actions configurable from outside — hard-coded list is fine.

## Verification

```bash
cd /var/www/pessoal/ai-swing/frontend
npx ng build --configuration=development
```

Manual smoke:
- Press `⌘K` (or `Ctrl+K` on Linux/Windows) anywhere in the app → palette opens with focus on input.
- Type "qqq" → strategies filter to QQQ-related ones.
- Press `↓` → highlight moves to next item.
- Press `Enter` → navigates and closes palette.
- Press `Esc` → closes palette.
- Click outside palette → closes.

## Definition of done

1. `palette.service.ts` and `command-palette.ts` exist.
2. `<app-command-palette />` mounted once in `app.html`.
3. `⌘K` / `Ctrl+K` opens it; `Esc` closes.
4. Search filters results across 4 sections.
5. Build passes.
6. Print `TASK DONE: task-012-command-palette.md` at end.
