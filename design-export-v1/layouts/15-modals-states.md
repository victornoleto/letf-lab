# 15 — Modals, confirmations, toasts, empty/loading

> Convenções globais para overlays e estados transitórios.

---

## Modal — quando usar

| Caso | Tipo |
|---|---|
| Criar/editar entidade (Strategy, Indicator) | `modal--wide` (720px) |
| Confirmação destrutiva (delete) | `modal` padrão (560px), foco em "Delete" |
| Visualizar detalhes inline (preview signal) | `modal` padrão |
| Settings rápidos (theme, account) | `modal--narrow` (440px) — variant opcional |

**Não use modal para**: navegação principal, conteúdo longo (use página), formulário com >10 fields (use página dedicada).

## Confirmation modal

```html
<dialog class="modal" #dlg open>
  <div class="modal__head">
    <h2 class="modal__title">Delete strategy?</h2>
  </div>
  <div class="modal__body">
    <p class="modal__text">
      Você está prestes a deletar <strong>{{ strategy.name }}</strong>.
      Essa ação não pode ser desfeita. O histórico de signals será mantido.
    </p>
    <div class="callout callout--danger">
      <svg class="ico" width="16" height="16"><use href="#alert-circle"/></svg>
      <p>{{ strategy.indicators.length }} indicators e {{ transitionsCount }} transitions ficarão órfãos.</p>
    </div>
  </div>
  <div class="modal__foot">
    <button class="btn btn--ghost btn--md" (click)="dlg.close()">Cancel</button>
    <button class="btn btn--danger btn--md" (click)="confirm()" cdkFocusInitial>
      Delete strategy
    </button>
  </div>
</dialog>
```

```scss
.modal__text {
  margin: 0;
  font: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.6;
  strong { color: var(--text-primary); font-weight: 600; }
}

.callout {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid;
  font: var(--text-sm);

  p { margin: 0; }
  .ico { flex-shrink: 0; margin-top: 2px; }

  &--danger  { background: var(--danger-bg);  color: var(--danger-text);  border-color: var(--danger-border); }
  &--warn    { background: var(--warn-bg);    color: var(--warn-text);    border-color: var(--warn-border); }
  &--info    { background: var(--info-bg);    color: var(--info-text);    border-color: var(--info-border); }
  &--success { background: var(--success-bg); color: var(--success-text); border-color: var(--success-border); }
}
```

## Comportamento — modal

- **Esc**: fecha (a menos que esteja salvando — desabilite Esc nessa fase).
- **Click no backdrop**: fecha em modais leves; **não fecha** em modais com form com `dirty`. Mostra confirmation "Discard changes?" se dirty.
- **Foco**: `autofocus` no primeiro field. Trap dentro do modal (HTML `<dialog>` faz isso nativamente quando aberto via `.showModal()`).
- **Animation entrada**: 120ms ease-out, fade + scale 0.96→1.0. Sem stagger.
- **Z-index**: 50 (fica acima de toast 60? — não. Toast deve ficar abaixo de modal: toast 40, modal 50, modal scrim 49).

## Toasts — política

- Posição: bottom-right, 20px do canto.
- Stack máximo: 3. Novos empurram antigos pra cima; se excede 3, mais antigo dismissa.
- Auto-dismiss: 5000ms (success/info) ou 8000ms (danger/warn). Hover pausa.
- Dismiss manual: botão `×` sempre visível.
- **Nunca** use toast para mensagens críticas que precisam de ação (use modal/banner).

### Casos de uso

| Caso | Variant | Tempo |
|---|---|---|
| Strategy criada com sucesso | `success` | 5s |
| Strategy salva | `success` | 4s |
| Falha de rede ao salvar | `danger` | 8s + retry button |
| Refresh completo | `info` | 3s |
| Validação falhou no servidor | `danger` | 8s |
| Backtest demorando | `info` | persiste até completar |

```html
<div class="toast toast--danger">
  <svg class="ico" width="16" height="16"><use href="#alert-circle"/></svg>
  <div class="toast__body">
    <p class="toast__title">Falha ao salvar</p>
    <p class="toast__msg">Servidor retornou 500. Tente novamente.</p>
  </div>
  <button class="btn btn--secondary btn--sm">Retry</button>
  <button class="toast__close" aria-label="Dismiss"><svg class="ico" width="14" height="14"><use href="#x"/></svg></button>
</div>
```

## Empty states — variantes

| Tela | Headline | CTA |
|---|---|---|
| Dashboard 0 strategies | Nenhuma estratégia ainda | New strategy |
| Strategies list 0 results (filtered) | Nenhuma estratégia bate com os filtros | Clear filters |
| Indicator list 0 indicators | Indicadores são as regras de risco | New indicator |
| Signal history 0 transitions | Sem transições ainda | (link para Strategy) |
| Holdings sem dados | Run a refresh para popular holdings | Run refresh |

## Loading patterns

### Skeleton (default)

Usado quando layout final é previsível. Bloco cinza com shimmer.

```html
<div class="strategy-card card">
  <div class="strategy-card__head">
    <div>
      <div class="skeleton" style="width:120px;height:18px"></div>
      <div class="skeleton" style="width:160px;height:12px;margin-top:6px"></div>
    </div>
    <div class="skeleton" style="width:60px;height:20px;border-radius:9999px"></div>
  </div>
  <div class="skeleton skeleton--block" style="height:42px"></div>
  <div class="skeleton skeleton--block" style="height:56px"></div>
</div>
```

### Inline spinner

Usado em botões e pequenas áreas. `<svg class="ico ico--spin"><use href="#loader"/></svg>`.

### Backdrop spinner

Não usar. Sempre prefira skeleton ou inline.

## Error states (page-level)

```html
<div class="error-state">
  <svg class="error-state__ico" width="48" height="48"><use href="#alert-circle"/></svg>
  <h3 class="error-state__title">Não conseguimos carregar suas estratégias</h3>
  <p class="error-state__msg">{{ errorMessage }}</p>
  <button class="btn btn--primary btn--md" (click)="retry()">
    <svg class="ico" width="16" height="16"><use href="#refresh"/></svg>
    Try again
  </button>
</div>
```

```scss
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 80px 24px;
  gap: 12px;

  &__ico { color: var(--danger); }
  &__title { margin: 0; font: var(--text-h2); font-weight: 600; }
  &__msg { margin: 0; font: var(--text-sm); color: var(--text-muted); max-width: 480px; }
}
```

## Tooltips

Use `<app-tooltip>` ou nativo `title=` para auxiliar:

```scss
[data-tooltip] {
  position: relative;
  &::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--text-primary);
    color: var(--bg);
    font: var(--text-xs);
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--transition-fast);
  }
  &:hover::after { opacity: 1; }
}
```

Usado em sidebar collapsed, em ícones de ajuda inline, em truncated cells.

## Confirm-on-leave

Em form com `dirty`:

```ts
canDeactivate(): boolean {
  if (!this.form.dirty) return true;
  return confirm('Descartar alterações?');
}
```

Use `CanDeactivateGuard` no router para ativar.
