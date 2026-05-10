import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
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
  ctx?: string;
  icon: string;
  run: () => void;
}

interface Group {
  label: string;
  items: Item[];
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
            <input #q [ngModel]="query()" (ngModelChange)="query.set($event)"
                   placeholder="Search strategies, indicators, commands..."
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
            <span><span class="kbd">↑↓</span> navigate</span>
            <span><span class="kbd">↵</span> select</span>
            <span><span class="kbd">esc</span> close</span>
            <span style="margin-left: auto;">{{ filtered().length }} results</span>
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

  query = signal('');
  activeIdx = signal(0);
  strategies = signal<Strategy[]>([]);
  indicators = signal<Indicator[]>([]);

  constructor() {
    effect(() => {
      if (this.palette.isOpen()) {
        this.api.listStrategies().subscribe({
          next: (s) => this.strategies.set(s),
          error: () => this.strategies.set([]),
        });
        this.api.listIndicators().subscribe({
          next: (i) => this.indicators.set(i),
          error: () => this.indicators.set([]),
        });
        this.activeIdx.set(0);
        setTimeout(() => this.input()?.nativeElement.focus(), 50);
      } else {
        this.query.set('');
      }
    });
  }

  ngAfterViewInit(): void {}

  private actions: Item[] = [
    { type: 'action', label: 'New strategy',        ctx: '⌘N', icon: 'plus',    run: () => this.router.navigate(['/strategies/new']) },
    { type: 'action', label: 'Refresh signals now', ctx: '⌘R', icon: 'refresh', run: () => this.refresh() },
  ];
  private navItems: Item[] = [
    { type: 'nav', label: 'Go to Dashboard',   ctx: 'G 1', icon: 'dashboard',  run: () => this.router.navigate(['/dashboard']) },
    { type: 'nav', label: 'Go to Strategies',  ctx: 'G 2', icon: 'strategies', run: () => this.router.navigate(['/strategies']) },
    { type: 'nav', label: 'Go to Indicators',  ctx: 'G 3', icon: 'indicators', run: () => this.router.navigate(['/indicators']) },
    { type: 'nav', label: 'Settings',          icon: 'settings', run: () => this.router.navigate(['/settings']) },
  ];

  private matches(s: string): boolean {
    const q = this.query().toLowerCase().trim();
    return !q || s.toLowerCase().includes(q);
  }

  filtered = computed<Item[]>(() => {
    // read query so this recomputes when it changes
    void this.query();
    const stratItems: Item[] = this.strategies()
      .filter(s => this.matches(s.name)
        || this.matches(s.benchmark_ticker)
        || this.matches(s.risk_on_tickers.join(' ')))
      .map(s => ({
        type: 'strategy' as const,
        label: s.name,
        ctx: s.current_signal?.risk_on
          ? `Risk on · ${s.current_signal.score}/${s.current_signal.total}`
          : 'Risk off',
        icon: 'strategies',
        run: () => this.router.navigate(['/strategies', s.id]),
      }));
    const indItems: Item[] = this.indicators()
      .filter(i => this.matches(i.name))
      .map(i => ({
        type: 'indicator' as const,
        label: i.name,
        ctx: i.type,
        icon: 'indicators',
        run: () => this.router.navigate(['/indicators', i.id, 'edit']),
      }));
    const acts = this.actions.filter(a => this.matches(a.label));
    const navs = this.navItems.filter(n => this.matches(n.label));
    return [...stratItems, ...indItems, ...acts, ...navs];
  });

  grouped = computed<Group[]>(() => {
    const f = this.filtered();
    const groups: Group[] = [];
    const strats = f.filter(i => i.type === 'strategy');
    const inds   = f.filter(i => i.type === 'indicator');
    const acts   = f.filter(i => i.type === 'action');
    const navs   = f.filter(i => i.type === 'nav');
    if (strats.length) groups.push({ label: 'Strategies', items: strats });
    if (inds.length)   groups.push({ label: 'Indicators', items: inds });
    if (acts.length)   groups.push({ label: 'Actions',    items: acts });
    if (navs.length)   groups.push({ label: 'Navigation', items: navs });
    return groups;
  });

  absoluteIndex(group: Group, idx: number): number {
    let acc = 0;
    for (const g of this.grouped()) {
      if (g.label === group.label) return acc + idx;
      acc += g.items.length;
    }
    return idx;
  }

  moveSelection(delta: 1 | -1): void {
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
    this.router.navigate(['/dashboard']);
  }
}
