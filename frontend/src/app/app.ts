import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from './core/api.service';
import { RefreshStatus, SignalTransition } from './core/models';
import { ThemeService } from './shared/theme/theme.service';
import { PaletteService } from './shared/palette/palette.service';
import { CommandPaletteComponent } from './shared/palette/command-palette';
import { LoadingBarComponent } from './shared/loading-bar/loading-bar';
import { ToastStackComponent } from './shared/toast/toast-stack';
import { ToastService } from './shared/toast/toast.service';
import { ConfirmDialogComponent } from './shared/confirm/confirm-dialog';
import { ChatDrawerComponent } from './shared/chat-drawer/chat-drawer';
import { ThemeSwitchComponent } from './shared/theme/theme-switch';
import { AuthService } from './core/auth.service';

const COLLAPSED_KEY = 'letf-lab.sidebar.collapsed';
const BANNER_DISMISSED_KEY = 'letf-lab.banner.transitions.dismissed';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CommonModule,
    CommandPaletteComponent,
    ChatDrawerComponent,
    LoadingBarComponent,
    ToastStackComponent,
    ConfirmDialogComponent,
    ThemeSwitchComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private api = inject(ApiService);
  // Ensure ThemeService constructs early so FOUC is consistent.
  private theme = inject(ThemeService);
  private palette = inject(PaletteService);
  private toast = inject(ToastService);
  private router = inject(Router);
  protected auth = inject(AuthService);

  recentTransitions = signal<SignalTransition[]>([]);
  refreshing = signal(false);
  refreshError = signal<string | null>(null);
  refreshStatus = signal<RefreshStatus | null>(null);
  collapsed = signal<boolean>(this.readCollapsed());
  bannerDismissed = signal<boolean>(this.readBannerDismissed());
  mobileMenuOpen = signal(false);

  private currentUrl = signal<string>(typeof location !== 'undefined' ? location.pathname : '');
  isShellRoute = computed(() => !this.currentUrl().startsWith('/login'));

  avatarInitial = computed(() => {
    const u = this.auth.user();
    if (!u) return '?';
    const src = u.name || u.email;
    return src ? src.charAt(0).toUpperCase() : '?';
  });

  constructor() {
    this.router.events.subscribe((ev) => {
      if (ev instanceof NavigationEnd) {
        this.currentUrl.set(ev.urlAfterRedirects);
      }
    });
  }

  lastRefreshLabel = computed<string>(() => {
    const ts = this.refreshStatus()?.last_finished_at;
    if (!ts) return '—';
    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) return '—';
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/New_York',
    });
    return `${formatter.format(date)} ET`;
  });

  ngOnInit(): void {
    // Resolve session before loading anything that requires it. The guard
    // also calls refresh(), but landing on login or non-shell routes won't
    // trigger it — we want the foot user/email to populate either way.
    this.auth.refresh().subscribe((u) => {
      if (u) {
        this.loadTransitions();
        this.loadRefreshStatus();
      }
    });
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }

  loadTransitions(): void {
    this.api.recentTransitions(7).subscribe({
      next: (rows) => this.recentTransitions.set(rows),
      error: () => this.recentTransitions.set([]),
    });
  }

  loadRefreshStatus(): void {
    this.api.refreshStatus().subscribe({
      next: (status) => this.refreshStatus.set(status),
      error: () => this.refreshStatus.set(null),
    });
  }

  triggerRefresh(): void {
    this.refreshing.set(true);
    this.refreshError.set(null);
    this.api.triggerRefresh().subscribe({
      next: () => {
        this.refreshing.set(false);
        this.loadTransitions();
        this.loadRefreshStatus();
        this.toast.push({ variant: 'info', message: 'Atualizado · ' + this.lastRefreshLabel() });
      },
      error: (err) => {
        this.refreshing.set(false);
        const msg = err?.error?.detail ?? 'Refresh failed';
        this.refreshError.set(msg);
        this.toast.push({ variant: 'danger', message: msg, duration: 8000 });
      },
    });
  }

  toggleCollapsed(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
    } catch {}
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.set(!this.mobileMenuOpen());
  }

  dismissBanner(): void {
    this.bannerDismissed.set(true);
    try {
      sessionStorage.setItem(BANNER_DISMISSED_KEY, '1');
    } catch {}
  }

  dismissError(): void {
    this.refreshError.set(null);
  }

  private gArmed = false;
  private gArmTimer: any = null;

  @HostListener('document:keydown', ['$event'])
  onKeydown(ev: KeyboardEvent): void {
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') {
      ev.preventDefault();
      this.palette.toggle();
      return;
    }

    const target = ev.target as HTMLElement | null;
    const tag = target?.tagName ?? '';
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
    if (target?.isContentEditable) return;
    if (this.palette.isOpen()) return;
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;

    if (ev.key === 'g' && !this.gArmed) {
      this.gArmed = true;
      clearTimeout(this.gArmTimer);
      this.gArmTimer = setTimeout(() => (this.gArmed = false), 1500);
      return;
    }
    if (this.gArmed) {
      if (ev.key === '1') this.router.navigate(['/dashboard']);
      else if (ev.key === '2') this.router.navigate(['/strategies']);
      else if (ev.key === '3') this.router.navigate(['/indicators']);
      this.gArmed = false;
      clearTimeout(this.gArmTimer);
    }
  }

  private readCollapsed(): boolean {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  }

  private readBannerDismissed(): boolean {
    try {
      return sessionStorage.getItem(BANNER_DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  }
}
