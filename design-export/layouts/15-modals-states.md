# Layout: Modais & estados (loading / empty / error)

> Modais **só** para confirmação destrutiva e command palette. Forms são telas, não modais.

---

## 1 · Confirm delete

Único modal dialog comum. Centralizado, 480px wide, copy curto.

```
┌─────────────────────────────────────────────┐
│ Deletar estratégia                       [×] │
├─────────────────────────────────────────────┤
│ QQQ → TQQQ vote-of-2 será removida          │
│ permanentemente. Esta ação não pode ser     │
│ desfeita.                                    │
│                                              │
│ 84 trades históricos serão preservados      │
│ apenas no log.                               │
├─────────────────────────────────────────────┤
│                       [Cancelar]  [Deletar] │
└─────────────────────────────────────────────┘
```

```html
<div class="modal-backdrop" (click)="onBackdrop($event)">
  <div class="modal" role="dialog" aria-labelledby="modal-title" (click)="$event.stopPropagation()">
    <div class="modal__header">
      <span id="modal-title" class="modal__title">Deletar estratégia</span>
      <button class="icon-btn" (click)="close()" aria-label="Fechar">
        <app-icon name="x" [size]="14"/>
      </button>
    </div>
    <div class="modal__body">
      <p>
        <strong class="mono">{{strategy.name}}</strong> será removida permanentemente.
        Esta ação não pode ser desfeita.
      </p>
      <p class="hint">{{strategy.tradeCount}} trades históricos serão preservados apenas no log.</p>
    </div>
    <div class="modal__footer">
      <button class="btn" (click)="close()">Cancelar</button>
      <button class="btn btn--danger" (click)="confirm()">Deletar</button>
    </div>
  </div>
</div>
```

CSS em `04-components.md §11`. Esc fecha; click no backdrop fecha; click no dialog não fecha.

**Trap focus**: ao abrir, foca o `Cancelar` (não o destrutivo). Tab cicla apenas dentro do modal.

---

## 2 · Empty state

Centralizado vertical no main content. Ícone outline 24px (não fill colorido).

```html
<div class="empty">
  <app-icon name="layers" [size]="24" class="empty__icon"/>
  <div class="empty__title">Nenhuma estratégia ainda</div>
  <div class="empty__copy">
    Crie sua primeira estratégia para acompanhar transições risk-on/risk-off automaticamente.
  </div>
  <button class="btn btn--primary" (click)="newStrategy()">
    <app-icon name="plus" [size]="12"/> Nova estratégia
  </button>
</div>
```

**Variantes:**

| Contexto                       | Ícone        | Título                          | Copy                                                |
|--------------------------------|--------------|---------------------------------|-----------------------------------------------------|
| Dashboard sem estratégias      | `layers`     | Nenhuma estratégia ainda        | Crie sua primeira para acompanhar risk-on/risk-off. |
| Estratégias filtro vazio       | `filter`     | Nenhum resultado                | Tente outro filtro ou limpe a busca.                |
| Indicadores sem itens          | `activity`   | Nenhum indicador ainda          | Adicione indicadores para usar em estratégias.      |
| Signal History sem trades      | `clock`      | Sem transições nos últimos 90d  | A estratégia não mudou de estado recentemente.      |

CSS em `04-components.md §13`.

---

## 3 · Loading

### Top-level (carregando rota)
Barra fina indigo no topo da página, animação `loading-bar`. **Não** spinner full-screen.

```scss
.loading-bar {
  position: fixed; top: 0; left: 0; right: 0;
  height: 2px;
  background: var(--accent);
  z-index: var(--z-toast);
  animation: loading-bar 800ms var(--ease-out) infinite;
  transform-origin: left;
}
@keyframes loading-bar {
  0%   { transform: scaleX(0);   opacity: 1; }
  50%  { transform: scaleX(0.7); opacity: 1; }
  100% { transform: scaleX(1);   opacity: 0; }
}
```

### Skeletons por seção
- Dashboard: 5 cards skeleton (ver `11-dashboard.md`).
- Detail: meta-bar + métricas + 2 charts skeleton 240px.
- List: 8 rows skeleton com 3 colunas de barra.

### Inline (botão)
```html
<button class="btn btn--primary" [disabled]="loading">
  @if (loading) { <app-icon name="spinner" [size]="12" class="spin"/> Rodando… }
  @else { <app-icon name="play" [size]="12"/> Rodar backtest }
</button>
```

```scss
.spin { animation: spin 600ms linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
```

---

## 4 · Error states

### Erro inline (campo)
Ver `04-components.md §4` — `.input--error` + `.error` mono.

### Erro de section (backtest falhou)
Substitui o conteúdo da `.section` por:

```html
<div class="error-state">
  <app-icon name="alert-triangle" [size]="20" class="error-state__icon"/>
  <div class="error-state__title">Erro ao rodar backtest</div>
  <div class="error-state__copy mono">{{error.code}}: {{error.message}}</div>
  <button class="btn btn--sm" (click)="retry()">
    <app-icon name="refresh" [size]="11"/> Tentar novamente
  </button>
</div>
```

```scss
.error-state {
  text-align: center;
  padding: 48px 24px;
}
.error-state__icon  { width: 20px; height: 20px; color: var(--danger); margin-bottom: 8px; }
.error-state__title { font-weight: var(--fw-medium); margin-bottom: 4px; }
.error-state__copy  { font-size: 11.5px; color: var(--text-muted); margin-bottom: 16px; }
```

### 404 / 500 page
Full-screen empty-state-like, com ícone 32px e botão pra Dashboard.

```html
<div class="empty" style="padding: 120px 16px;">
  <div style="font-family: var(--font-mono); font-size: 28px; color: var(--text-muted); margin-bottom: 8px;">404</div>
  <div class="empty__title">Página não encontrada</div>
  <div class="empty__copy">A rota que você tentou acessar não existe ou foi movida.</div>
  <a class="btn btn--primary" routerLink="/dashboard">Voltar ao Dashboard</a>
</div>
```

---

## 5 · Toast stack

Ver `04-components.md §12`. Disparado via service:

```ts
@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);

  push(t: Omit<Toast, 'id'>) {
    const id = crypto.randomUUID();
    const full = { ...t, id };
    this.toasts.update(arr => [...arr, full]);
    if (t.duration !== 0) {
      setTimeout(() => this.dismiss(id), t.duration ?? 4000);
    }
  }
  dismiss(id: string) {
    this.toasts.update(arr => arr.filter(x => x.id !== id));
  }
}

interface Toast {
  id: string;
  variant: 'success' | 'danger' | 'info';
  message: string;
  duration?: number;
}
```

**Convenções de cópia:**
- Success curta com check: `✓ Estratégia salva`.
- Erro com código quando relevante: `✗ Erro 422: Ticker inválido`.
- Info em estado neutro (cache hit, refresh manual): `Atualizado · 14:32 ET`.
