# 04 — Components

> Pasteable SCSS + HTML mínimo para cada componente-base. Tudo consome tokens de `01-tokens.scss`.
> Convenções: BEM-ish (`.btn--primary`), `is-` prefix para state (`.is-active`, `.is-disabled`).

---

## Button

Variantes: `primary`, `secondary`, `ghost`, `danger`. Tamanhos: `sm` (28px), `md` (32px), `lg` (40px).

### HTML

```html
<button class="btn btn--primary btn--md" type="button">
  <svg class="ico" width="16" height="16" aria-hidden="true"><use href="/assets/icons/sprite.svg#plus"></use></svg>
  <span>Add strategy</span>
</button>

<button class="btn btn--secondary btn--md">Cancel</button>
<button class="btn btn--ghost btn--sm">Edit</button>
<button class="btn btn--danger btn--md">Delete</button>
<button class="btn btn--primary btn--md is-loading" disabled>
  <svg class="ico ico--spin" width="16" height="16" aria-hidden="true"><use href="/assets/icons/sprite.svg#loader"></use></svg>
  <span>Saving…</span>
</button>
```

### SCSS

```scss
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font: var(--text-sm);
  font-weight: 500;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  white-space: nowrap;
  text-decoration: none;
  transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast), box-shadow var(--transition-fast);
  user-select: none;

  &--sm { height: 28px; padding: 0 10px; font-size: 12px; }
  &--md { height: 32px; padding: 0 12px; }
  &--lg { height: 40px; padding: 0 16px; font-size: var(--text-base); }

  &--primary {
    background: var(--primary);
    color: var(--primary-fg);
    border-color: var(--primary);
    &:hover:not(:disabled) { background: var(--primary-hover); border-color: var(--primary-hover); }
    &:active:not(:disabled) { background: var(--primary-active); }
  }

  &--secondary {
    background: var(--surface);
    color: var(--text-primary);
    border-color: var(--border);
    box-shadow: var(--shadow-xs);
    &:hover:not(:disabled) { background: var(--surface-muted); border-color: var(--border-strong); }
  }

  &--ghost {
    background: transparent;
    color: var(--text-secondary);
    border-color: transparent;
    &:hover:not(:disabled) { background: var(--surface-muted); color: var(--text-primary); }
  }

  &--danger {
    background: var(--danger);
    color: #fff;
    border-color: var(--danger);
    &:hover:not(:disabled) { filter: brightness(0.92); }
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }

  &:disabled, &.is-disabled { opacity: 0.5; cursor: not-allowed; }
  &.is-loading { cursor: progress; }

  // Icon-only
  &--icon { padding: 0; width: 32px; }
  &--icon.btn--sm { width: 28px; }
  &--icon.btn--lg { width: 40px; }
}
```

---

## Card

Container neutro. Variant `card--accent-{success|danger|warn}` adiciona faixa lateral (3px) — usado nos cards do Dashboard.

### HTML

```html
<article class="card">
  <header class="card__head">
    <h3 class="card__title">QQQ Rotation</h3>
    <span class="badge badge--success">RISK ON</span>
  </header>
  <div class="card__body">…</div>
</article>

<article class="card card--accent-success">…</article>
<article class="card card--accent-danger">…</article>
<article class="card card--accent-warn">…</article>
```

### SCSS

```scss
.card {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  &__title {
    margin: 0;
    font: var(--text-h3);
    font-weight: 600;
    letter-spacing: -0.008em;
    color: var(--text-primary);
  }

  &__body { display: flex; flex-direction: column; gap: var(--space-3); }

  &--accent-success::before,
  &--accent-danger::before,
  &--accent-warn::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    border-top-left-radius: var(--radius-lg);
    border-bottom-left-radius: var(--radius-lg);
  }
  &--accent-success::before { background: var(--success); }
  &--accent-danger::before  { background: var(--danger); }
  &--accent-warn::before    { background: var(--warn); }

  &--clickable {
    cursor: pointer;
    transition: box-shadow var(--transition-fast), border-color var(--transition-fast);
    &:hover { box-shadow: var(--shadow-md); border-color: var(--border-strong); }
  }
}
```

---

## Badge / Pill

### HTML

