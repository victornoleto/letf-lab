import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';

interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
  ts: number;
}

const STORAGE_KEY = 'letf-lab.chat.transcript';
const MAX_TURNS = 60;

@Component({
  selector: 'app-chat-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button class="chat-fab"
            (click)="toggle()"
            [attr.aria-label]="open() ? 'Fechar chat' : 'Abrir chat'"
            [class.chat-fab--open]="open()">
      <svg width="18" height="18">
        @if (open()) {
          <use href="#x"/>
        } @else {
          <use href="#message"/>
        }
      </svg>
    </button>

    @if (open()) {
      <aside class="chat-drawer" role="dialog" aria-label="Chat com a carteira">
        <header class="chat-drawer__head">
          <div>
            <div class="chat-drawer__title">Chat com a carteira</div>
            <div class="chat-drawer__sub">
              Pergunte sobre estratégias, transições recentes, riscos.
            </div>
          </div>
          <button class="icon-btn" (click)="clear()" aria-label="Limpar conversa">
            <svg width="13" height="13"><use href="#trash"/></svg>
          </button>
        </header>

        <div class="chat-drawer__transcript" #transcriptEl>
          @if (turns().length === 0) {
            <div class="chat-drawer__hint">
              Exemplos:
              <ul>
                <li>"Qual minha estratégia mais vulnerável a um cenário tipo 2008?"</li>
                <li>"Algum indicador está perto de virar?"</li>
                <li>"Resumo das transitions da última semana."</li>
              </ul>
            </div>
          }
          @for (t of turns(); track t.ts) {
            <div class="chat-bubble" [ngClass]="bubbleCls(t.role)">
              {{ t.text }}
            </div>
          }
          @if (loading()) {
            <div class="chat-bubble chat-bubble--assistant chat-bubble--loading">
              pensando…
            </div>
          }
        </div>

        <form class="chat-drawer__form"
              (submit)="$event.preventDefault(); send()">
          <textarea
            #inputEl
            class="chat-drawer__input"
            [(ngModel)]="draft"
            name="draft"
            rows="2"
            placeholder="Pergunte algo sobre sua carteira…"
            (keydown)="onInputKey($event)"
            [disabled]="loading()"
          ></textarea>
          <button type="submit" class="btn btn--primary btn--sm"
                  [disabled]="!canSend()">
            Enviar
          </button>
        </form>
      </aside>
    }
  `,
  styles: [`
    .chat-fab {
      position: fixed;
      bottom: 22px;
      right: 22px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 1px solid var(--border);
      background: var(--accent);
      color: #fff;
      cursor: pointer;
      box-shadow: var(--shadow-md);
      z-index: 80;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: transform var(--duration-fast) var(--ease-out);
    }
    .chat-fab:hover { transform: translateY(-1px); }
    .chat-fab--open {
      background: var(--surface-elevated);
      color: var(--text-primary);
      border-color: var(--border);
    }

    .chat-drawer {
      position: fixed;
      bottom: 78px;
      right: 22px;
      width: 380px;
      max-height: calc(100vh - 100px);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      z-index: 79;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    @media (max-width: 540px) {
      .chat-drawer {
        right: 10px;
        left: 10px;
        width: auto;
      }
    }

    .chat-drawer__head {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }
    .chat-drawer__title {
      font-size: 13px;
      font-weight: var(--fw-semibold);
    }
    .chat-drawer__sub {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .chat-drawer__transcript {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .chat-drawer__hint {
      color: var(--text-muted);
      font-size: 12px;
      line-height: 1.5;
    }
    .chat-drawer__hint ul {
      margin: 6px 0 0;
      padding-left: 18px;
    }
    .chat-drawer__hint li { margin: 3px 0; }

    .chat-bubble {
      padding: 8px 11px;
      border-radius: var(--radius-md);
      font-size: 12.5px;
      line-height: 1.5;
      white-space: pre-wrap;
      max-width: 92%;
    }
    .chat-bubble--user {
      align-self: flex-end;
      background: var(--accent);
      color: #fff;
    }
    .chat-bubble--assistant {
      align-self: flex-start;
      background: var(--surface-muted);
      color: var(--text-primary);
    }
    .chat-bubble--loading {
      color: var(--text-muted);
      font-style: italic;
    }

    .chat-drawer__form {
      padding: 10px 12px;
      border-top: 1px solid var(--border);
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }
    .chat-drawer__input {
      flex: 1;
      resize: none;
      font: inherit;
      font-size: 12.5px;
      line-height: 1.4;
      padding: 6px 8px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface);
      color: var(--text-primary);
    }
    .chat-drawer__input:focus {
      outline: 2px solid var(--accent);
      outline-offset: -1px;
      border-color: var(--accent);
    }
  `],
})
export class ChatDrawerComponent {
  private api = inject(ApiService);

  open = signal(false);
  loading = signal(false);
  turns = signal<ChatTurn[]>(this.readPersisted());
  draft = '';

  private transcriptEl = viewChild<ElementRef<HTMLDivElement>>('transcriptEl');
  private inputEl = viewChild<ElementRef<HTMLTextAreaElement>>('inputEl');

  constructor() {
    effect(() => {
      // Persist whenever the transcript changes
      try {
        const value = JSON.stringify(this.turns().slice(-MAX_TURNS));
        localStorage.setItem(STORAGE_KEY, value);
      } catch {}
    });
  }

  toggle(): void {
    this.open.update((v) => !v);
    if (this.open()) {
      queueMicrotask(() => this.focusInput());
      queueMicrotask(() => this.scrollToBottom());
    }
  }

  canSend(): boolean {
    return this.draft.trim().length > 0 && !this.loading();
  }

  send(): void {
    if (!this.canSend()) return;
    const question = this.draft.trim();
    this.draft = '';
    this.appendTurn({ role: 'user', text: question, ts: Date.now() });
    this.loading.set(true);
    this.scrollToBottom();
    this.api.chat(question, true).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.appendTurn({ role: 'assistant', text: res.answer, ts: Date.now() });
        this.scrollToBottom();
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.detail ?? 'Falha ao consultar a IA';
        this.appendTurn({ role: 'assistant', text: `Erro: ${msg}`, ts: Date.now() });
        this.scrollToBottom();
      },
    });
  }

  clear(): void {
    if (this.turns().length === 0) return;
    if (!confirm('Limpar conversa?')) return;
    this.turns.set([]);
  }

  bubbleCls(role: ChatTurn['role']): string {
    return role === 'user' ? 'chat-bubble--user' : 'chat-bubble--assistant';
  }

  onInputKey(ev: KeyboardEvent): void {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      this.send();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.open.set(false);
  }

  private appendTurn(t: ChatTurn): void {
    const next = [...this.turns(), t].slice(-MAX_TURNS);
    this.turns.set(next);
  }

  private scrollToBottom(): void {
    queueMicrotask(() => {
      const el = this.transcriptEl()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  private focusInput(): void {
    const el = this.inputEl()?.nativeElement;
    el?.focus();
  }

  private readPersisted(): ChatTurn[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(-MAX_TURNS) : [];
    } catch {
      return [];
    }
  }
}
