# Layout: Dashboard

> Tela inicial. Grid de Strategy Cards (auto-fill, min 290px), banner de transições recentes,
> filtros pill (Todas / Risk-on / Risk-off), CTA `Nova estratégia`.

---

## Estrutura

```
[banner: 2 transições nos últimos 7 dias · MU → MUU saiu… · SPY → UPRO entrou…]  [×]

Dashboard                                          [Todas|Risk-on|Risk-off] [+ Nova estratégia]
4/5 estratégias em risk-on · asof 2026-05-06
─────────────────────────────────────────────────────────────────────────────────────────
┌─ QQQ → TQQQ      [RISK ON]┐ ┌─ SPY → UPRO     [RISK ON]┐ ┌─ SMH → SOXL     [RISK ON]┐
│ Score 4/4 · k≥2   ▣▣▣▣    │ │ Score 4/4 · k≥2  ▣▣▣▣   │ │ Score 4/4 · k≥2  ▣▣▣▣   │
│ ╭─ sparkline (área verde)│ │ ╭─ sparkline             │ │ ╭─ sparkline             │
│ ✓ SMA200  price>SMA200…  │ │ ✓ SMA200  …             │ │ ✓ SMA200  …             │
│ ✓ SMA50   …              │ │ ✓ SMA50   …             │ │ ✓ SMA50   …             │
│ ✓ Vol21d<40%             │ │ ✓ Vol21d<40%            │ │ ✓ Vol21d<40%            │
│ ✓ AR(1)_30d>0            │ │ ✓ AR(1)_30d>0           │ │ ✓ AR(1)_30d>0           │
└─────────────────────────┘ └────────────────────────┘ └────────────────────────┘
┌─ MU → MUU       [NO FIO ]┐ ┌─ FTEC → TECL    [RISK ON]┐
│ Score 3/4 · k≥2   ▣▣▣□    │ │ Score 4/4 · k≥2  ▣▣▣▣   │
│ ╭─ sparkline (laranja)   │ │ ╭─ sparkline (verde)     │
│ ✓ SMA200                  │ │ ✓ SMA200                │
│ ✓ SMA50                   │ │ ✓ SMA50                 │
│ ✗ Vol21d  65.1% > 40%    │ │ ✓ Vol21d                │
│ ✓ AR(1)_30d              │ │ ✓ AR(1)_30d             │
└─────────────────────────┘ └────────────────────────┘
```

---

## SCSS

```scss
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: var(--space-4);                                 // 12px
}

.page-head {
  display: flex; align-items: flex-end; justify-content: space-between;
  margin-bottom: var(--space-6);                       // 20px
  padding-bottom: var(--space-5);                      // 16px
  border-bottom: 1px solid var(--border);
}
.page-head__h1  { font-size: var(--fs-xl); font-weight: var(--fw-semibold); letter-spacing: var(--tracking-tight); }
.page-head__sub { color: var(--text-muted); font-size: 12.5px; margin-top: 3px; }
.page-head__actions { display: flex; gap: 8px; align-items: center; }
```

(`.card`, `.score-bar`, `.ind-row` em `04-components.md`.)

---

## Comportamento

- **Click no card inteiro** → navega para `/strategies/:id`. Cursor pointer no card todo.
- **Filtros (`Todas/Risk-on/Risk-off`)** filtram client-side a lista. Estado em route query (`?filter=on`).
- **Banner** é dismissable (state local; não persiste). Aparece se houver transição nos últimos 7 dias.
- **`Nova estratégia`** abre modal full screen (não modal dialog) — ver `14-forms.md`.
- **Auto-refresh** a cada 60s (silently). Botão `Refresh` na sidebar força.
- **Empty state**: se 0 estratégias → ver `15-modals-states.md`.

---

## Loading / skeleton

5–6 skeleton cards, 180px height. Sparkline area como `.skeleton`. Manter score-bar visível (placeholder cinza).

```html
@if (loading()) {
  <div class="grid">
    @for (_ of [1,2,3,4,5]; track _) {
      <div class="card">
        <div class="card__head">
          <div class="skeleton skeleton--text" style="width: 110px"></div>
          <div class="skeleton" style="width: 56px; height: 16px"></div>
        </div>
        <div class="card__spark"><div class="skeleton" style="height: 42px"></div></div>
        <div class="card__rows">
          @for (_ of [1,2,3,4]; track _) {
            <div class="skeleton skeleton--text" style="width: 80%"></div>
          }
        </div>
      </div>
    }
  </div>
}
```