```html
<span class="badge badge--success">RISK ON</span>
<span class="badge badge--danger">RISK OFF</span>
<span class="badge badge--warn">BORDERLINE</span>
<span class="badge badge--info">INFO</span>
<span class="badge badge--neutral">DRAFT</span>

<!-- Score pill (mono) -->
<span class="badge badge--success badge--mono">3 / 4</span>

<!-- Removable chip -->
<span class="chip">
  SMA Gate
  <button class="chip__close" aria-label="Remove"><svg class="ico" width="12" height="12"><use href="#x"/></svg></button>
</span>
```

### SCSS

```scss
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 20px;
  padding: 0 8px;
  border-radius: var(--radius-pill);
  font: var(--text-micro);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border: 1px solid transparent;
  white-space: nowrap;

  &--mono {
    font-family: var(--font-mono);
    font-feature-settings: 'tnum';
    text-transform: none;
    letter-spacing: 0;
  }

  &--success { background: var(--success-bg); color: var(--success-text); border-color: var(--success-border); }
  &--danger  { background: var(--danger-bg);  color: var(--danger-text);  border-color: var(--danger-border); }
  &--warn    { background: var(--warn-bg);    color: var(--warn-text);    border-color: var(--warn-border); }
  &--info    { background: var(--info-bg);    color: var(--info-text);    border-color: var(--info-border); }
  &--neutral { background: var(--surface-muted); color: var(--text-secondary); border-color: var(--border); }

  // Larger variant for hero
  &--lg { height: 26px; padding: 0 12px; font-size: 12px; }
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 4px 0 10px;
  border-radius: var(--radius-pill);
  background: var(--surface-muted);
  border: 1px solid var(--border);
  font: var(--text-xs);
  color: var(--text-secondary);

  &__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px; height: 18px;
    border: 0; background: transparent;
    color: var(--text-muted);
    border-radius: var(--radius-pill);
    cursor: pointer;
    &:hover { background: var(--border); color: var(--text-primary); }
  }
}
```

---

## Field (Input / Select / Textarea)

Label-on-top, hint embaixo, error inline.

### HTML

```html
<div class="field">
  <label class="field__label" for="name">Strategy name</label>
  <input id="name" class="input" type="text" placeholder="QQQ Rotation" />
  <p class="field__hint">Identificador único, não pode repetir.</p>
</div>

<!-- Error state -->
<div class="field is-invalid">
  <label class="field__label" for="k">k threshold</label>
  <input id="k" class="input" type="number" value="-1" />
  <p class="field__hint field__hint--error">
    <svg class="ico" width="14" height="14"><use href="#alert-circle"/></svg>
    Deve ser entre 1 e 4.
  </p>
</div>

<!-- Select -->
<div class="field">
  <label class="field__label" for="bench">Benchmark</label>
  <div class="select">
    <select id="bench" class="input">
      <option>SPY</option>
      <option>QQQ</option>
    </select>
    <svg class="select__caret ico" width="14" height="14"><use href="#chevron-down"/></svg>
  </div>
</div>
```

### SCSS

```scss
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-15);

  &__label {
    font: var(--text-xs);
    font-weight: 500;
    color: var(--text-secondary);
  }

  &__hint {
    margin: 0;
    font: var(--text-xs);
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 4px;

    &--error { color: var(--danger-text); }
  }

  &.is-invalid .input { border-color: var(--danger); box-shadow: 0 0 0 3px var(--danger-bg); }
}

.input {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font: var(--text-sm);
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  font-family: inherit;

  &::placeholder { color: var(--text-muted); }
  &:hover:not(:disabled) { border-color: var(--border-strong); }
  &:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--focus-ring); }
  &:disabled { background: var(--surface-muted); color: var(--text-disabled); cursor: not-allowed; }
}

textarea.input { height: auto; padding: 8px 12px; min-height: 80px; resize: vertical; }

// Numeric input — mono + tabular
.input--mono, input[type="number"].input {
  font-family: var(--font-mono);
  font-feature-settings: 'tnum';
}

.select {
  position: relative;
  select.input {
    appearance: none;
    padding-right: 36px;
    cursor: pointer;
  }
  &__caret {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    pointer-events: none;
  }
}
```

---

## Checkbox / Radio

