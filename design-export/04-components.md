# Components — AI-Swing (Linear DNA)

> Especificações canônicas dos componentes da UI. Todo CSS aqui assume `01-tokens.scss` carregado.
> Use BEM-ish flat (`.btn`, `.btn--primary`, `.btn__icon`) ou prefixe com `app-` se preferir.
> **Densidade alta**: alturas pequenas, paddings curtos, raios sutis (4–6px).

---

## Índice

1. [Button](#1-button)
2. [Card (Strategy card no Dashboard)](#2-card)
3. [Badge / Status pill](#3-badge)
4. [Input / Field / Select](#4-input)
5. [Chip / Tag](#5-chip)
6. [Pill group (segmented control)](#6-pill-group)
7. [Tabs](#7-tabs)
8. [Table](#8-table)
9. [Sidebar / Nav item](#9-sidebar)
10. [Banner (alert / info)](#10-banner)
11. [Modal / Dialog](#11-modal)
12. [Toast](#12-toast)
13. [Empty state](#13-empty)
14. [Skeleton / Loading](#14-skeleton)
15. [Kbd hint](#15-kbd)

---

## 1 · Button

3 variantes, 2 tamanhos. **Sempre** com `cursor: pointer`, `font-family: inherit`, `gap: 6px` para ícone.

```scss
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);                   // 6px
  padding: 0 var(--space-4);             // 12px x
  height: var(--h-btn);                  // 30px
  border-radius: var(--radius-lg);       // 6px
  font-family: inherit;
  font-size: 12.5px;
  font-weight: var(--fw-medium);
  line-height: 1;
  cursor: pointer;
  user-select: none;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-primary);
  transition: background var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out);

  &:hover  { background: var(--surface-muted); }
  &:active { background: var(--border-subtle); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }

  &--primary {
    background: var(--accent);
    color: var(--text-on-accent);
    border-color: var(--accent);
    &:hover  { background: var(--accent-hover); border-color: var(--accent-hover); }
    &:active { background: var(--accent-active); border-color: var(--accent-active); }
  }

  &--ghost {
    border-color: transparent;
    background: transparent;
    &:hover { background: var(--surface-muted); }
  }

  &--danger {
    background: var(--danger);
    color: #fff;
    border-color: var(--danger);
    &:hover { opacity: 0.92; }
  }

  &--sm {
    height: var(--h-btn-sm);             // 24px
    padding: 0 var(--space-3);           // 8px
    font-size: 11.5px;
  }

  &__icon { width: 12px; height: 12px; flex-shrink: 0; }
}
```

**Uso:**
- **Primary** (`btn--primary`) — UMA por tela. Sempre ação principal (`Nova estratégia`, `Salvar`, `Rodar backtest`).
- **Default** (sem modificador) — ações secundárias (`Editar`, `Refresh`, `Cancelar`).
- **Ghost** (`btn--ghost`) — em headers de tabela, dentro de cards, ao lado de chips. Sem fundo.
- **Danger** (`btn--danger`) — apenas em modais de confirmação destrutiva (`Deletar estratégia`).
- **Sm** — em ações inline de tabela (3 botões `…` por row), nos headers de section dentro de Detail.

**Anti-pattern:** botão primário grande "hero" estilo SaaS landing. Não tem na app — todos são compactos.

---

## 2 · Card

Strategy card do Dashboard. **Linear DNA = sharp 6px radius, 1px border, accent stripe lateral**.

```scss
.card {
  position: relative;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);       // 6px
  cursor: pointer;
  transition: border-color var(--duration-fast) var(--ease-out);

  &:hover { border-color: var(--border-strong); }

  // Stripe vertical de status (2px à esquerda)
  &__accent {
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 2px;
    &--on        { background: var(--success); }
    &--off       { background: var(--danger); }
    &--borderline{ background: var(--warn); }
  }

  &__head { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px 10px; }
  &__meta { display: flex; align-items: baseline; justify-content: space-between; padding: 0 14px 8px; font-size: 11.5px; color: var(--text-muted); }
  &__spark { padding: 0 8px 6px; }
  &__rows  { padding: 8px 14px 14px; border-top: 1px solid var(--border-subtle); }
}
```

**Score bar (segmento por indicador):**
```scss
.score-bar { display: flex; gap: 2px; }
.score-bar__seg {
  width: 14px; height: 4px; border-radius: 1px;
  background: var(--border-subtle);
  &--filled-on        { background: var(--success); }
  &--filled-borderline{ background: var(--warn); }
  &--filled-off       { background: var(--danger); }
}
```

5 segmentos representam os 5 indicadores. Preenchidos = pass; vazios = fail. Cor = status agregado da estratégia.

**Indicator row (dentro do card):**
```scss
.ind-row {
  display: grid;
  grid-template-columns: 14px 84px 1fr;
  gap: 8px;
  align-items: center;
  padding: 3px 0;
  font-size: 11.5px;
}
.ind-row__icon-pass { color: var(--success); }
.ind-row__icon-fail { color: var(--danger); }
.ind-row__name      { color: var(--text-secondary); }
.ind-row__detail    { font-family: var(--font-mono); color: var(--text-muted); font-size: 10.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
```

3 colunas exatas: icon (14) · name (84) · detail mono (flex). Não inverter a ordem.

---

## 3 · Badge

Status pill, mono uppercase. **Sem ponto colorido** (Linear não usa) — é o fill que dá cor.

```scss
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 7px;
  border-radius: var(--radius-sm);       // 4px
  font-family: var(--font-mono);
  font-size: 10.5px;
  font-weight: var(--fw-medium);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  line-height: 1.4;

  &--on        { background: var(--success-soft); color: var(--success-fg); }
  &--off       { background: var(--danger-soft);  color: var(--danger-fg); }
  &--borderline{ background: var(--warn-soft);    color: var(--warn-fg); }
  &--info      { background: var(--info-soft);    color: var(--info-fg); }
  &--neutral   { background: var(--surface-muted);color: var(--text-secondary); }
}
```

**Texto canônico:** `RISK ON`, `RISK OFF`, `NO FIO`, `BORDERLINE` (escolher 1 e seguir). Ver mock — os cards usam `Risk on`/`Risk off`/`No fio` em sentence-case dentro do badge, mas o CSS força uppercase. Mantenha sentence-case no DOM, deixa o CSS uppercase-ar.

---

## 4 · Input

Altura 32px, radius 5px, border 1px, focus = 2px ring no accent.

```scss
.field { margin-bottom: var(--space-5); }    // 16px

.label {
  display: block;
  font-size: 11.5px;
  font-weight: var(--fw-medium);
  color: var(--text-primary);
  margin-bottom: 5px;
}

.input {
  width: 100%;
  height: var(--h-input);                     // 32px
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);            // 5px
  background: var(--surface);
  color: var(--text-primary);
  font-family: inherit;
  font-size: var(--fs-base);                  // 13px
  transition: border-color var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);

  &::placeholder { color: var(--text-disabled); }

  &:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--focus-ring);
  }

  &--error {
    border-color: var(--danger);
    &:focus { box-shadow: 0 0 0 2px rgba(220,38,38,0.25); }
  }

  &--mono { font-family: var(--font-mono); font-feature-settings: 'tnum' 1; }
}

.hint  { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-top: 4px; }
.error { font-family: var(--font-mono); font-size: 11px; color: var(--danger-fg); margin-top: 4px; }
```

**Tickers** (`benchmark`, `risk-on ticker`, etc) usam `.input--mono` — força JetBrains Mono pra alinhar.

**Select / Combobox** segue mesma altura/radius. Native `<select>` está OK; se for custom, replica focus-ring.

---

## 5 · Chip

Tag selecionável (multi-select de indicadores no form de estratégia, filter chips).

```scss
.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: var(--radius-sm);            // 4px
  font-size: 12px;
  cursor: pointer;
  user-select: none;

  &:hover    { background: var(--surface-muted); }
  &--selected{
    background: var(--text-primary);
    color: var(--bg);
    border-color: var(--text-primary);
  }
}
```

Selected = invertido (preto sólido). **Não** usar accent indigo aqui — chips são neutros.

---

## 6 · Pill group (segmented control)

Filtros do Dashboard (`Todas / Risk-on / Risk-off`) e timeframes do backtest (`3y / 5y / 10y / 20y`).

```scss
.pills {
  display: inline-flex;
  padding: 2px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);            // 5px
  gap: 0;
}

.pill {
  padding: 3px 9px;
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
  transition: background var(--duration-fast) var(--ease-out);

  &--active {
    background: var(--surface);
    color: var(--text-primary);
    box-shadow: 0 1px 2px rgba(0,0,0,0.06);
  }
}
```

Mono nos pills de timeframe; sans nos pills de filtro. Decidir por contexto.

---

## 7 · Tabs

Tabs full-bleed (Dashboard sub-navigation). Border bottom 1px no container, 2px no ativo.

```scss
.tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border);
  margin-bottom: var(--space-5);
}

.tab {
  padding: 8px 14px;
  font-size: 12.5px;
  color: var(--text-muted);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;                        // sobrepõe border-bottom do parent
  cursor: pointer;

  &--active {
    color: var(--text-primary);
    border-bottom-color: var(--text-primary); // ink, NÃO accent
    font-weight: var(--fw-medium);
  }
}
```

**Linear usa ink (preto) no underline ativo, não accent.** Accent é reservado a focus / pequenos highlights.

---

## 8 · Table

Lista de Estratégias e Indicadores. Densa, hover suave, ações aparecem só no hover da row.

```scss
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.table th {
  text-align: left;
  padding: 8px 14px;
  font-size: 10.5px;
  font-weight: var(--fw-medium);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
}

.table td {
  padding: 9px 14px;
  border-bottom: 1px solid var(--border-subtle);
  vertical-align: middle;
}

.table tr:hover td { background: var(--bg); }

.table__actions {
  opacity: 0;
  display: flex;
  gap: 2px;
  justify-content: flex-end;
  transition: opacity var(--duration-fast) var(--ease-out);
}
.table tr:hover .table__actions { opacity: 1; }

// Wrapper opcional pra dar borda + radius na tabela inteira
.table-wrap {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--surface);
}
```

**Não** usar zebra striping (alternar bg de rows). Linear é flat.

**Icon button** (3 ações por row, ghost):
```scss
.icon-btn {
  width: 24px; height: 24px;
  display: grid; place-items: center;
  border: none; background: transparent;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  &:hover { background: var(--surface-muted); color: var(--text-primary); }
}
```

---

## 9 · Sidebar

Largura fixa 232px, `sticky top:0`, full height. Bg 1 nível mais escuro que `--bg`.

```scss
.sidebar {
  position: sticky;
  top: 0;
  width: 232px;
  height: 100vh;
  flex-shrink: 0;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
}

.brand {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 8px 16px;
}
.brand__mark {
  width: 22px; height: 22px;
  border-radius: var(--radius-md);
  background: var(--text-primary);
  color: var(--bg);
  display: grid; place-items: center;
}
.brand__name {
  font-size: 13.5px;
  font-weight: var(--fw-semibold);
  letter-spacing: var(--tracking-tight);
}

.nav-section {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: var(--fw-medium);
  padding: 12px 8px 6px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  height: var(--h-nav-item);              // 28px
  padding: 0 8px;
  border-radius: var(--radius-md);        // 5px
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
  font-size: var(--fs-base);

  &:hover  { background: rgba(0,0,0,0.04); color: var(--text-primary); }
  &--active{ background: rgba(0,0,0,0.06); color: var(--text-primary); font-weight: var(--fw-medium); }
}

[data-theme="dark"] .nav-item:hover  { background: rgba(255,255,255,0.05); }
[data-theme="dark"] .nav-item--active{ background: rgba(255,255,255,0.07); }

.nav-item__kbd { margin-left: auto; }    // .kbd já estilizada em §15
```

**Atalhos de teclado canônicos (Linear-style):** `G 1` Dashboard, `G 2` Estratégias, `G 3` Indicadores. Implementar handler global escutando `keydown` com `g` armed por 1.5s.

```js
// Pseudocódigo no AppShell
let armed = false;
window.addEventListener('keydown', e => {
  if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
  if (e.key === 'g' && !armed) { armed = true; setTimeout(()=>armed=false, 1500); return; }
  if (armed) {
    if (e.key === '1') router.navigate('/dashboard');
    if (e.key === '2') router.navigate('/strategies');
    if (e.key === '3') router.navigate('/indicators');
    armed = false;
  }
});
```

**Status bar (footer da sidebar):**
```scss
.status-bar {
  margin-top: auto;
  padding: 10px 8px;
  border-top: 1px solid var(--border);
}
.status-bar__row { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: var(--text-muted); }
.status-bar__dot { width: 6px; height: 6px; border-radius: 50%; background: var(--success); }
```

`Atualizado 14:32 ET` + dot verde piscando suavemente. Refresh button abaixo (`.btn` default sm).

---

## 10 · Banner

Aviso topo de página (transições recentes, erros leves).

```scss
.banner {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px;
  background: var(--warn-soft);
  border: 1px solid color-mix(in oklab, var(--warn) 20%, transparent);
  border-radius: var(--radius-lg);
  font-size: 12.5px;
  color: var(--text-primary);
  margin-bottom: var(--space-5);

  &--info  { background: var(--info-soft);  border-color: color-mix(in oklab, var(--info) 20%, transparent); }
  &--danger{ background: var(--danger-soft);border-color: color-mix(in oklab, var(--danger) 20%, transparent); }

  &__close { margin-left: auto; cursor: pointer; color: var(--text-muted); padding: 2px; background: none; border: none; }
}
```

**Não** dismiss por default — controlar via state (não fica salvo se reabrir página). Se for sticky, persistir no localStorage.

---

## 11 · Modal

Overlay 45% black, dialog 480–640px wide, radius 8px (único componente que merece o `xl`).

```scss
.modal-backdrop {
  position: fixed; inset: 0;
  background: var(--overlay);
  z-index: var(--z-modal-backdrop);
  display: grid; place-items: center;
  padding: 32px;
  animation: fadeIn 120ms var(--ease-out);
}

.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);              // 8px (exceção)
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 560px;
  max-height: calc(100vh - 64px);
  display: flex; flex-direction: column;
  overflow: hidden;
  animation: slideUp 180ms var(--ease-out);

  &__header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  &__title { font-size: 13.5px; font-weight: var(--fw-medium); letter-spacing: var(--tracking-tight); }
  &__body  { padding: 20px; overflow-y: auto; }
  &__footer{
    padding: 12px 20px;
    border-top: 1px solid var(--border);
    background: var(--bg);
    display: flex; gap: 8px; justify-content: flex-end;
  }
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
```

**Footer no `var(--bg)`** (1 tom diferente do body) — separa visualmente. Botões alinhados à direita: `Cancelar` (default) → `Salvar` (primary). Esc fecha. Click no backdrop fecha. Trap focus.

---

## 12 · Toast

Stack inferior-direita. Auto-dismiss 4s. Max 3 visíveis.

```scss
.toast-stack {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column-reverse;             // mais novo embaixo
  gap: 8px;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  font-size: 12.5px;
  min-width: 280px;
  max-width: 420px;
  animation: slideInR 180ms var(--ease-out);

  &__icon { width: 14px; height: 14px; flex-shrink: 0; }
  &--success .toast__icon { color: var(--success); }
  &--danger  .toast__icon { color: var(--danger); }
  &--info    .toast__icon { color: var(--info); }

  &__close { margin-left: auto; color: var(--text-muted); }
}

@keyframes slideInR { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: none; } }
```

---

## 13 · Empty state

Centralizado vertical, ícone outline 24px, copy 12.5px, CTA primary.

```scss
.empty {
  text-align: center;
  padding: 64px 16px;
  color: var(--text-muted);
}
.empty__icon  { width: 24px; height: 24px; margin: 0 auto 12px; color: var(--text-muted); }
.empty__title { font-size: 13.5px; font-weight: var(--fw-medium); color: var(--text-primary); margin-bottom: 4px; }
.empty__copy  { font-size: 12.5px; margin-bottom: 16px; max-width: 320px; margin-left: auto; margin-right: auto; }
```

---

## 14 · Skeleton

Linhas com `linear-gradient` shimmer. **NÃO** usar pulse — Linear DNA usa shimmer rapido.

```scss
.skeleton {
  background: linear-gradient(
    90deg,
    var(--surface-muted) 0%,
    var(--border-subtle) 50%,
    var(--surface-muted) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
  border-radius: var(--radius-sm);
}
.skeleton--text  { height: 12px; margin: 4px 0; }
.skeleton--title { height: 20px; width: 40%; margin: 4px 0 8px; }
.skeleton--card  { height: 180px; }

@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
```

---

## 15 · Kbd

Atalhos de teclado em sidebar e tooltips (ex: `G 1`, `Cmd+K`).

```scss
.kbd {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);          // 3px
  padding: 1px 5px;
  line-height: 1.4;
}
```

Quando dentro de `.nav-item`, adicionar `margin-left: auto`.
