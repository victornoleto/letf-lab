# Layout: Strategy Detail

> Detalhe de uma estratégia. Breadcrumb mínimo, meta-bar com KPIs grandes,
> seção `Backtest` (timeframe pills + 3 colunas de métricas + 2 charts) e
> tabela de Signal History.

---

## Estrutura

```
← Dashboard  /  Estratégias

QQQ → TQQQ vote-of-2                                              [Editar]
─────────────────────────────────────────────────────────────────────────
Benchmark    Risk-on    Risk-off                  Status      Score
QQQ          TQQQ       SHV                       RISK ON     4/4 (k≥2)

┌─ Backtest                                              [3y|5y|10y|20y]  [↻ Rerun] ─┐
│ 2016-05-09 → 2026-05-06 (10y) · asof 2026-05-06 · cache hit                       │
│ ─────────────────────────────────────────────────────────────────────────────────│
│ ┌── Estratégia ──────┐ ┌── Buy & Hold Bench ─┐ ┌── Buy & Hold LETF ──┐           │
│ │ CAGR    18.2%  +3.4│ │ CAGR    14.8%       │ │ CAGR    22.1%       │           │
│ │ MaxDD  -22.1%  +18 │ │ MaxDD  -39.8%       │ │ MaxDD  -82.3%       │           │
│ │ Sharpe  0.94   +.21│ │ Sharpe  0.73        │ │ Sharpe  0.61        │           │
│ │ Trades  84         │ │                     │ │                     │           │
│ │ Hit vs B&H  62%    │ │                     │ │                     │           │
│ └────────────────────┘ └─────────────────────┘ └─────────────────────┘           │
│ ─────────────────────────────────────────────────────────────────────────────────│
│ ┌── Equity curve ───────────────────┐ ┌── Razão TQQQ/QQQ ─────────────┐          │
│ │ ╱╲╱╲╱╲╱╲╱  (verde + bench dotted)│ │ ╱╲╱╲╱╲ (indigo, ref 1.0)      │          │
│ └───────────────────────────────────┘ └───────────────────────────────┘          │
└──────────────────────────────────────────────────────────────────────────────────┘

┌─ Signal History (últimas 30 transições)                            [⬇ CSV] ─┐
│ DATA          INDICATOR    DETALHE                  RESULTADO   STATUS      │
│ 2026-05-06    AR(1)_30d    +0.115 > 0               ✓ pass      RISK ON     │
│ 2026-05-06    Vol21d       15.8% < 40%              ✓ pass      RISK ON     │
│ 2026-05-05    AR(1)_30d    +0.092 > 0               ✓ pass      RISK ON     │
│ …                                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## SCSS

```scss
.breadcrumb {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; color: var(--text-muted);
  margin-bottom: 4px;
}
.breadcrumb__back { cursor: pointer; }
.breadcrumb__back:hover { color: var(--text-primary); }

.meta-bar {
  display: flex; gap: var(--space-5);
  padding: var(--space-5) 0;
  align-items: baseline;
}
.meta-bar > div { display: flex; flex-direction: column; gap: 2px; }
.meta-bar .label { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
.meta-bar .val   { font-family: var(--font-mono); font-size: 18px; font-weight: var(--fw-medium); }
.meta-bar .val--success { color: var(--success); }
.meta-bar .val--danger  { color: var(--danger); }
.meta-bar .val--warn    { color: var(--warn); }

.section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  margin-top: var(--space-4);                 // 12px
}
.section__head {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
}
.section__title { font-size: var(--fs-md); font-weight: var(--fw-medium); letter-spacing: var(--tracking-tight); }
.section__sub   { font-size: 11.5px; color: var(--text-muted); margin-top: 2px; font-family: var(--font-mono); }

// 3 colunas de métricas, divisor vertical
.metrics-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 0;
}
.metric-card {
  padding: 14px 16px;
  border-right: 1px solid var(--border);
  &:last-child { border-right: none; }
  &--highlight { border-left: 2px solid var(--success); }   // estratégia ativa
}
.metric-card__title {
  font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--text-muted);
}
.metric-card__rows  { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; }
.metric-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.metric-row__k    { font-size: 12px; color: var(--text-secondary); }
.metric-row__v    { font-family: var(--font-mono); font-weight: var(--fw-medium); font-size: 13.5px; }
.metric-row__diff { font-family: var(--font-mono); font-size: 10.5px; }
.metric-row__diff--pos { color: var(--success); }
.metric-row__diff--neg { color: var(--danger); }

// 2 charts lado a lado, divisor vertical
.charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
.chart-cell  { padding: 12px 16px; border-right: 1px solid var(--border); &:last-child { border-right: none; } }
.chart-cap   { font-size: 11px; color: var(--text-muted); margin-bottom: 6px; font-family: var(--font-mono); }
```

---

## Comportamento

- **Timeframe pills (3y/5y/10y/20y)** disparam refetch (ou cache hit) e re-renderizam métricas + charts.
- **Rerun** força bypass de cache (POST `/api/backtest/:id?force=true`).
- **Diff (+3.4 / -18 / +.21)** = estratégia − benchmark. Verde se favorável, vermelho se pior. **Ordem dos sinais respeita a métrica**: `MaxDD -22% (+18pp)` significa "18 pp menos drawdown que B&H" → positivo, verde.
- **Signal History** tem CSV export e busca/filtro (data, indicador, resultado).
- **Editar** abre form em modo edit — ver `14-forms.md`.

---

## Variantes

- **Loading**: skeleton blocks no meta-bar e nas 3 colunas. Charts com `<div class="skeleton" style="height: 240px">`.
- **Erro de backtest**: substitui `metrics-grid` + `charts-grid` por `<app-empty>` com `Tentar novamente`.
- **Cache miss → rerun em curso**: badge `Rodando…` com spinner ao lado do `Backtest` title.