```html
<label class="check">
  <input type="checkbox" class="check__input" checked />
  <span class="check__box"><svg class="ico" width="12" height="12"><use href="#check"/></svg></span>
  <span class="check__label">Enabled</span>
</label>

<label class="check check--radio">
  <input type="radio" name="mode" class="check__input" />
  <span class="check__box"></span>
  <span class="check__label">Long only</span>
</label>
```

```scss
.check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font: var(--text-sm);
  color: var(--text-primary);

  &__input { position: absolute; opacity: 0; pointer-events: none; }
  &__box {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px; height: 16px;
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    color: transparent;
    transition: var(--transition-fast);
  }

  &--radio &__box { border-radius: 50%; }
  &--radio &__box::after {
    content: '';
    width: 6px; height: 6px;
    border-radius: 50%;
    background: currentColor;
    transform: scale(0);
    transition: var(--transition-fast);
  }

  &__input:checked + &__box {
    background: var(--primary);
    border-color: var(--primary);
    color: var(--primary-fg);
  }
  &--radio &__input:checked + &__box::after { transform: scale(1); }
  &__input:focus-visible + &__box { box-shadow: 0 0 0 3px var(--focus-ring); }
}
```

---

## Table

Header sticky, rows hairline-separated, col com `.num` recebe mono+tnum+right-align.

### HTML

```html
<div class="table-wrap">
  <table class="table">
    <thead class="t-head">
      <tr>
        <th>Date</th>
        <th>Strategy</th>
        <th>From</th>
        <th>To</th>
        <th class="num">Score</th>
        <th class="t-actions"></th>
      </tr>
    </thead>
    <tbody class="t-body">
      <tr>
        <td class="mono">2024-11-23</td>
        <td>QQQ Rotation</td>
        <td><span class="badge badge--danger">OFF</span></td>
        <td><span class="badge badge--success">ON</span></td>
        <td class="num mono">3 / 4</td>
        <td class="t-actions">
          <button class="btn btn--ghost btn--sm btn--icon"><svg class="ico" width="14" height="14"><use href="#pencil"/></svg></button>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### SCSS

```scss
.table-wrap {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.table {
  width: 100%;
  border-collapse: collapse;
  font: var(--text-sm);

  th, td {
    padding: 10px var(--space-4);
    text-align: left;
    vertical-align: middle;
  }

  .num { text-align: right; font-family: var(--font-mono); font-feature-settings: 'tnum'; }
  .t-actions { text-align: right; width: 80px; }

  thead.t-head th {
    position: sticky;
    top: 0;
    background: var(--surface-muted);
    border-bottom: 1px solid var(--border);
    font: var(--text-micro);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    height: 36px;
    user-select: none;
  }

  tbody.t-body tr {
    border-top: 1px solid var(--border-subtle);
    transition: background var(--transition-fast);
    &:hover { background: var(--surface-muted); }
    &:first-child { border-top: 0; }
  }

  // Zebra (opcional)
  &--zebra tbody tr:nth-child(even) { background: var(--surface-muted); }
}
```

---

## Sidebar

Fixed left, 232px expanded / 56px collapsed. Active = barra esquerda 2px + bg muted.

### HTML

```html
<aside class="sidebar" [class.is-collapsed]="collapsed">
  <a class="sidebar__brand" routerLink="/">
    <span class="sidebar__logo">⏱</span>
    <span class="sidebar__name">AI-Swing</span>
  </a>

  <nav class="sidebar__nav">
    <a class="sidebar__item is-active" routerLink="/dashboard">
      <svg class="ico" width="18" height="18"><use href="#dashboard"/></svg>
      <span>Dashboard</span>
    </a>
    <a class="sidebar__item" routerLink="/strategies">
      <svg class="ico" width="18" height="18"><use href="#strategies"/></svg>
      <span>Strategies</span>
    </a>
    <a class="sidebar__item" routerLink="/indicators">
      <svg class="ico" width="18" height="18"><use href="#indicators"/></svg>
      <span>Indicators</span>
    </a>
    <a class="sidebar__item" routerLink="/history">
      <svg class="ico" width="18" height="18"><use href="#history"/></svg>
      <span>History</span>
    </a>
  </nav>

  <div class="sidebar__foot">
    <app-theme-switch></app-theme-switch>
    <button class="sidebar__collapse" (click)="toggleCollapsed()" aria-label="Collapse sidebar">
      <svg class="ico" width="14" height="14"><use href="#chevron-right"/></svg>
    </button>
  </div>
</aside>
```

### SCSS

```scss
.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  width: var(--sidebar-width);
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-base);
  z-index: 20;

  &.is-collapsed { width: var(--sidebar-width-collapsed); }
  &.is-collapsed .sidebar__name,
  &.is-collapsed .sidebar__item span,
  &.is-collapsed .theme-switch span,
  &.is-collapsed .sidebar__foot .theme-switch button span { display: none; }

  &__brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 18px;
    text-decoration: none;
    color: var(--text-primary);
    font-weight: 600;
    font-size: 15px;
    letter-spacing: -0.01em;
  }
  &__logo {
    width: 24px; height: 24px;
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--primary); color: var(--primary-fg);
    border-radius: var(--radius-sm);
    font-size: 14px;
  }

  &__nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px;
    flex: 1;
    overflow-y: auto;
  }

  &__item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    height: 32px;
    padding: 0 10px;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font: var(--text-sm);
    font-weight: 500;
    text-decoration: none;
    transition: var(--transition-fast);

    &:hover { background: var(--surface-muted); color: var(--text-primary); }
    &.is-active {
      background: var(--surface-muted);
      color: var(--text-primary);
      &::before {
        content: '';
        position: absolute;
        left: -8px; top: 8px; bottom: 8px;
        width: 2px;
        background: var(--primary);
        border-radius: 0 2px 2px 0;
      }
    }

    .ico { color: var(--text-muted); flex-shrink: 0; }
    &.is-active .ico { color: var(--text-primary); }
  }

  &__foot {
    border-top: 1px solid var(--border);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__collapse {
    align-self: flex-end;
    width: 24px; height: 24px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    transition: var(--transition-fast);
    &:hover { background: var(--surface-muted); color: var(--text-primary); }
  }
  &.is-collapsed &__collapse svg { transform: rotate(180deg); }
}
```

---

## Modal

HTML5 `<dialog>` recommended (Angular `@HostListener` for Esc). Max 560px, padding 24px, scrim 45% dark.

### HTML

```html
<dialog class="modal" #dlg>
  <div class="modal__head">
    <h2 class="modal__title">New strategy</h2>
    <button class="btn btn--ghost btn--icon btn--sm" (click)="dlg.close()" aria-label="Close">
      <svg class="ico" width="16" height="16"><use href="#x"/></svg>
    </button>
  </div>
  <div class="modal__body">
    <!-- form fields -->
  </div>
  <div class="modal__foot">
    <button class="btn btn--ghost btn--md" (click)="dlg.close()">Cancel</button>
    <button class="btn btn--primary btn--md">Create</button>
  </div>
