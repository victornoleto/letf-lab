import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { WeeklyDigestEntry } from '../../core/models';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-digest',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1 class="page-head__h1">Weekly Digest</h1>
          <p class="page-head__sub">
            AI summary every Monday (generated automatically at 9am ET).
          </p>
        </div>
        <div class="page-head__actions">
          <button class="btn btn--primary"
                  (click)="regenerateLatest()" [disabled]="generating()">
            <svg class="ico" width="12" height="12" [class.spin]="generating()">
              <use href="#refresh"/>
            </svg>
            @if (generating()) { Generating... } @else { Generate for this week }
          </button>
        </div>
      </header>

      @if (loading()) {
        <div class="skeleton skeleton--card" style="height: 200px;"></div>
      } @else if (digests().length === 0) {
        <div class="empty">
          <div class="empty__title">No digests yet</div>
          <div class="empty__copy">
            Cron generates one every Monday at 9am ET. Use the button above to generate one manually.
          </div>
        </div>
      } @else {
        @for (d of digests(); track d.week_start) {
          <article class="digest-card">
            <header class="digest-card__head">
              <div class="digest-card__week">
                Week of {{ d.week_start }}
              </div>
              <div class="digest-card__meta mono">
                {{ d.model }} · {{ formatGenerated(d.generated_at) }}
              </div>
            </header>
            <div class="digest-card__body" [innerHTML]="renderMarkdown(d.body)"></div>
          </article>
        }
      }
    </div>
  `,
  styles: [`
    .digest-card {
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--surface);
      padding: 16px 20px;
      margin-bottom: 12px;
    }
    .digest-card__head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 12px;
    }
    .digest-card__week {
      font-weight: var(--fw-semibold);
      font-size: 14px;
    }
    .digest-card__meta {
      font-size: 11px;
      color: var(--text-muted);
    }
    .digest-card__body {
      font-size: 13px;
      line-height: 1.6;
      color: var(--text-primary);
    }
    .digest-card__body :is(h1, h2, h3) {
      font-size: 13px;
      font-weight: var(--fw-semibold);
      margin: 12px 0 6px;
    }
    .digest-card__body strong { font-weight: var(--fw-semibold); }
    .digest-card__body ul { padding-left: 18px; margin: 6px 0; }
    .digest-card__body li { margin: 3px 0; }
    .digest-card__body p { margin: 6px 0; }
    .digest-card__body code {
      font-family: var(--font-mono);
      font-size: 11.5px;
      padding: 1px 4px;
      background: var(--surface-muted);
      border-radius: 3px;
    }
  `],
})
export class DigestComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  digests = signal<WeeklyDigestEntry[]>([]);
  loading = signal(true);
  generating = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.weeklyDigests(12).subscribe({
      next: (res) => { this.digests.set(res.digests); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  regenerateLatest(): void {
    if (this.generating()) return;
    this.generating.set(true);
    this.api.regenerateWeeklyDigest().subscribe({
      next: () => {
        this.generating.set(false);
        this.toast.push({ variant: 'success', message: 'Digest generated' });
        this.load();
      },
      error: (err) => {
        this.generating.set(false);
        const msg = err?.error?.detail ?? 'Failed to generate digest';
        this.toast.push({ variant: 'danger', message: msg, duration: 8000 });
      },
    });
  }

  formatGenerated(ts: string): string {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return ts;
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /** Minimal markdown → HTML rendering for headlines / bullets / bold.
   *  Keeps the dependency footprint small; the digest body is well-formed
   *  by the system prompt so we don't need a full parser. */
  renderMarkdown(md: string): string {
    const escape = (s: string) =>
      s.replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      }[c] ?? c));

    const lines = escape(md).split('\n');
    const out: string[] = [];
    let inList = false;
    const flushList = () => {
      if (inList) { out.push('</ul>'); inList = false; }
    };
    for (const raw of lines) {
      const line = raw.trimEnd();
      if (/^\s*[-*]\s+/.test(line)) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push(`<li>${this.inlineMd(line.replace(/^\s*[-*]\s+/, ''))}</li>`);
      } else if (/^#{1,3}\s+/.test(line)) {
        flushList();
        const lvl = (line.match(/^#+/) ?? [''])[0].length;
        const text = line.replace(/^#+\s+/, '');
        out.push(`<h${lvl}>${this.inlineMd(text)}</h${lvl}>`);
      } else if (line.trim().length === 0) {
        flushList();
      } else {
        flushList();
        out.push(`<p>${this.inlineMd(line)}</p>`);
      }
    }
    flushList();
    return out.join('\n');
  }

  private inlineMd(s: string): string {
    return s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }
}