</dialog>
```

### SCSS

```scss
.modal {
  width: min(560px, calc(100vw - 32px));
  max-height: calc(100vh - 64px);
  padding: 0;
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal);
  color: var(--text-primary);
  overflow: hidden;

  &::backdrop { background: var(--scrim); backdrop-filter: blur(2px); }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px;
    border-bottom: 1px solid var(--border-subtle);
  }
  &__title { margin: 0; font: var(--text-h2); font-weight: 600; letter-spacing: -0.014em; }
  &__body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    max-height: 70vh;
    overflow-y: auto;
  }
  &__foot {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 14px 20px;
    border-top: 1px solid var(--border-subtle);
    background: var(--surface-muted);
  }

  // Wider form variant
  &--wide { width: min(720px, calc(100vw - 32px)); }
}
```

---

## Toast

```html
<div class="toast-stack" role="status" aria-live="polite">
  <div class="toast toast--success">
    <svg class="ico" width="16" height="16"><use href="#circle-check"/></svg>
    <div class="toast__body">
      <p class="toast__title">Strategy saved</p>
      <p class="toast__msg">"QQQ Rotation" foi atualizada.</p>
    </div>
    <button class="toast__close" aria-label="Dismiss"><svg class="ico" width="14" height="14"><use href="#x"/></svg></button>
  </div>
</div>
```

```scss
.toast-stack {
  position: fixed;
  right: 20px;
  bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 60;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 360px;
  padding: 12px 14px;
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);

  &__body { flex: 1; min-width: 0; }
  &__title { margin: 0 0 2px; font: var(--text-sm); font-weight: 600; }
  &__msg { margin: 0; font: var(--text-xs); color: var(--text-muted); }
  &__close {
    background: transparent; border: 0; padding: 2px;
    color: var(--text-muted); cursor: pointer; border-radius: var(--radius-sm);
    &:hover { color: var(--text-primary); background: var(--surface-muted); }
  }

  &--success > .ico { color: var(--success); }
  &--danger  > .ico { color: var(--danger); }
  &--info    > .ico { color: var(--info); }
  &--warn    > .ico { color: var(--warn); }
}
```

Auto-dismiss 5s. Max 3 visíveis (FIFO). Hover do toast pausa o timer.

---

## Tabs

```html
<div class="tabs" role="tablist">
  <button class="tabs__tab is-active" role="tab" aria-selected="true">Overview</button>
  <button class="tabs__tab" role="tab">Backtest</button>
  <button class="tabs__tab" role="tab">Signals</button>
  <button class="tabs__tab" role="tab">Settings</button>
</div>
```

```scss
.tabs {
  display: flex;
  gap: var(--space-5);
  border-bottom: 1px solid var(--border);
  padding: 0 4px;

  &__tab {
    background: transparent;
    border: 0;
    padding: 10px 0;
    font: var(--text-sm);
    font-weight: 500;
    color: var(--text-muted);
    cursor: pointer;
    position: relative;
    transition: color var(--transition-fast);

    &:hover { color: var(--text-primary); }
    &.is-active {
      color: var(--text-primary);
      &::after {
        content: '';
        position: absolute;
        left: 0; right: 0; bottom: -1px;
        height: 2px;
        background: var(--primary);
        border-radius: 2px 2px 0 0;
      }
    }
  }
}
```

---

## Empty state

```html
<div class="empty">
  <svg class="empty__ico" width="48" height="48"><use href="#strategies"/></svg>
  <h3 class="empty__title">Nenhuma estratégia ainda</h3>
  <p class="empty__msg">Crie sua primeira estratégia para começar a monitorar sinais.</p>
  <button class="btn btn--primary btn--md">
    <svg class="ico" width="16" height="16"><use href="#plus"/></svg>
    Nova estratégia
  </button>
</div>
```

```scss
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 64px 24px;
  gap: 12px;
  color: var(--text-secondary);

  &__ico { color: var(--text-muted); margin-bottom: 4px; }
  &__title { margin: 0; font: var(--text-h3); font-weight: 600; color: var(--text-primary); }
  &__msg { margin: 0 0 8px; font: var(--text-sm); color: var(--text-muted); max-width: 380px; }
}
```

---

## Skeleton

```html
<div class="skeleton" style="width: 140px; height: 14px;"></div>
<div class="skeleton skeleton--block" style="height: 80px;"></div>
```

```scss
.skeleton {
  display: block;
  background: linear-gradient(
    90deg,
    var(--surface-muted) 0%,
    var(--border-subtle) 50%,
    var(--surface-muted) 100%
  );
  background-size: 200% 100%;
  border-radius: var(--radius-sm);
  animation: skeleton-shimmer 1.4s ease-in-out infinite;

  &--block { border-radius: var(--radius-md); }
}

@keyframes skeleton-shimmer {
  0%   { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}
```

---

## KPI tile (hero)

Para Strategy Detail header — 4 tiles lado a lado mostrando CAGR, Max DD, Sharpe, vs B&H.

```html
<div class="kpi-grid">
  <div class="kpi-tile">
    <div class="kpi-tile__label">CAGR</div>
    <div class="kpi-tile__value mono">44.79<span class="kpi-tile__unit">%</span></div>
    <div class="kpi-tile__diff mono kpi-tile__diff--pos">+23.23pp vs B&amp;H</div>
  </div>
  <!-- repete -->
</div>
```

```scss
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-3);
}

.kpi-tile {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: var(--shadow-sm);

  &__label {
    font: var(--text-micro);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    font-weight: 600;
  }
  &__value {
    font-family: var(--font-mono);
    font-feature-settings: 'tnum';
    font-size: 26px;
    line-height: 1.15;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: -0.02em;
  }
  &__unit { font-size: 16px; color: var(--text-muted); margin-left: 2px; }
  &__diff {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-muted);
    &--pos { color: var(--success); }
    &--neg { color: var(--danger); }
  }
}
```
